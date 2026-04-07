import type { JSONContent } from "@tiptap/core";

import { createStoredDocument } from "@/lib/editor/templates";
import { STORAGE_KEY, type StoredDocument } from "@/lib/editor/types";

export function cloneContent(content: JSONContent): JSONContent {
  return JSON.parse(JSON.stringify(content)) as JSONContent;
}

export function sanitizeFileName(value: string, extension: string) {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${base || "document"}.${extension}`;
}

export function formatRelativeTime(timestamp: string, now = Date.now()) {
  const deltaSeconds = Math.round((new Date(timestamp).getTime() - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const divisions: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unit, size] of divisions) {
    if (Math.abs(deltaSeconds) >= size) {
      return formatter.format(Math.round(deltaSeconds / size), unit);
    }
  }

  return formatter.format(deltaSeconds, "second");
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read file."));
    };

    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

export function downloadBlob(fileName: string, blob: Blob) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  window.URL.revokeObjectURL(url);
}

export function loadStoredDocument(): StoredDocument {
  if (typeof window === "undefined") {
    return createStoredDocument();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return createStoredDocument();
    }

    const parsed = JSON.parse(raw) as Partial<StoredDocument>;

    if (
      typeof parsed.title !== "string" ||
      !parsed.content ||
      typeof parsed.templateId !== "string" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return createStoredDocument();
    }

    return {
      title: parsed.title,
      content: cloneContent(parsed.content),
      templateId: parsed.templateId,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return createStoredDocument();
  }
}

export function persistStoredDocument(document: StoredDocument) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
}
