import type { JSONContent } from "@tiptap/core";

import type { DocumentStats, OutlineItem } from "@/lib/editor/types";

interface InlineMarks {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  underline?: boolean;
  code?: boolean;
  link?: string;
  color?: string;
  highlight?: string;
  fontFamily?: string;
  fontSize?: string;
  subscript?: boolean;
  superscript?: boolean;
}

export type InlineNode =
  | {
      type: "text";
      text: string;
      marks: InlineMarks;
    }
  | {
      type: "hardBreak";
    };

interface BaseBlock {
  id: string;
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  align?: string;
  children: InlineNode[];
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  level: number;
  align?: string;
  children: InlineNode[];
}

export interface ListItemBlock {
  id: string;
  blocks: BlockNode[];
}

export interface TaskListItemBlock {
  id: string;
  checked: boolean;
  blocks: BlockNode[];
}

export interface BulletListBlock extends BaseBlock {
  type: "bulletList";
  items: ListItemBlock[];
}

export interface OrderedListBlock extends BaseBlock {
  type: "orderedList";
  start: number;
  items: ListItemBlock[];
}

export interface TaskListBlock extends BaseBlock {
  type: "taskList";
  items: TaskListItemBlock[];
}

export interface BlockquoteBlock extends BaseBlock {
  type: "blockquote";
  blocks: BlockNode[];
}

export interface CodeBlock extends BaseBlock {
  type: "codeBlock";
  language?: string;
  text: string;
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  src: string;
  alt?: string;
  title?: string;
}

export interface HorizontalRuleBlock extends BaseBlock {
  type: "horizontalRule";
}

export interface TableCellBlock {
  id: string;
  header: boolean;
  blocks: BlockNode[];
}

export interface TableRowBlock {
  id: string;
  cells: TableCellBlock[];
}

export interface TableBlock extends BaseBlock {
  type: "table";
  rows: TableRowBlock[];
}

export type BlockNode =
  | ParagraphBlock
  | HeadingBlock
  | BulletListBlock
  | OrderedListBlock
  | TaskListBlock
  | BlockquoteBlock
  | CodeBlock
  | ImageBlock
  | HorizontalRuleBlock
  | TableBlock;

let blockCounter = 0;

function nextId(prefix: string) {
  blockCounter += 1;
  return `${prefix}-${blockCounter}`;
}

function parseMarks(node: JSONContent) {
  const marks: InlineMarks = {};

  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") {
      marks.bold = true;
    }

    if (mark.type === "italic") {
      marks.italic = true;
    }

    if (mark.type === "strike") {
      marks.strike = true;
    }

    if (mark.type === "underline") {
      marks.underline = true;
    }

    if (mark.type === "code") {
      marks.code = true;
    }

    if (mark.type === "link" && typeof mark.attrs?.href === "string") {
      marks.link = mark.attrs.href;
    }

    if (mark.type === "highlight" && typeof mark.attrs?.color === "string") {
      marks.highlight = mark.attrs.color;
    }

    if (mark.type === "subscript") {
      marks.subscript = true;
    }

    if (mark.type === "superscript") {
      marks.superscript = true;
    }

    if (mark.type === "textStyle") {
      if (typeof mark.attrs?.color === "string") {
        marks.color = mark.attrs.color;
      }

      if (typeof mark.attrs?.fontFamily === "string") {
        marks.fontFamily = mark.attrs.fontFamily;
      }

      if (typeof mark.attrs?.fontSize === "string") {
        marks.fontSize = mark.attrs.fontSize;
      }
    }
  }

  return marks;
}

function normalizeInlineNodes(content?: JSONContent[]): InlineNode[] {
  if (!content?.length) {
    return [];
  }

  return content.reduce<InlineNode[]>((children, node) => {
    if (node.type === "text" && typeof node.text === "string") {
      children.push({ type: "text", text: node.text, marks: parseMarks(node) });
    }

    if (node.type === "hardBreak") {
      children.push({ type: "hardBreak" });
    }

    return children;
  }, []);
}

function normalizeCodeText(content?: JSONContent[]) {
  return (content ?? [])
    .map((node) => node.text ?? "")
    .join("")
    .trimEnd();
}

