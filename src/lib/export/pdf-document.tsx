import type { JSONContent } from "@tiptap/core";
import type { ReactNode } from "react";
import {
  Document,
  Image as PdfImage,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import { PDF_FONT_MAP } from "@/lib/editor/types";
import { isDataUrl, parseFontSize } from "@/lib/export/image-data";
import {
  inlineNodesToPlainText,
  normalizeDocument,
  type BlockNode,
  type InlineNode,
} from "@/lib/export/model";
import {
  calculatePaginationBreaksByEstimate,
  PDF_TITLE_RESERVE_PX,
  splitBlocksIntoPages,
} from "@/lib/pagination";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#fbf6ef",
    color: "#241f1a",
    fontFamily: "Helvetica",
    fontSize: 12,
    paddingTop: 56,
    paddingRight: 56,
    paddingBottom: 72,
    paddingLeft: 56,
  },
  title: {
    fontSize: 28,
    fontFamily: "Times-Roman",
    marginBottom: 18,
    color: "#201914",
  },
  paragraph: {
    marginBottom: 12,
    lineHeight: 1.65,
  },
  heading1: {
    fontSize: 24,
    fontFamily: "Times-Roman",
    marginTop: 14,
    marginBottom: 10,
  },
  heading2: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    marginTop: 8,
    marginBottom: 6,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: "#bd682e",
    paddingLeft: 12,
    marginBottom: 14,
    color: "#5a4634",
  },
  codeBlock: {
    backgroundColor: "#f1ebe3",
    borderLeftWidth: 3,
    borderLeftColor: "#ceb79f",
    padding: 12,
    marginBottom: 14,
  },
  codeText: {
    fontFamily: "Courier",
    fontSize: 10.5,
    lineHeight: 1.5,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  listMarker: {
    width: 20,
    fontFamily: "Helvetica-Bold",
  },
  listBody: {
    flex: 1,
  },
  rule: {
    borderBottomWidth: 1,
    borderBottomColor: "#d7c7b3",
    marginTop: 6,
    marginBottom: 18,
  },
  image: {
    width: "100%",
    maxHeight: 320,
    objectFit: "contain",
    marginBottom: 12,
  },
  table: {
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d7c7b3",
  },
  row: {
    flexDirection: "row",
  },
  headerCell: {
    flex: 1,
    padding: 8,
    backgroundColor: "#f0dfca",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d7c7b3",
  },
  cell: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d7c7b3",
  },
  cellText: {
    fontSize: 10.5,
    lineHeight: 1.45,
  },
  link: {
    color: "#1d4ed8",
    textDecoration: "underline",
  },
  footer: {
    position: "absolute",
    left: 56,
    right: 56,
    bottom: 24,
    fontSize: 9,
    color: "#7c6144",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function pdfTextAlign(value?: string): "left" | "center" | "right" | "justify" {
  if (value === "center" || value === "right" || value === "justify") {
    return value;
  }

  return "left";
}

function getTextStyle(child: Extract<InlineNode, { type: "text" }>) {
  const fontFamily = child.marks.code
    ? PDF_FONT_MAP["var(--font-editor-mono)"]
    : child.marks.fontFamily
      ? PDF_FONT_MAP[child.marks.fontFamily] ?? PDF_FONT_MAP["var(--font-editor-sans)"]
      : undefined;
  const textDecoration = child.marks.underline ? "underline" : child.marks.strike ? "line-through" : undefined;

  return {
    fontFamily,
    fontSize: parseFontSize(child.marks.fontSize, 12),
    fontWeight: child.marks.bold ? 700 : 400,
    fontStyle: child.marks.italic ? "italic" : "normal",
    color: child.marks.color ?? "#241f1a",
    textDecoration,
    backgroundColor: child.marks.highlight,
  } as const;
}

function renderInline(children: InlineNode[]): ReactNode[] {
  return children.map((child, index) => {
    if (child.type === "hardBreak") {
      return <Text key={`break-${index}`}>{"\n"}</Text>;
    }

    const textStyle = getTextStyle(child);
    const text = child.text;

    if (child.marks.link) {
      return (
        <Link key={`link-${index}`} src={child.marks.link} style={[styles.link, textStyle]}>
          {text}
        </Link>
      );
    }

    return (
      <Text key={`text-${index}`} style={textStyle}>
        {text}
      </Text>
    );
  });
}

function renderBlocks(blocks: BlockNode[], depth = 0): ReactNode[] {
  return blocks.map((block) => {
    if (block.type === "paragraph") {
      return (
        <Text
          key={block.id}
          style={[
            styles.paragraph,
            {
              textAlign: pdfTextAlign(block.align),
              marginLeft: depth * 12,
            },
          ]}
        >
          {renderInline(block.children)}
        </Text>
      );
    }

    if (block.type === "heading") {
      const headingStyle = block.level === 1 ? styles.heading1 : block.level === 2 ? styles.heading2 : styles.heading3;

      return (
        <Text key={block.id} style={[headingStyle, { textAlign: pdfTextAlign(block.align) }]}>
          {renderInline(block.children)}
        </Text>
      );
    }

    if (block.type === "blockquote") {
      return (
        <View key={block.id} style={styles.blockquote}>
          {renderBlocks(block.blocks, depth + 1)}
        </View>
      );
    }

    if (block.type === "codeBlock") {
      return (
        <View key={block.id} style={styles.codeBlock}>
          <Text style={styles.codeText}>{block.text}</Text>
        </View>
      );
    }

    if (block.type === "horizontalRule") {
      return <View key={block.id} style={styles.rule} />;
    }

    if (block.type === "image") {
      if (!isDataUrl(block.src)) {
        return (
          <View key={block.id} style={{ marginBottom: 14 }}>
            <Text style={[styles.paragraph, { fontStyle: "italic", color: "#7c6144" }]}>
              {block.alt || "External image"}
            </Text>
            <Link src={block.src} style={styles.link}>
              {block.src}
            </Link>
          </View>
        );
      }

      return <PdfImage key={block.id} src={block.src} style={styles.image} />;
    }

    if (block.type === "bulletList") {
      return (
        <View key={block.id} style={{ marginBottom: 12 }}>
          {block.items.map((item) => {
            const [firstBlock, ...rest] = item.blocks;
            const marker = "•";
            const text =
              firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading")
                ? inlineNodesToPlainText(firstBlock.children)
                : "";

            return (
              <View key={item.id} style={[styles.listItem, { marginLeft: depth * 14 }]}>
                <Text style={styles.listMarker}>{marker}</Text>
                <View style={styles.listBody}>
                  <Text style={styles.paragraph}>{text}</Text>
                  {renderBlocks(
                    firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading") ? rest : item.blocks,
                    depth + 1,
                  )}
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    if (block.type === "orderedList") {
      return (
        <View key={block.id} style={{ marginBottom: 12 }}>
          {block.items.map((item, index) => {
            const [firstBlock, ...rest] = item.blocks;
            const text =
              firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading")
                ? inlineNodesToPlainText(firstBlock.children)
                : "";

            return (
              <View key={item.id} style={[styles.listItem, { marginLeft: depth * 14 }]}>
                <Text style={styles.listMarker}>{`${block.start + index}.`}</Text>
                <View style={styles.listBody}>
                  <Text style={styles.paragraph}>{text}</Text>
                  {renderBlocks(
                    firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading") ? rest : item.blocks,
                    depth + 1,
                  )}
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    if (block.type === "taskList") {
      return (
        <View key={block.id} style={{ marginBottom: 12 }}>
          {block.items.map((item) => {
            const [firstBlock, ...rest] = item.blocks;
            const text =
              firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading")
                ? inlineNodesToPlainText(firstBlock.children)
                : "";

            return (
              <View key={item.id} style={[styles.listItem, { marginLeft: depth * 14 }]}>
                <Text style={styles.listMarker}>{item.checked ? "[x]" : "[ ]"}</Text>
                <View style={styles.listBody}>
                  <Text style={styles.paragraph}>{text}</Text>
                  {renderBlocks(
                    firstBlock && (firstBlock.type === "paragraph" || firstBlock.type === "heading") ? rest : item.blocks,
                    depth + 1,
                  )}
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    if (block.type === "table") {
      return (
        <View key={block.id} style={styles.table}>
          {block.rows.map((row, rowIndex) => (
            <View key={row.id} style={styles.row}>
              {row.cells.map((cell, cellIndex) => {
                const cellStyle = rowIndex === 0 || cell.header ? styles.headerCell : styles.cell;
                const plain = cell.blocks
                  .map((cellBlock) => {
                    if (cellBlock.type === "paragraph" || cellBlock.type === "heading") {
                      return inlineNodesToPlainText(cellBlock.children);
                    }

                    if (cellBlock.type === "codeBlock") {
                      return cellBlock.text;
                    }

                    return "";
                  })
                  .join("\n");

                return (
                  <View
                    key={`${cell.id}-${cellIndex}`}
                    style={row.cells.length - 1 === cellIndex ? [cellStyle, { borderRightWidth: 0 }] : cellStyle}
                  >
                    <Text style={styles.cellText}>{plain}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      );
    }

    return null;
  });
}

function ExportedPdf({ title, content }: { title: string; content: JSONContent }) {
  const blocks = normalizeDocument(content);
  const pages = splitBlocksIntoPages(
    blocks,
    calculatePaginationBreaksByEstimate(blocks, undefined, PDF_TITLE_RESERVE_PX),
  );

  return (
    <Document title={title}>
      {pages.map((pageBlocks, index) => (
        <Page key={`page-${index + 1}`} size="LETTER" style={styles.page}>
          {index === 0 ? <Text style={styles.title}>{title}</Text> : null}
          {renderBlocks(pageBlocks)}
          <View style={styles.footer} fixed>
            <Text>Exported from Folio Writer</Text>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      ))}
    </Document>
  );
}

export async function createPdfBuffer(title: string, content: JSONContent) {
  return renderToBuffer(<ExportedPdf title={title} content={content} />);
}
