import type { JSONContent } from "@tiptap/core";

import {
  inlineNodesToPlainText,
  normalizeDocument,
  type BlockNode,
  type InlineNode,
  type ParagraphBlock,
  type TableBlock,
} from "@/lib/export/model";

function escapeMarkdownText(value: string) {
  return value.replace(/([\\`*_{}\[\]()#+\-.!|>])/g, "\\$1");
}

function escapeHtmlText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function wrapStyledText(child: Extract<InlineNode, { type: "text" }>) {
  const { marks } = child;
  const htmlRequired =
    Boolean(marks.underline) ||
    Boolean(marks.highlight) ||
    Boolean(marks.color) ||
    Boolean(marks.fontFamily) ||
    Boolean(marks.fontSize) ||
    Boolean(marks.subscript) ||
    Boolean(marks.superscript);

  let value = marks.code ? child.text : htmlRequired ? escapeHtmlText(child.text) : escapeMarkdownText(child.text);

  if (marks.code) {
    value = `\`${child.text.replaceAll("`", "\\`")}\``;
  }

  if (!marks.code) {
    if (marks.bold) {
      value = `**${value}**`;
    }

    if (marks.italic) {
      value = `*${value}*`;
    }

    if (marks.strike) {
      value = `~~${value}~~`;
    }
  }

  if (marks.underline) {
    value = `<u>${value}</u>`;
  }

  if (marks.subscript) {
    value = `<sub>${value}</sub>`;
  }

  if (marks.superscript) {
    value = `<sup>${value}</sup>`;
  }

  if (marks.highlight) {
    value = `<mark style="background-color:${marks.highlight}">${value}</mark>`;
  }

  if (marks.color || marks.fontFamily || marks.fontSize) {
    const styles = [
      marks.color ? `color:${marks.color}` : "",
      marks.fontFamily ? `font-family:${marks.fontFamily}` : "",
      marks.fontSize ? `font-size:${marks.fontSize}` : "",
    ]
      .filter(Boolean)
      .join("; ");

    value = `<span style="${styles}">${value}</span>`;
  }

  if (marks.link) {
    value = `[${value}](${marks.link})`;
  }

  return value;
}

function serializeInline(children: InlineNode[]) {
  return children
    .map((child) => {
      if (child.type === "hardBreak") {
        return "  \n";
      }

      return wrapStyledText(child);
    })
    .join("");
}

function indentLines(value: string, spaces: number) {
  const pad = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => (line ? `${pad}${line}` : line))
    .join("\n");
}

function paragraphToMarkdown(block: ParagraphBlock) {
  return serializeInline(block.children).trimEnd();
}

function serializeCell(blocks: BlockNode[]) {
  const [firstBlock] = blocks;

  if (!firstBlock) {
    return "";
  }

  if (firstBlock.type === "paragraph" || firstBlock.type === "heading") {
    return serializeInline(firstBlock.children).replaceAll("\n", " ").trim();
  }

  if (firstBlock.type === "codeBlock") {
    return `\`${firstBlock.text}\``;
  }

  if (firstBlock.type === "image") {
    return firstBlock.alt ?? "Image";
  }

  return inlineNodesToPlainText([]);
}

function tableToMarkdown(table: TableBlock) {
  if (!table.rows.length) {
    return "";
  }

  const headerRow = table.rows[0];
  const headerCells = headerRow.cells.map((cell) => serializeCell(cell.blocks).replaceAll("|", "\\|") || " ");
  const divider = headerCells.map(() => "---");
  const bodyRows = table.rows.slice(1).map((row) =>
    row.cells.map((cell) => serializeCell(cell.blocks).replaceAll("|", "\\|") || " "),
  );

  return [
    `| ${headerCells.join(" | ")} |`,
    `| ${divider.join(" | ")} |`,
    ...bodyRows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function blockToMarkdown(block: BlockNode, indent = 0): string {
  if (block.type === "paragraph") {
    return indentLines(paragraphToMarkdown(block), indent);
  }

  if (block.type === "heading") {
    return indentLines(`${"#".repeat(Math.max(1, Math.min(block.level, 6)))} ${serializeInline(block.children).trim()}`, indent);
  }

  if (block.type === "blockquote") {
    return block
      .blocks
      .map((nested) =>
        blockToMarkdown(nested)
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n"),
      )
      .join("\n\n");
  }

  if (block.type === "codeBlock") {
    const language = block.language ? block.language.trim() : "";
    return `${" ".repeat(indent)}\`\`\`${language}\n${block.text}\n${" ".repeat(indent)}\`\`\``;
  }

  if (block.type === "horizontalRule") {
    return indentLines("---", indent);
  }

  if (block.type === "image") {
    const title = block.title ? ` "${block.title}"` : "";
    const alt = escapeMarkdownText(block.alt ?? "Image");
    return indentLines(`![${alt}](${block.src}${title})`, indent);
  }

  if (block.type === "bulletList") {
    return block.items
      .map((item) => {
        const [firstBlock, ...rest] = item.blocks;
        const firstLine =
          firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading")
            ? serializeInline(firstBlock.children).trim()
            : "";
        const nestedBlocks =
          firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading") ? rest : item.blocks;
        const nested = nestedBlocks.map((nestedBlock) => blockToMarkdown(nestedBlock, indent + 2)).filter(Boolean).join("\n");

        return nested
          ? `${" ".repeat(indent)}- ${firstLine}\n${nested}`
          : `${" ".repeat(indent)}- ${firstLine}`.trimEnd();
      })
      .join("\n");
  }

  if (block.type === "orderedList") {
    return block.items
      .map((item, index) => {
        const number = block.start + index;
        const [firstBlock, ...rest] = item.blocks;
        const firstLine =
          firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading")
            ? serializeInline(firstBlock.children).trim()
            : "";
        const nestedBlocks =
          firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading") ? rest : item.blocks;
        const nested = nestedBlocks.map((nestedBlock) => blockToMarkdown(nestedBlock, indent + 3)).filter(Boolean).join("\n");

        return nested
          ? `${" ".repeat(indent)}${number}. ${firstLine}\n${nested}`
          : `${" ".repeat(indent)}${number}. ${firstLine}`.trimEnd();
      })
      .join("\n");
  }

  if (block.type === "taskList") {
    return block.items
      .map((item) => {
        const [firstBlock, ...rest] = item.blocks;
        const firstLine =
          firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading")
            ? serializeInline(firstBlock.children).trim()
            : "";
        const nestedBlocks =
          firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading") ? rest : item.blocks;
        const nested = nestedBlocks.map((nestedBlock) => blockToMarkdown(nestedBlock, indent + 6)).filter(Boolean).join("\n");

        return nested
          ? `${" ".repeat(indent)}- [${item.checked ? "x" : " "}] ${firstLine}\n${nested}`
          : `${" ".repeat(indent)}- [${item.checked ? "x" : " "}] ${firstLine}`.trimEnd();
      })
      .join("\n");
  }

  if (block.type === "table") {
    return tableToMarkdown(block);
  }

  return "";
}

export function serializeDocumentToMarkdown(content: JSONContent) {
  const markdown = normalizeDocument(content)
    .map((block) => blockToMarkdown(block))
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return markdown ? `${markdown}\n` : "";
}