function ensureBlocks(content?: JSONContent[]) {
  const blocks = normalizeBlocks(content);

  return blocks.length
    ? blocks
    : [
        {
          id: nextId("paragraph"),
          type: "paragraph",
          children: [],
        } satisfies ParagraphBlock,
      ];
}

function normalizeListItems(content?: JSONContent[]): ListItemBlock[] {
  return (content ?? [])
    .filter((node) => node.type === "listItem")
    .map((item) => ({
      id: nextId("list-item"),
      blocks: ensureBlocks(item.content),
    }));
}

function normalizeTaskItems(content?: JSONContent[]): TaskListItemBlock[] {
  return (content ?? [])
    .filter((node) => node.type === "taskItem")
    .map((item) => ({
      id: nextId("task-item"),
      checked: Boolean(item.attrs?.checked),
      blocks: ensureBlocks(item.content),
    }));
}

function normalizeTableRows(content?: JSONContent[]): TableRowBlock[] {
  return (content ?? [])
    .filter((node) => node.type === "tableRow")
    .map((row) => ({
      id: nextId("row"),
      cells: (row.content ?? [])
        .filter((cell) => cell.type === "tableCell" || cell.type === "tableHeader")
        .map((cell) => ({
          id: nextId("cell"),
          header: cell.type === "tableHeader",
          blocks: ensureBlocks(cell.content),
        })),
    }));
}

export function normalizeBlocks(content?: JSONContent[]): BlockNode[] {
  return (content ?? []).reduce<BlockNode[]>((blocks, node) => {
    if (node.type === "paragraph") {
      blocks.push({
        id: nextId("paragraph"),
        type: "paragraph",
        align: typeof node.attrs?.textAlign === "string" ? node.attrs.textAlign : undefined,
        children: normalizeInlineNodes(node.content),
      } satisfies ParagraphBlock);

      return blocks;
    }

    if (node.type === "heading") {
      blocks.push({
        id: nextId("heading"),
        type: "heading",
        level: Number(node.attrs?.level ?? 1),
        align: typeof node.attrs?.textAlign === "string" ? node.attrs.textAlign : undefined,
        children: normalizeInlineNodes(node.content),
      } satisfies HeadingBlock);

      return blocks;
    }

    if (node.type === "bulletList") {
      blocks.push({
        id: nextId("bullet-list"),
        type: "bulletList",
        items: normalizeListItems(node.content),
      } satisfies BulletListBlock);

      return blocks;
    }

    if (node.type === "orderedList") {
      blocks.push({
        id: nextId("ordered-list"),
        type: "orderedList",
        start: Number(node.attrs?.start ?? 1),
        items: normalizeListItems(node.content),
      } satisfies OrderedListBlock);

      return blocks;
    }

    if (node.type === "taskList") {
      blocks.push({
        id: nextId("task-list"),
        type: "taskList",
        items: normalizeTaskItems(node.content),
      } satisfies TaskListBlock);

      return blocks;
    }

    if (node.type === "blockquote") {
      blocks.push({
        id: nextId("blockquote"),
        type: "blockquote",
        blocks: ensureBlocks(node.content),
      } satisfies BlockquoteBlock);

      return blocks;
    }

    if (node.type === "codeBlock") {
      blocks.push({
        id: nextId("code"),
        type: "codeBlock",
        language: typeof node.attrs?.language === "string" ? node.attrs.language : undefined,
        text: normalizeCodeText(node.content),
      } satisfies CodeBlock);

      return blocks;
    }

    if (node.type === "image" && typeof node.attrs?.src === "string") {
      blocks.push({
        id: nextId("image"),
        type: "image",
        src: node.attrs.src,
        alt: typeof node.attrs.alt === "string" ? node.attrs.alt : undefined,
        title: typeof node.attrs.title === "string" ? node.attrs.title : undefined,
      } satisfies ImageBlock);

      return blocks;
    }

    if (node.type === "horizontalRule") {
      blocks.push({
        id: nextId("rule"),
        type: "horizontalRule",
      } satisfies HorizontalRuleBlock);

      return blocks;
    }

    if (node.type === "table") {
      blocks.push({
        id: nextId("table"),
        type: "table",
        rows: normalizeTableRows(node.content),
      } satisfies TableBlock);

      return blocks;
    }

    return blocks;
  }, []);
}

