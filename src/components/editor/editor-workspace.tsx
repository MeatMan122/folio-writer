"use client";

import { startTransition, useDeferredValue, useEffect, useEffectEvent, useId, useRef, useState } from "react";
import CharacterCount from "@tiptap/extension-character-count";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Copy,
  Download,
  FileOutput,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  LoaderCircle,
  Minus,
  MoreHorizontal,
  Palette,
  PenTool,
  Printer,
  Quote,
  Redo2,
  Save,
  Sparkles,
  Strikethrough,
  Table2,
  Type,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { common, createLowlight } from "lowlight";

import { cloneTemplateContent, createStoredDocument, editorTemplates, getTemplateById } from "@/lib/editor/templates";
import { FontSize } from "@/lib/editor/extensions/font-size";
import {
  getPaginationBreaks,
  Pagination,
  setPaginationBreaks,
} from "@/lib/editor/extensions/pagination";
import { SlashCommand } from "@/lib/editor/extensions/slash-command";
import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  HIGHLIGHT_COLOR_OPTIONS,
  TEXT_COLOR_OPTIONS,
  type SlashCommandItem,
} from "@/lib/editor/types";
import {
  downloadBlob,
  formatRelativeTime,
  loadStoredDocument,
  persistStoredDocument,
  readFileAsDataUrl,
  sanitizeFileName,
} from "@/lib/editor/utils";
import { serializeDocumentToMarkdown } from "@/lib/export/markdown";
import { buildDocumentStats, extractOutline, normalizeDocument } from "@/lib/export/model";
import {
  calculatePaginationBreaksByEstimate,
  calculatePaginationBreaksFromHeights,
  EDITOR_PAGE_CONTENT_HEIGHT_PX,
} from "@/lib/pagination";

const lowlight = createLowlight(common);

function ToolbarButton({
  active,
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: typeof Bold;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition md:h-9 md:w-9 ${
        active
          ? "border-[color:rgba(189,104,46,0.3)] bg-[color:rgba(189,104,46,0.16)] text-[var(--color-accent)]"
          : "border-transparent bg-white/70 text-[color:rgba(36,31,26,0.78)] hover:border-[color:rgba(36,31,26,0.08)] hover:bg-white"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="hidden h-7 w-px bg-[color:rgba(36,31,26,0.08)] md:block" />;
}

function OverflowAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Bold;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[color:rgba(36,31,26,0.78)] transition hover:bg-[color:rgba(36,31,26,0.05)]"
    >
      <Icon className="h-4 w-4 text-[color:rgba(36,31,26,0.6)]" />
      <span>{label}</span>
    </button>
  );
}

