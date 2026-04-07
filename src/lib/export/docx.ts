import type { JSONContent } from "@tiptap/core";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  type ParagraphChild,
} from "docx";

import { EXPORT_FONT_MAP } from "@/lib/editor/types";
import { getEmbeddedImage, parseFontSize } from "@/lib/export/image-data";
import {
  inlineNodesToPlainText,
  normalizeDocument,
  type BlockNode,
  type ImageBlock,
  type InlineNode,
} from "@/lib/export/model";
import { calculatePaginationBreaksByEstimate } from "@/lib/pagination";

function mapAlignment(value?: string) {
  if (value === "center") {
    return AlignmentType.CENTER;
  }

  if (value === "right") {
    return AlignmentType.RIGHT;
  }

  if (value === "justify") {
    return AlignmentType.JUSTIFIED;
  }

  return AlignmentType.LEFT;
}

function mapHeadingLevel(level: number) {
  if (level === 1) {
    return HeadingLevel.HEADING_1;
  }

  if (level === 2) {
    return HeadingLevel.HEADING_2;
  }

  return HeadingLevel.HEADING_3;
}

function fontSizeToHalfPoints(value?: string, fallback = 12) {
  return Math.round(parseFontSize(value, fallback) * 2);
}

function colorValue(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.replace("#", "").toUpperCase();
}

function inlineNodesToRuns(children: InlineNode[]): ParagraphChild[] {
  return children.map((child) => {
    if (child.type === "hardBreak") {
      return new TextRun({ break: 1 });
    }

    const font = child.marks.code
      ? EXPORT_FONT_MAP["var(--font-editor-mono)"]
      : child.marks.fontFamily
        ? EXPORT_FONT_MAP[child.marks.fontFamily] ?? EXPORT_FONT_MAP["var(--font-editor-sans)"]
        : undefined;

    const run = new TextRun({
      text: child.text,
      bold: child.marks.bold,
      italics: child.marks.italic,
      strike: child.marks.strike,
      underline: child.marks.underline ? { type: UnderlineType.SINGLE } : undefined,
      color: colorValue(child.marks.color),
      size: fontSizeToHalfPoints(child.marks.fontSize),
      font,
      subScript: child.marks.subscript,
      superScript: child.marks.superscript,
    });

    if (child.marks.link) {
      return new ExternalHyperlink({
        link: child.marks.link,
        children: [run],
      });
    }

    return run;
  });
}

function blocksToText(blocks: BlockNode[]): string {
  return blocks
    .map((block) => {
      if (block.type === "paragraph" || block.type === "heading") {
        return inlineNodesToPlainText(block.children);
      }

      if (block.type === "codeBlock") {
        return block.text;
      }

      if (block.type === "blockquote") {
        return blocksToText(block.blocks);
      }

      if (block.type === "bulletList" || block.type === "orderedList") {
        return block.items.map((item) => blocksToText(item.blocks)).join(" ");
      }

      if (block.type === "taskList") {
        return block.items.map((item) => blocksToText(item.blocks)).join(" ");
      }

      if (block.type === "table") {
        return block.rows.map((row) => row.cells.map((cell) => blocksToText(cell.blocks)).join(" ")).join(" ");
      }

      if (block.type === "image") {
        return block.alt ?? "";
      }

      return "";
    })
    .join(" ")
    .trim();
}

function paragraphFromInline(children: InlineNode[], options?: ConstructorParameters<typeof Paragraph>[0]) {
  const paragraphOptions = (options ?? {}) as Record<string, unknown>;

  return new Paragraph({
    ...paragraphOptions,
    children: inlineNodesToRuns(children),
  });
}

async function imageParagraph(block: ImageBlock) {
  const embedded = await getEmbeddedImage(block.src);

  if (!embedded) {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: block.alt || "Linked image",
            italics: true,
            color: "7C6144",
          }),
        ],
        spacing: { after: 180 },
      }),
    ];
  }

  const maxWidth = 500;
  const ratio = embedded.height / embedded.width;
  const width = Math.min(embedded.width, maxWidth);
  const height = Math.max(1, Math.round(width * ratio));

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 180 },
      children: [
        new ImageRun({
          data: embedded.data,
          type: embedded.type,
          transformation: {
            width,
            height,
          },
        }),
      ],
    }),
  ];
}