export function normalizeDocument(content: JSONContent) {
  blockCounter = 0;
  return normalizeBlocks(content.content);
}

export function inlineNodesToPlainText(children: InlineNode[]) {
  return children
    .map((child) => (child.type === "hardBreak" ? "\n" : child.text))
    .join("");
}

function blocksToPlainText(blocks: BlockNode[]): string {
  return blocks
    .map((block) => {
      if (block.type === "paragraph" || block.type === "heading") {
        return inlineNodesToPlainText(block.children);
      }

      if (block.type === "blockquote") {
        return blocksToPlainText(block.blocks);
      }

      if (block.type === "codeBlock") {
        return block.text;
      }

      if (block.type === "bulletList" || block.type === "orderedList") {
        return block.items.map((item) => blocksToPlainText(item.blocks)).join(" ");
      }

      if (block.type === "taskList") {
        return block.items.map((item) => blocksToPlainText(item.blocks)).join(" ");
      }

      if (block.type === "table") {
        return block.rows
          .map((row) => row.cells.map((cell) => blocksToPlainText(cell.blocks)).join(" "))
          .join(" ");
      }

      if (block.type === "image") {
        return block.alt ?? "";
      }

      return "";
    })
    .join(" ");
}

export function extractOutline(content: JSONContent): OutlineItem[] {
  return normalizeDocument(content)
    .filter((block): block is HeadingBlock => block.type === "heading")
    .map((heading) => ({
      id: heading.id,
      level: heading.level,
      text: inlineNodesToPlainText(heading.children) || "Untitled heading",
    }));
}

function countNestedBlocks(blocks: BlockNode[]): Pick<DocumentStats, "paragraphs" | "headings" | "tables" | "images"> {
  return blocks.reduce(
    (totals, block) => {
      if (block.type === "paragraph") {
        totals.paragraphs += 1;
      }

      if (block.type === "heading") {
        totals.headings += 1;
      }

      if (block.type === "table") {
        totals.tables += 1;
      }

      if (block.type === "image") {
        totals.images += 1;
      }

      if (block.type === "blockquote") {
        const nestedTotals = countNestedBlocks(block.blocks);
        totals.paragraphs += nestedTotals.paragraphs;
        totals.headings += nestedTotals.headings;
        totals.tables += nestedTotals.tables;
        totals.images += nestedTotals.images;
      }

      if (block.type === "bulletList" || block.type === "orderedList") {
        for (const item of block.items) {
          const nestedTotals = countNestedBlocks(item.blocks);
          totals.paragraphs += nestedTotals.paragraphs;
          totals.headings += nestedTotals.headings;
          totals.tables += nestedTotals.tables;
          totals.images += nestedTotals.images;
        }
      }

      if (block.type === "taskList") {
        for (const item of block.items) {
          const nestedTotals = countNestedBlocks(item.blocks);
          totals.paragraphs += nestedTotals.paragraphs;
          totals.headings += nestedTotals.headings;
          totals.tables += nestedTotals.tables;
          totals.images += nestedTotals.images;
        }
      }

      if (block.type === "table") {
        for (const row of block.rows) {
          for (const cell of row.cells) {
            const nestedTotals = countNestedBlocks(cell.blocks);
            totals.paragraphs += nestedTotals.paragraphs;
            totals.headings += nestedTotals.headings;
            totals.tables += nestedTotals.tables;
            totals.images += nestedTotals.images;
          }
        }
      }

      return totals;
    },
    {
      paragraphs: 0,
      headings: 0,
      tables: 0,
      images: 0,
    },
  );
}

export function buildDocumentStats(content: JSONContent): DocumentStats {
  const blocks = normalizeDocument(content);
  const plainText = blocksToPlainText(blocks);
  const words = plainText.trim().split(/\s+/).filter(Boolean).length;
  const nestedTotals = countNestedBlocks(blocks);

  return {
    words,
    characters: plainText.replace(/\s/g, "").length,
    paragraphs: nestedTotals.paragraphs,
    headings: nestedTotals.headings,
    tables: nestedTotals.tables,
    images: nestedTotals.images,
    estimatedMinutes: Math.max(1, Math.ceil(words / 220)),
  };
}
