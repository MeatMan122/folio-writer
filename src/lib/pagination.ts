import { inlineNodesToPlainText, type BlockNode } from "@/lib/export/model";

export const EDITOR_PAGE_HEIGHT_PX = 1056;
export const EDITOR_PAGE_GAP_PX = 64;
export const EDITOR_PAGE_PADDING_X_PX = 76;
export const EDITOR_PAGE_PADDING_Y_PX = 72;
export const EDITOR_PAGE_CONTENT_HEIGHT_PX = EDITOR_PAGE_HEIGHT_PX - EDITOR_PAGE_PADDING_Y_PX * 2;
export const PDF_TITLE_RESERVE_PX = 96;

function estimateWrappedTextHeight(text: string, charsPerLine: number, lineHeight: number, baseHeight: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const lines = Math.max(1, Math.ceil(Math.max(normalized.length, 1) / charsPerLine));
  return baseHeight + lines * lineHeight;
}

function estimateBlocksHeight(blocks: BlockNode[]) {
  return blocks.reduce((total, block) => total + estimateBlockHeight(block), 0);
}

function estimateTableRowHeight(row: Extract<BlockNode, { type: "table" }>["rows"][number]) {
  const cellHeights = row.cells.map((cell) => {
    const text = cell.blocks
      .map((block) => {
        if (block.type === "paragraph" || block.type === "heading") {
          return inlineNodesToPlainText(block.children);
        }

        if (block.type === "codeBlock") {
          return block.text;
        }

        if (block.type === "image") {
          return block.alt ?? "image";
        }

        return "";
      })
      .join(" ");

    return estimateWrappedTextHeight(text, 18, 18, 28);
  });

  return Math.max(...cellHeights, 42);
}

export function estimateBlockHeight(block: BlockNode): number {
  if (block.type === "paragraph") {
    return estimateWrappedTextHeight(inlineNodesToPlainText(block.children), 62, 28, 18);
  }

  if (block.type === "heading") {
    if (block.level === 1) {
      return estimateWrappedTextHeight(inlineNodesToPlainText(block.children), 24, 42, 28);
    }

    if (block.level === 2) {
      return estimateWrappedTextHeight(inlineNodesToPlainText(block.children), 34, 34, 22);
    }

    return estimateWrappedTextHeight(inlineNodesToPlainText(block.children), 42, 30, 18);
  }

  if (block.type === "bulletList" || block.type === "orderedList") {
    return (
      12 +
      block.items.reduce((total, item) => total + Math.max(36, estimateBlocksHeight(item.blocks) + 8), 0)
    );
  }

  if (block.type === "taskList") {
    return (
      12 +
      block.items.reduce((total, item) => total + Math.max(38, estimateBlocksHeight(item.blocks) + 10), 0)
    );
  }

  if (block.type === "blockquote") {
    return 24 + estimateBlocksHeight(block.blocks);
  }

  if (block.type === "codeBlock") {
    const lines = Math.max(1, block.text.split("\n").length);
    return 34 + lines * 22;
  }

  if (block.type === "image") {
    return 320;
  }

  if (block.type === "horizontalRule") {
    return 42;
  }

  if (block.type === "table") {
    return 24 + block.rows.reduce((total, row) => total + estimateTableRowHeight(row), 0);
  }

  return 48;
}

export function calculatePaginationBreaksFromHeights(
  heights: number[],
  pageContentHeight = EDITOR_PAGE_CONTENT_HEIGHT_PX,
  initialUsedHeight = 0,
) {
  const breaks: number[] = [];
  let usedHeight = initialUsedHeight;

  heights.forEach((height, index) => {
    if (index > 0 && usedHeight > 0 && usedHeight + height > pageContentHeight) {
      breaks.push(index);
      usedHeight = height;
      return;
    }

    usedHeight += height;
  });

  return breaks;
}

export function calculatePaginationBreaksByEstimate(
  blocks: BlockNode[],
  pageContentHeight = EDITOR_PAGE_CONTENT_HEIGHT_PX,
  initialUsedHeight = 0,
) {
  return calculatePaginationBreaksFromHeights(
    blocks.map((block) => estimateBlockHeight(block)),
    pageContentHeight,
    initialUsedHeight,
  );
}

export function splitBlocksIntoPages(blocks: BlockNode[], breaks: number[]) {
  if (!breaks.length) {
    return [blocks];
  }

  const pages: BlockNode[][] = [];
  let startIndex = 0;

  for (const breakIndex of breaks) {
    pages.push(blocks.slice(startIndex, breakIndex));
    startIndex = breakIndex;
  }

  pages.push(blocks.slice(startIndex));
  return pages.filter((page) => page.length > 0);
}