async function blockToDocxChildren(block: BlockNode, depth = 0): Promise<Array<Paragraph | Table>> {
  if (block.type === "paragraph") {
    return [
      paragraphFromInline(block.children, {
        alignment: mapAlignment(block.align),
        spacing: { after: 180, line: 320 },
        indent: depth ? { left: depth * 320 } : undefined,
      }),
    ];
  }

  if (block.type === "heading") {
    return [
      paragraphFromInline(block.children, {
        heading: mapHeadingLevel(block.level),
        alignment: mapAlignment(block.align),
        spacing: { before: 240, after: 120 },
      }),
    ];
  }

  if (block.type === "blockquote") {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: blocksToText(block.blocks),
            italics: true,
            color: "6B5A48",
          }),
        ],
        spacing: { before: 120, after: 180 },
        indent: { left: 420 },
        border: {
          left: {
            color: "BD682E",
            size: 10,
            style: BorderStyle.SINGLE,
          },
        },
      }),
    ];
  }

  if (block.type === "codeBlock") {
    return [
      new Paragraph({
        spacing: { before: 120, after: 180 },
        shading: {
          type: ShadingType.CLEAR,
          color: "auto",
          fill: "F4EEE6",
        },
        border: {
          left: {
            color: "C7B8A3",
            size: 6,
            style: BorderStyle.SINGLE,
          },
        },
        children: [
          new TextRun({
            text: block.text,
            font: EXPORT_FONT_MAP["var(--font-editor-mono)"],
            size: 22,
          }),
        ],
      }),
    ];
  }

  if (block.type === "horizontalRule") {
    return [
      new Paragraph({
        spacing: { before: 120, after: 120 },
        border: {
          bottom: {
            color: "D7C7B3",
            size: 6,
            style: BorderStyle.SINGLE,
          },
        },
      }),
    ];
  }

  if (block.type === "image") {
    return imageParagraph(block);
  }

  if (block.type === "bulletList") {
    const children: Array<Paragraph | Table> = [];

    for (const item of block.items) {
      const [firstBlock, ...rest] = item.blocks;
      const bulletText =
        firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading")
          ? inlineNodesToPlainText(firstBlock.children)
          : blocksToText(item.blocks);

      children.push(
        new Paragraph({
          children: [new TextRun({ text: `• ${bulletText}` })],
          indent: { left: 360 + depth * 320 },
          spacing: { after: 120 },
        }),
      );

      for (const nestedBlock of firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading") ? rest : []) {
        children.push(...(await blockToDocxChildren(nestedBlock, depth + 1)));
      }
    }

    return children;
  }

  if (block.type === "orderedList") {
    const children: Array<Paragraph | Table> = [];

    for (const [index, item] of block.items.entries()) {
      const [firstBlock, ...rest] = item.blocks;
      const orderedText =
        firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading")
          ? inlineNodesToPlainText(firstBlock.children)
          : blocksToText(item.blocks);

      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${block.start + index}. ${orderedText}` })],
          indent: { left: 360 + depth * 320 },
          spacing: { after: 120 },
        }),
      );

      for (const nestedBlock of firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading") ? rest : []) {
        children.push(...(await blockToDocxChildren(nestedBlock, depth + 1)));
      }
    }

    return children;
  }

  if (block.type === "taskList") {
    const children: Array<Paragraph | Table> = [];

    for (const item of block.items) {
      const [firstBlock, ...rest] = item.blocks;
      const taskText =
        firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading")
          ? inlineNodesToPlainText(firstBlock.children)
          : blocksToText(item.blocks);

      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${item.checked ? "[x]" : "[ ]"} ${taskText}` })],
          indent: { left: 360 + depth * 320 },
          spacing: { after: 120 },
        }),
      );

      for (const nestedBlock of firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading") ? rest : []) {
        children.push(...(await blockToDocxChildren(nestedBlock, depth + 1)));
      }
    }

    return children;
  }

  if (block.type === "table") {
    const rows = await Promise.all(
      block.rows.map(async (row) => {
        const cells = await Promise.all(
          row.cells.map(async (cell) => {
            const cellChildren = await Promise.all(
              cell.blocks.map(async (nestedBlock) => {
                const nestedChildren = await blockToDocxChildren(nestedBlock);
                return nestedChildren.filter((child): child is Paragraph => child instanceof Paragraph);
              }),
            );

            return new TableCell({
              children: cellChildren.flat(),
              shading: cell.header
                ? {
                    type: ShadingType.CLEAR,
                    color: "auto",
                    fill: "F4E3CF",
                  }
                : undefined,
              margins: {
                top: 120,
                right: 120,
                bottom: 120,
                left: 120,
              },
            });
          }),
        );

        return new TableRow({ children: cells });
      }),
    );

    return [
      new Table({
        rows,
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        layout: TableLayoutType.FIXED,
      }),
    ];
  }

  return [];
}

export async function createDocxBuffer(title: string, content: JSONContent) {
  const normalized = normalizeDocument(content);
  const breaks = new Set(calculatePaginationBreaksByEstimate(normalized));
  const children: Array<Paragraph | Table> = [];

  for (const [index, block] of normalized.entries()) {
    if (breaks.has(index)) {
      children.push(
        new Paragraph({
          children: [new PageBreak()],
        }),
      );
    }

    children.push(...(await blockToDocxChildren(block)));
  }

  const document = new Document({
    creator: "Folio Writer",
    title,
    description: "Exported document",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1200,
              right: 1080,
              bottom: 1200,
              left: 1080,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
