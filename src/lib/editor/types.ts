import type { Editor, JSONContent } from "@tiptap/core";
import type { LucideIcon } from "lucide-react";

export const STORAGE_KEY = "folio-writer.document.v1";

export interface StoredDocument {
  title: string;
  content: JSONContent;
  templateId: string;
  updatedAt: string;
}

export interface EditorTemplate {
  id: string;
  name: string;
  title: string;
  summary: string;
  description: string;
  content: JSONContent;
}

export interface ExportRequestBody {
  title: string;
  content: JSONContent;
}

export interface OutlineItem {
  id: string;
  level: number;
  text: string;
}

export interface DocumentStats {
  words: number;
  characters: number;
  paragraphs: number;
  headings: number;
  tables: number;
  images: number;
  estimatedMinutes: number;
}

export interface SlashCommandContext {
  editor: Editor;
  range: { from: number; to: number };
}

export interface SlashCommandItem {
  title: string;
  description: string;
  searchTerms: string[];
  icon: LucideIcon;
  command: (context: SlashCommandContext) => void;
}

export interface SelectOption {
  label: string;
  value: string;
}

export const FONT_FAMILY_OPTIONS: SelectOption[] = [
  { label: "Modern Sans", value: "var(--font-editor-sans)" },
  { label: "Classic Serif", value: "var(--font-editor-serif)" },
  { label: "Writer Mono", value: "var(--font-editor-mono)" },
];

export const FONT_SIZE_OPTIONS: SelectOption[] = [
  { label: "11 pt", value: "11pt" },
  { label: "12 pt", value: "12pt" },
  { label: "14 pt", value: "14pt" },
  { label: "16 pt", value: "16pt" },
  { label: "18 pt", value: "18pt" },
  { label: "24 pt", value: "24pt" },
  { label: "32 pt", value: "32pt" },
];

export const TEXT_COLOR_OPTIONS = [
  { label: "Ink", value: "#241f1a" },
  { label: "Slate", value: "#4b5563" },
  { label: "Cobalt", value: "#1d4ed8" },
  { label: "Forest", value: "#166534" },
  { label: "Merlot", value: "#9f1239" },
  { label: "Copper", value: "#b45309" },
];

export const HIGHLIGHT_COLOR_OPTIONS = [
  { label: "Amber", value: "#fde68a" },
  { label: "Mint", value: "#bbf7d0" },
  { label: "Sky", value: "#bfdbfe" },
  { label: "Rose", value: "#fecdd3" },
];

export const EXPORT_FONT_MAP: Record<string, string> = {
  "var(--font-editor-sans)": "Aptos",
  "var(--font-editor-serif)": "Georgia",
  "var(--font-editor-mono)": "Courier New",
};

export const PDF_FONT_MAP: Record<string, string> = {
  "var(--font-editor-sans)": "Helvetica",
  "var(--font-editor-serif)": "Times-Roman",
  "var(--font-editor-mono)": "Courier",
};
