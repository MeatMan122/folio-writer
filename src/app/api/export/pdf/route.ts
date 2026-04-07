import type { JSONContent } from "@tiptap/core";
import { NextResponse } from "next/server";

import { sanitizeFileName } from "@/lib/editor/utils";
import { createPdfBuffer } from "@/lib/export/pdf-document";

export const runtime = "nodejs";

function isJsonContent(value: unknown): value is JSONContent {
  return Boolean(value) && typeof value === "object";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { title?: unknown; content?: unknown } | null;

  if (!body || typeof body.title !== "string" || !isJsonContent(body.content)) {
    return NextResponse.json({ error: "Invalid export payload." }, { status: 400 });
  }

  const buffer = await createPdfBuffer(body.title, body.content);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${sanitizeFileName(body.title, "pdf")}"`,
    },
  });
}