function ShellTab({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-[var(--color-accent)] text-white"
          : "bg-[color:rgba(36,31,26,0.05)] text-[color:rgba(36,31,26,0.68)] hover:bg-[color:rgba(36,31,26,0.08)]"
      }`}
    >
      {children}
    </button>
  );
}

function createSlashItems(): SlashCommandItem[] {
  return [
    {
      title: "Heading 1",
      description: "Add a bold section opener.",
      searchTerms: ["title", "hero", "section"],
      icon: Heading1,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run(),
    },
    {
      title: "Heading 2",
      description: "Insert a mid-level section heading.",
      searchTerms: ["subheading", "h2"],
      icon: Heading2,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run(),
    },
    {
      title: "Heading 3",
      description: "Insert a compact section heading.",
      searchTerms: ["h3", "mini heading"],
      icon: Heading3,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run(),
    },
    {
      title: "Bullet List",
      description: "Create an unordered list.",
      searchTerms: ["bullets", "list"],
      icon: List,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: "Numbered List",
      description: "Create a sequential list.",
      searchTerms: ["ordered", "numbers"],
      icon: ListOrdered,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: "Checklist",
      description: "Track tasks with checkboxes.",
      searchTerms: ["task", "todo"],
      icon: ListChecks,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      title: "Table",
      description: "Insert a 3x3 table with headers.",
      searchTerms: ["grid", "rows", "columns"],
      icon: Table2,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      title: "Quote",
      description: "Highlight a key idea or citation.",
      searchTerms: ["blockquote", "callout"],
      icon: Quote,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: "Code Block",
      description: "Insert preformatted code.",
      searchTerms: ["snippet", "code"],
      icon: Code2,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: "Divider",
      description: "Break up your page with a rule.",
      searchTerms: ["line", "separator"],
      icon: Minus,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      title: "Image From URL",
      description: "Insert an image using a link.",
      searchTerms: ["photo", "media", "graphic"],
      icon: ImagePlus,
      command: ({ editor, range }) => {
        const src = window.prompt("Paste an image URL");

        if (!src) {
          return;
        }

        editor.chain().focus().deleteRange(range).setImage({ src, alt: "Inserted image" }).run();
      },
    },
  ];
}

function haveSameValues(left: number[], right: number[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function EditorWorkspace() {
  const imageInputId = useId();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const [documentState, setDocumentState] = useState(createStoredDocument());
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [inspectorTab, setInspectorTab] = useState<"overview" | "markdown">("overview");
  const [exporting, setExporting] = useState<null | "markdown" | "pdf" | "docx">(null);
  const [status, setStatus] = useState("Local autosave is active.");
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const deferredContent = useDeferredValue(documentState.content);
  const markdown = serializeDocumentToMarkdown(deferredContent);
  const stats = buildDocumentStats(deferredContent);
  const outline = extractOutline(deferredContent);
  const toolbarMode = viewportWidth < 1080 ? "tight" : viewportWidth < 1380 ? "compact" : "full";
  const showOverflowMenu = toolbarMode !== "full";
  const showHeadingThreeInline = toolbarMode === "full";
  const showAdvancedInline = toolbarMode === "full";
  const showColorInline = toolbarMode !== "tight";
  const showTableInline = toolbarMode === "full";
  const overflowMenuOpen = showOverflowMenu && isMoreOpen;

  async function insertImages(files: File[], position?: number | null) {
    if (!editor) {
      return;
    }

    const images = files.filter((file) => file.type.startsWith("image/"));

    for (const file of images) {
      const src = await readFileAsDataUrl(file);
      const chain = editor.chain().focus();

      if (typeof position === "number") {
        chain.setTextSelection(position);
      }

      chain.setImage({ src, alt: file.name }).run();
    }

    setStatus(`${images.length} image${images.length === 1 ? "" : "s"} inserted.`);
  }

  const editor = useEditor(
    {
      immediatelyRender: false,
      autofocus: "end",
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          horizontalRule: false,
          heading: { levels: [1, 2, 3] },
        }),
        CodeBlockLowlight.configure({ lowlight }),
        Typography,
        Underline,
        Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
        Placeholder.configure({
          placeholder: ({ node }) =>
            node.type.name === "heading" ? "Write a section title" : "Start drafting or press / for blocks",
        }),
        TextStyle,
        FontFamily.configure({ types: ["textStyle"] }),
        FontSize,
        Color,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Superscript,
        Subscript,
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Image.configure({ allowBase64: true }),
        HorizontalRule,
        CharacterCount,
        Pagination,
        SlashCommand.configure({
          items: (query) =>
            createSlashItems().filter((item) =>
              [item.title, item.description, ...item.searchTerms].join(" ").toLowerCase().includes(query.toLowerCase()),
            ),
        }),
      ],
      content: documentState.content,
      editorProps: {
        attributes: {
          class: "folio-editor prose-editor focus:outline-none",
          spellcheck: "true",
        },
        handlePaste: (_view, event) => {
          const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));

          if (!files.length) {
            return false;
          }

          event.preventDefault();
          void insertImages(files);
          return true;
        },
        handleDrop: (view, event) => {
          const files = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith("image/"));

          if (!files.length) {
            return false;
          }

          event.preventDefault();
          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
          void insertImages(files, coords?.pos);
          return true;
        },
      },
      onUpdate: ({ editor: instance }) => {
        startTransition(() => {
          setDocumentState((current) => ({
            ...current,
            content: instance.getJSON(),
            updatedAt: new Date().toISOString(),
          }));
        });
      },
    },
    [],
  );

  useEffect(() => {
    if (!editor || ready) {
      return;
    }

    const restored = loadStoredDocument();
    setDocumentState(restored);
    editor.commands.setContent(restored.content, { emitUpdate: false });
    setReady(true);
    setStatus("Local draft restored.");
  }, [editor, ready]);

  useEffect(() => {
    if (!editor || !ready) {
      return;
    }

    const instance = editor;
    const editorRoot = instance.view.dom as HTMLElement;
    let frame = 0;

    function getRenderableBlocks() {
      return Array.from(editorRoot.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.paginationGap !== "true",
      );
    }

    function measureBlockHeights(elements: HTMLElement[]) {
      return elements.map((element, index) => {
        const next = elements[index + 1];

        if (next) {
          return next.offsetTop - element.offsetTop;
        }

        const styles = window.getComputedStyle(element);
        const marginBottom = Number.parseFloat(styles.marginBottom) || 0;
        return element.offsetHeight + marginBottom;
      });
    }

    function syncPagination() {
      frame = 0;

      const normalizedBlocks = normalizeDocument(instance.getJSON());
      const elements = getRenderableBlocks();
      const measuredBreaks =
        elements.length === instance.state.doc.childCount && elements.length === normalizedBlocks.length
          ? calculatePaginationBreaksFromHeights(measureBlockHeights(elements), EDITOR_PAGE_CONTENT_HEIGHT_PX)
          : null;
      const nextBreaks = measuredBreaks ?? calculatePaginationBreaksByEstimate(normalizedBlocks, EDITOR_PAGE_CONTENT_HEIGHT_PX);
      const currentBreaks = getPaginationBreaks(instance.state);

      if (!haveSameValues(currentBreaks, nextBreaks)) {
        setPaginationBreaks(instance.view, nextBreaks);
      }

      setPageCount(nextBreaks.length + 1);
    }

    function schedulePagination() {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(syncPagination);
    }

    const resizeObserver = new ResizeObserver(schedulePagination);
    resizeObserver.observe(editorRoot);
    instance.on("update", schedulePagination);
    schedulePagination();

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      resizeObserver.disconnect();
      instance.off("update", schedulePagination);
    };
  }, [editor, ready]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function syncViewportWidth() {
      setViewportWidth(window.innerWidth);
    }

    syncViewportWidth();
    window.addEventListener("resize", syncViewportWidth);

    return () => window.removeEventListener("resize", syncViewportWidth);
  }, []);

  useEffect(() => {
    if (!overflowMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [overflowMenuOpen]);

  function saveNow() {
    persistStoredDocument(documentState);
    setStatus(`Saved ${formatRelativeTime(documentState.updatedAt, Date.now())}.`);
  }

  useEffect(() => {
    if (!ready) {
      return;
    }

    const timeout = window.setTimeout(() => {
      persistStoredDocument(documentState);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [documentState, ready]);

  const handleShortcuts = useEffectEvent((event: KeyboardEvent) => {
    if (!(event.metaKey || event.ctrlKey)) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === "s") {
      event.preventDefault();
      saveNow();
    }

    if (key === "p") {
      event.preventDefault();
      window.print();
    }
  });

  useEffect(() => {
    function listener(event: KeyboardEvent) {
      handleShortcuts(event);
    }

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  async function exportDocument(format: "markdown" | "pdf" | "docx") {
    if (!editor) {
      return;
    }

    setExporting(format);

    try {
      if (format === "markdown") {
        downloadBlob(
          sanitizeFileName(documentState.title, "md"),
          new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
        );
      } else {
        const response = await fetch(`/api/export/${format}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: documentState.title,
            content: editor.getJSON(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Export failed with status ${response.status}`);
        }

        const blob = await response.blob();
        downloadBlob(sanitizeFileName(documentState.title, format), blob);
      }

      setStatus(`${format.toUpperCase()} export is ready.`);
    } catch {
      setStatus(`Could not export ${format.toUpperCase()}.`);
    } finally {
      setExporting(null);
    }
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setStatus("Markdown copied to the clipboard.");
  }

  function runOverflowAction(action: () => void) {
    action();
    setIsMoreOpen(false);
  }

  function applyTemplate(templateId: string) {
    if (!editor) {
      return;
    }

    const template = getTemplateById(templateId);
    const shouldContinue =
      stats.words < 20 || window.confirm(`Replace the current draft with the "${template.name}" template?`);

    if (!shouldContinue) {
      return;
    }

    const content = cloneTemplateContent(templateId);
    editor.commands.setContent(content);

    startTransition(() => {
      setDocumentState({
        title: template.title,
        content,
        templateId,
        updatedAt: new Date().toISOString(),
      });
    });

    setStatus(`${template.name} loaded.`);
  }

  function jumpToHeading(text: string, level: number) {
    if (!editor) {
      return;
    }

    let position = 1;

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading" && node.attrs.level === level && node.textContent === text) {
        position = pos + 1;
        return false;
      }

      return true;
    });

    editor.chain().focus(position).scrollIntoView().run();
  }

  function promptForLink() {
    if (!editor) {
      return;
    }

    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Paste a link", previous ?? "https://");

    if (href === null) {
      return;
    }

    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const currentFontFamily = (editor?.getAttributes("textStyle").fontFamily as string | undefined) ?? FONT_FAMILY_OPTIONS[0].value;
  const currentFontSize = (editor?.getAttributes("textStyle").fontSize as string | undefined) ?? FONT_SIZE_OPTIONS[1].value;
  const currentColor = (editor?.getAttributes("textStyle").color as string | undefined) ?? "";
  const currentHighlight = (editor?.getAttributes("highlight").color as string | undefined) ?? "";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f4ebdd_0%,#efe3d4_34%,#e6d9c9_100%)] text-[var(--color-ink)]">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 md:px-6 lg:px-8"
      >
        <header className="rounded-[30px] border border-white/60 bg-[color:rgba(255,249,242,0.78)] px-5 py-4 shadow-[0_30px_90px_rgba(78,57,37,0.12)] backdrop-blur-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm font-medium text-[color:rgba(36,31,26,0.62)]">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-white shadow-[0_12px_30px_rgba(189,104,46,0.35)]">
                  <PenTool className="h-4 w-4" />
                </span>
                <span>Folio Writer</span>
                <span className="rounded-full border border-[color:rgba(36,31,26,0.08)] px-2 py-0.5 text-xs uppercase tracking-[0.24em]">
                  Web Editor
                </span>
              </div>
              <div>
                <input
                  value={documentState.title}
                  onChange={(event) =>
                    setDocumentState((current) => ({
                      ...current,
                      title: event.target.value,
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                  className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none md:text-3xl"
                />
                <p className="mt-1 text-sm text-[color:rgba(36,31,26,0.58)]">
                  Rich WYSIWYG editing, local autosave, and export to Markdown, PDF, and DOCX.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveNow}
                className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(36,31,26,0.08)] bg-white px-4 py-2 text-sm font-medium shadow-[0_12px_24px_rgba(36,31,26,0.06)] transition hover:-translate-y-0.5"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => exportDocument("pdf")}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white shadow-[0_16px_36px_rgba(189,104,46,0.35)] transition hover:-translate-y-0.5"
              >
                {exporting === "pdf" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileOutput className="h-4 w-4" />}
                Export PDF
              </button>
            </div>
          </div>
        </header>

        <div className="mt-4 grid flex-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <motion.aside
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, duration: 0.35 }}
            className="overflow-hidden rounded-[30px] border border-white/60 bg-[color:rgba(255,249,242,0.82)] shadow-[0_25px_80px_rgba(78,57,37,0.1)] backdrop-blur-md"
          >
            <div className="border-b border-[color:rgba(36,31,26,0.08)] px-5 py-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:rgba(36,31,26,0.44)]">Templates</p>
            </div>
            <div className="space-y-3 p-4">
              {editorTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template.id)}
                  className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                    documentState.templateId === template.id
                      ? "border-[color:rgba(189,104,46,0.28)] bg-[color:rgba(189,104,46,0.1)]"
                      : "border-transparent bg-white/70 hover:border-[color:rgba(36,31,26,0.08)] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{template.name}</p>
                    <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                  </div>
                  <p className="mt-2 text-sm text-[color:rgba(36,31,26,0.66)]">{template.summary}</p>
                </button>
              ))}
            </div>
            <div className="border-t border-[color:rgba(36,31,26,0.08)] px-5 py-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:rgba(36,31,26,0.44)]">Outline</p>
            </div>
            <div className="space-y-1 px-4 pb-4">
              {outline.length ? (
                outline.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => jumpToHeading(item.text, item.level)}
                    className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm transition hover:bg-white"
                    style={{ paddingLeft: `${12 + item.level * 10}px` }}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:rgba(36,31,26,0.05)] text-[11px] font-semibold">
                      H{item.level}
                    </span>
                    <span className="truncate">{item.text}</span>
                  </button>
                ))
              ) : (
                <p className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-[color:rgba(36,31,26,0.56)]">
                  Add headings to build a clickable outline.
                </p>
              )}
            </div>
          </motion.aside>

          <section className="overflow-hidden rounded-[32px] border border-white/60 bg-[color:rgba(255,249,242,0.82)] shadow-[0_30px_90px_rgba(78,57,37,0.12)] backdrop-blur-md">
            <div className="toolbar-scroller border-b border-[color:rgba(36,31,26,0.08)] px-4 py-3">
              <div ref={moreMenuRef} className="relative space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={currentFontFamily}
                    onChange={(event) => editor?.chain().focus().setFontFamily(event.target.value).run()}
                    className="min-w-[132px] rounded-xl border border-[color:rgba(36,31,26,0.08)] bg-white px-3 py-2 text-sm outline-none"
                  >
                    {FONT_FAMILY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={currentFontSize}
                    onChange={(event) => editor?.chain().focus().setFontSize(event.target.value).run()}
                    className="min-w-[78px] rounded-xl border border-[color:rgba(36,31,26,0.08)] bg-white px-3 py-2 text-sm outline-none"
                  >
                    {FONT_SIZE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ToolbarDivider />
                  <ToolbarButton label="Bold" icon={Bold} active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} />
                  <ToolbarButton label="Italic" icon={Italic} active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} />
                  <ToolbarButton label="Underline" icon={UnderlineIcon} active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()} />
                  <ToolbarButton label="Strikethrough" icon={Strikethrough} active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()} />
                  <ToolbarButton label="Link" icon={Link2} active={editor?.isActive("link")} onClick={promptForLink} />
                  <ToolbarDivider />
                  <ToolbarButton label="Heading 1" icon={Heading1} active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} />
                  <ToolbarButton label="Heading 2" icon={Heading2} active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} />
                  {showHeadingThreeInline ? (
                    <ToolbarButton label="Heading 3" icon={Heading3} active={editor?.isActive("heading", { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} />
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <ToolbarButton label="Bullet List" icon={List} active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
                  <ToolbarButton label="Numbered List" icon={ListOrdered} active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
                  <ToolbarButton label="Checklist" icon={ListChecks} active={editor?.isActive("taskList")} onClick={() => editor?.chain().focus().toggleTaskList().run()} />
                  {showAdvancedInline ? (
                    <>
                      <ToolbarButton label="Quote" icon={Quote} active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
                      <ToolbarButton label="Code Block" icon={Code2} active={editor?.isActive("codeBlock")} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} />
                    </>
                  ) : null}
                  {showTableInline ? (
                    <ToolbarButton label="Table" icon={Table2} active={editor?.isActive("table")} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
                  ) : null}
                  <ToolbarDivider />
                  <ToolbarButton label="Align Left" icon={AlignLeft} active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()} />
                  <ToolbarButton label="Align Center" icon={AlignCenter} active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()} />
                  {showAdvancedInline ? (
                    <>
                      <ToolbarButton label="Align Right" icon={AlignRight} active={editor?.isActive({ textAlign: "right" })} onClick={() => editor?.chain().focus().setTextAlign("right").run()} />
                      <ToolbarButton label="Justify" icon={AlignJustify} active={editor?.isActive({ textAlign: "justify" })} onClick={() => editor?.chain().focus().setTextAlign("justify").run()} />
                    </>
                  ) : null}
                  {showColorInline ? (
                    <>
                      <div className="flex items-center gap-1.5 rounded-xl border border-[color:rgba(36,31,26,0.08)] bg-white px-2.5 py-1.5">
                        <Palette className="h-3.5 w-3.5 text-[color:rgba(36,31,26,0.5)]" />
                        <div className="flex gap-1.5">
                          {TEXT_COLOR_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              title={option.label}
                              onClick={() => editor?.chain().focus().setColor(option.value).run()}
                              className={`h-4 w-4 rounded-full border ${
                                currentColor === option.value ? "border-[var(--color-accent)]" : "border-white/60"
                              }`}
                              style={{ backgroundColor: option.value }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-xl border border-[color:rgba(36,31,26,0.08)] bg-white px-2.5 py-1.5">
                        <Highlighter className="h-3.5 w-3.5 text-[color:rgba(36,31,26,0.5)]" />
                        <div className="flex gap-1.5">
                          {HIGHLIGHT_COLOR_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              title={option.label}
                              onClick={() => editor?.chain().focus().toggleHighlight({ color: option.value }).run()}
                              className={`h-4 w-4 rounded-full border ${
                                currentHighlight === option.value ? "border-[var(--color-accent)]" : "border-white/60"
                              }`}
                              style={{ backgroundColor: option.value }}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                  <ToolbarDivider />
                  {showAdvancedInline ? (
                    <>
                      <ToolbarButton label="Upload Image" icon={ImagePlus} onClick={() => imageInputRef.current?.click()} />
                      <ToolbarButton label="Horizontal Rule" icon={Minus} onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
                    </>
                  ) : null}
                  <ToolbarButton label="Undo" icon={Undo2} onClick={() => editor?.chain().focus().undo().run()} />
                  <ToolbarButton label="Redo" icon={Redo2} onClick={() => editor?.chain().focus().redo().run()} />
                  {showOverflowMenu ? (
                    <ToolbarButton
                      label="More tools"
                      icon={MoreHorizontal}
                      active={overflowMenuOpen}
                      onClick={() => setIsMoreOpen((open) => !open)}
                    />
                  ) : null}
                </div>

                {overflowMenuOpen ? (
                  <div className="absolute right-0 top-full z-20 mt-2 w-[260px] rounded-[22px] border border-[color:rgba(36,31,26,0.08)] bg-[color:rgba(255,250,244,0.98)] p-3 shadow-[0_24px_70px_rgba(41,27,15,0.16)] backdrop-blur-md">
                    <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:rgba(36,31,26,0.42)]">
                      More tools
                    </p>
                    {!showHeadingThreeInline ? (
                      <OverflowAction
                        icon={Heading3}
                        label="Heading 3"
                        onClick={() => runOverflowAction(() => editor?.chain().focus().toggleHeading({ level: 3 }).run())}
                      />
                    ) : null}
                    {!showAdvancedInline ? (
                      <>
                        <OverflowAction
                          icon={Quote}
                          label="Quote"
                          onClick={() => runOverflowAction(() => editor?.chain().focus().toggleBlockquote().run())}
                        />
                        <OverflowAction
                          icon={Code2}
                          label="Code Block"
                          onClick={() => runOverflowAction(() => editor?.chain().focus().toggleCodeBlock().run())}
                        />
                        <OverflowAction
                          icon={Table2}
                          label="Insert Table"
                          onClick={() =>
                            runOverflowAction(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())
                          }
                        />
                        <OverflowAction
                          icon={AlignRight}
                          label="Align Right"
                          onClick={() => runOverflowAction(() => editor?.chain().focus().setTextAlign("right").run())}
                        />
                        <OverflowAction
                          icon={AlignJustify}
                          label="Justify"
                          onClick={() => runOverflowAction(() => editor?.chain().focus().setTextAlign("justify").run())}
                        />
                        <OverflowAction
                          icon={ImagePlus}
                          label="Upload Image"
                          onClick={() => runOverflowAction(() => imageInputRef.current?.click())}
                        />
                        <OverflowAction
                          icon={Minus}
                          label="Horizontal Rule"
                          onClick={() => runOverflowAction(() => editor?.chain().focus().setHorizontalRule().run())}
                        />
                      </>
                    ) : null}
                    {!showColorInline ? (
                      <div className="mt-2 space-y-3 rounded-2xl border border-[color:rgba(36,31,26,0.08)] bg-white px-3 py-3">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(36,31,26,0.45)]">Text Color</p>
                          <div className="flex flex-wrap gap-2">
                            {TEXT_COLOR_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                title={option.label}
                                onClick={() => runOverflowAction(() => editor?.chain().focus().setColor(option.value).run())}
                                className={`h-5 w-5 rounded-full border ${
                                  currentColor === option.value ? "border-[var(--color-accent)]" : "border-white/60"
                                }`}
                                style={{ backgroundColor: option.value }}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(36,31,26,0.45)]">Highlight</p>
                          <div className="flex flex-wrap gap-2">
                            {HIGHLIGHT_COLOR_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                title={option.label}
                                onClick={() =>
                                  runOverflowAction(() => editor?.chain().focus().toggleHighlight({ color: option.value }).run())
                                }
                                className={`h-5 w-5 rounded-full border ${
                                  currentHighlight === option.value ? "border-[var(--color-accent)]" : "border-white/60"
                                }`}
                                style={{ backgroundColor: option.value }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex-1 overflow-auto px-4 py-5 md:px-6">
              <div className="mx-auto max-w-[960px]">
                <div className="mb-4 flex items-center justify-between rounded-full border border-[color:rgba(36,31,26,0.08)] bg-white/60 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[color:rgba(36,31,26,0.42)]">
                  <span>{pageCount} {pageCount === 1 ? "Page" : "Pages"}</span>
                  <span>Spellcheck On</span>
                  <span>Press / for Blocks</span>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.12, duration: 0.35 }}
                  className="rounded-[34px] border border-[color:rgba(36,31,26,0.08)] bg-[color:rgba(255,250,244,0.44)] px-4 py-5 shadow-[0_35px_120px_rgba(78,57,37,0.12)] md:px-5 md:py-6"
                >
                  <div className="mb-8 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:rgba(36,31,26,0.38)]">
                    <Type className="h-4 w-4" />
                    Editorial Canvas
                  </div>
                  <EditorContent editor={editor} />
                </motion.div>
              </div>
            </div>
          </section>

          <motion.aside
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18, duration: 0.35 }}
            className="overflow-hidden rounded-[30px] border border-white/60 bg-[color:rgba(255,249,242,0.82)] shadow-[0_25px_80px_rgba(78,57,37,0.1)] backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-[color:rgba(36,31,26,0.08)] px-5 py-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:rgba(36,31,26,0.44)]">Inspect</p>
              <div className="flex gap-2">
                <ShellTab active={inspectorTab === "overview"} onClick={() => setInspectorTab("overview")}>
                  Overview
                </ShellTab>
                <ShellTab active={inspectorTab === "markdown"} onClick={() => setInspectorTab("markdown")}>
                  Markdown
                </ShellTab>
              </div>
            </div>
            <AnimatePresence mode="wait">
              {inspectorTab === "overview" ? (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-5 p-5"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[24px] bg-white px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-[color:rgba(36,31,26,0.42)]">Words</p>
                      <p className="mt-2 text-3xl font-semibold">{stats.words}</p>
                    </div>
                    <div className="rounded-[24px] bg-white px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-[color:rgba(36,31,26,0.42)]">Read Time</p>
                      <p className="mt-2 text-3xl font-semibold">{stats.estimatedMinutes}m</p>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-[24px] bg-white px-4 py-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Headings</span>
                      <span>{stats.headings}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Paragraphs</span>
                      <span>{stats.paragraphs}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tables</span>
                      <span>{stats.tables}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Images</span>
                      <span>{stats.images}</span>
                    </div>
                  </div>
                  <div className="space-y-3 rounded-[24px] bg-white px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-[var(--color-accent)]" />
                      <p className="text-sm font-semibold">Exports</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportDocument("markdown")}
                      className="flex w-full items-center justify-between rounded-2xl border border-[color:rgba(36,31,26,0.08)] px-3 py-3 text-sm transition hover:bg-[color:rgba(36,31,26,0.03)]"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Markdown
                      </span>
                      {exporting === "markdown" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => exportDocument("docx")}
                      className="flex w-full items-center justify-between rounded-2xl border border-[color:rgba(36,31,26,0.08)] px-3 py-3 text-sm transition hover:bg-[color:rgba(36,31,26,0.03)]"
                    >
                      <span className="flex items-center gap-2">
                        <FileOutput className="h-4 w-4" />
                        DOCX
                      </span>
                      {exporting === "docx" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => exportDocument("pdf")}
                      className="flex w-full items-center justify-between rounded-2xl border border-[color:rgba(36,31,26,0.08)] px-3 py-3 text-sm transition hover:bg-[color:rgba(36,31,26,0.03)]"
                    >
                      <span className="flex items-center gap-2">
                        <FileOutput className="h-4 w-4" />
                        PDF
                      </span>
                      {exporting === "pdf" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex w-full items-center gap-2 rounded-2xl border border-[color:rgba(36,31,26,0.08)] px-3 py-3 text-sm transition hover:bg-[color:rgba(36,31,26,0.03)]"
                    >
                      <Printer className="h-4 w-4" />
                      Print Layout
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="markdown"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex h-full flex-col p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Current Markdown</p>
                    <button
                      type="button"
                      onClick={copyMarkdown}
                      className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(36,31,26,0.08)] bg-white px-3 py-1.5 text-sm"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={markdown}
                    className="markdown-panel mt-4 min-h-[520px] flex-1 rounded-[24px] border border-[color:rgba(36,31,26,0.08)] bg-white p-4 text-sm leading-6 outline-none"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </div>
        <footer className="mt-4 flex flex-col gap-2 rounded-[24px] border border-white/60 bg-[color:rgba(255,249,242,0.78)] px-4 py-3 text-sm text-[color:rgba(36,31,26,0.62)] shadow-[0_18px_40px_rgba(78,57,37,0.08)] backdrop-blur-md md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:rgba(189,104,46,0.12)] text-[var(--color-accent)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>{status}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.2em] text-[color:rgba(36,31,26,0.44)]">
            <span>{formatRelativeTime(documentState.updatedAt, now)}</span>
            <span>Cmd/Ctrl+S Save</span>
            <span>Cmd/Ctrl+P Print</span>
          </div>
        </footer>
        <input
          id={imageInputId}
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            void insertImages(files);
            event.currentTarget.value = "";
          }}
        />
      </motion.div>
    </div>
  );
}
