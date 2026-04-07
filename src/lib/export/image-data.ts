import { imageSize } from "image-size";

export interface EmbeddedImage {
  data: Buffer;
  width: number;
  height: number;
  type: "png" | "jpg" | "gif" | "bmp";
}

export function isDataUrl(value: string) {
  return value.startsWith("data:image/");
}

export function parseFontSize(value?: string, fallback = 12) {
  if (!value) {
    return fallback;
  }

  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export async function getEmbeddedImage(src: string): Promise<EmbeddedImage | null> {
  if (!isDataUrl(src)) {
    return null;
  }

  const [header, payload] = src.split(",", 2);

  if (!header || !payload) {
    return null;
  }

  const isBase64 = /;base64$/i.test(header);
  const data = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
  const dimensions = imageSize(data);
  const mime = header.match(/^data:(image\/[a-zA-Z0-9+.-]+);/i)?.[1] ?? "image/png";
  const type = mime.includes("jpeg")
    ? "jpg"
    : mime.includes("png")
      ? "png"
      : mime.includes("gif")
        ? "gif"
        : "bmp";

  return {
    data,
    width: dimensions.width ?? 1200,
    height: dimensions.height ?? 675,
    type,
  };
}
