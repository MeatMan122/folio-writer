import type { JSONContent } from "@tiptap/core";
import { NextResponse } from "next/server";

import { createDocxBuffer } from "@/lib/export/docx";
import { sanitizeFileName } from "@/lib/editor/utils";

export const runtime = "nodejs";

function isJsonContent(value: unknown): value is JSONContent {
  return Boolean(value) && typeof value === "object";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { title?: unknown; content?: unknown } | null;

  if (!body || typeof body.title !== "string" || !isJsonContent(body.content)) {
    return NextResponse.json({ error: "Invalid export payload." }, { status: 400 });
  }

  const buffer = await createDocxBuffer(body.title, body.content);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${sanitizeFileName(body.title, "docx")}"`,
    },
  });
}
