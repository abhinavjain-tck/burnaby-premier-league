/**
 * Browser-only: shrink a photo before upload using a canvas (no dependency).
 * Longest side capped at maxSide, WebP around targetBytes.
 * Safari cannot encode WebP from a canvas (it quietly returns PNG), so we fall back to JPEG there.
 */
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process that image."))), type, quality),
  );
}

export async function compressImage(file: Blob, maxSide = 1024, targetBytes = 200_000): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file); // respects EXIF rotation in current browsers
  } catch {
    throw new Error("Couldn't read that image. Try a JPG or PNG.");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't resize photos.");
  ctx.fillStyle = "#ffffff"; // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.85;
  let blob = await encode(canvas, "image/webp", quality);
  const type = blob.type === "image/webp" ? "image/webp" : "image/jpeg";
  if (type !== blob.type) blob = await encode(canvas, type, quality);
  while (blob.size > targetBytes && quality > 0.45) {
    quality -= 0.1;
    blob = await encode(canvas, type, quality);
  }
  return blob;
}
