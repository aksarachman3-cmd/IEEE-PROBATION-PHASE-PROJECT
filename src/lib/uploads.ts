import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { acceptedImageLabel, imageExtensionFor } from "@/lib/image-types";
import { AppError, validationError } from "@/lib/errors";

/**
 * Cover-image storage.
 *
 * Uploads are written to `public/uploads`, which keeps serving them a
 * non-issue (static files, cacheable, and `next/image` can optimise them).
 * The trade-off is that it needs a writable filesystem — fine for the Node
 * server this targets, but it would need object storage (S3/R2) to run on a
 * read-only serverless host. That is called out in the README.
 *
 * Three safety rules, in order of how much they matter:
 *  1. The stored filename is *generated*, never taken from the upload, so a
 *     crafted `name` cannot traverse out of the upload directory or overwrite
 *     an existing file.
 *  2. The declared MIME type is checked against an allow-list, and the
 *     extension is derived from that list — not from user input.
 *  3. The bytes are checked against the file signature, so a `.png` that is
 *     really an HTML document or a script is rejected regardless of what the
 *     client claimed in its headers.
 *
 * Rule 3 is what makes the other two sufficient. MIME types come from the
 * client and are trivially forged; the magic bytes at the start of the buffer
 * are a property of the data itself.
 */

const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? "./public/uploads");

/**
 * Leading byte signatures, per accepted type.
 *
 * Only the prefix that uniquely identifies the format is listed. All three
 * formats are validated with this single check rather than pulling in a
 * dependency for a few bytes of comparison.
 */
const SIGNATURES: { mime: string; bytes: number[] }[] = [
  // PNG: \x89 P N G \x0D \x0A \x1A \x0A
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // JPEG: \xFF \xD8 \xFF
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  // WebP: "RIFF" .... "WEBP"
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  // AVIF: .... "ftyp" then a brand such as "avif"/"avis".
  { mime: "image/avif", bytes: [0x00, 0x00, 0x00, 0x20] },
];

const AVIF_BRANDS = new Set([0x61, 0x76, 0x69, 0x66, 0x61, 0x76, 0x69, 0x73]); // "avif"/"avis"

export interface StoredImage {
  /** Public URL path, e.g. `/uploads/ab12cd34ef56.png`. */
  url: string;
  /** Absolute path on disk, so a replaced image can be cleaned up. */
  filename: string;
}

/** True when `buffer` starts with the signature for its declared type. */
function matchesSignature(buffer: Buffer, mime: string): boolean {
  if (mime === "image/avif") {
    // `ftyp` sits at offset 4 for the normal box layout.
    if (buffer.length < 12) return false;
    if (buffer.toString("latin1", 4, 8) !== "ftyp") return false;
    return AVIF_BRANDS.has(buffer.readUInt8(8)) && AVIF_BRANDS.has(buffer.readUInt8(9));
  }

  const signature = SIGNATURES.find((entry) => entry.mime === mime);
  if (!signature || buffer.length < signature.bytes.length) return false;

  return signature.bytes.every((byte, index) => buffer[index] === byte);
}

/**
 * Validate and persist an uploaded image.
 *
 * @throws AppError("VALIDATION_ERROR") when the type, size or content is
 *   unacceptable.
 */
export async function saveEventImage(file: File): Promise<StoredImage> {
  const extension = imageExtensionFor(file.type);

  if (!extension) {
    throw validationError(
      `Unsupported image type: ${file.type || "unknown"}.`,
      { image: [`Upload a ${acceptedImageLabel()} file.`] },
    );
  }

  // Reject on size before reading the body, so an oversized upload never gets
  // buffered into memory.
  if (file.size > MAX_UPLOAD_BYTES) {
    throw validationError(
      `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
      { image: ["Choose a smaller image."] },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length === 0) {
    throw validationError("The uploaded file is empty.", { image: ["Choose a different file."] });
  }

  // The client's `Content-Type` header is attacker-controlled, so confirm the
  // bytes actually are the image type it claims to be.
  if (!matchesSignature(buffer, file.type)) {
    throw validationError("The file contents do not match the declared image type.", {
      image: [`Upload a genuine ${acceptedImageLabel()} file.`],
    });
  }

  // Filename is generated, never derived from `file.name`, so a crafted name
  // cannot traverse out of the upload directory or clobber an existing file.
  const name = `${randomBytes(16).toString("hex")}${extension}`;
  const target = join(UPLOAD_DIR, name);

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(target, buffer);

  return { url: `/uploads/${name}`, filename: target };
}

/** Matches the generated filename shape — 32 hex chars plus a known extension. */
const GENERATED_NAME = /^[a-f0-9]{32}\.(jpg|png|webp|avif)$/;

/** Best-effort removal of a previously stored upload. */
export async function deleteStoredImage(url: string | null): Promise<void> {
  if (!url || !url.startsWith("/uploads/")) return;

  const name = url.slice("/uploads/".length);
  // Refuse anything that is not a bare generated filename.
  if (!GENERATED_NAME.test(name)) return;

  try {
    await unlink(join(UPLOAD_DIR, name));
  } catch {
    // Already gone, or the directory was reset. Not worth surfacing.
  }
}

/**
 * Remove a file, but report a failure.
 *
 * `deleteStoredImage` is deliberately silent because it runs on cleanup paths
 * where an error is cosmetic. This variant is for the API, where a caller
 * asked for the image to be gone and deserves to know if it was not.
 */
export async function removeStoredImage(url: string): Promise<void> {
  if (!GENERATED_NAME.test(url.slice("/uploads/".length))) {
    throw new AppError("VALIDATION_ERROR", "That is not a managed upload path.");
  }

  try {
    await unlink(join(UPLOAD_DIR, url.slice("/uploads/".length)));
  } catch {
    throw new AppError("NOT_FOUND", "That image is no longer on the server.");
  }
}
