/**
 * Accepted upload image types — the single source of truth.
 *
 * This module is deliberately free of `server-only` and Node built-ins so the
 * browser form (`accept` attribute) and the server-side validator read the exact
 * same list. Keeping the two in sync is not cosmetic: a type listed in the
 * picker but rejected on save is the kind of bug that only shows up during a
 * demo, and one accepted by the server but absent from the picker is worse.
 *
 * The extension is derived here, never from `file.name`, so a crafted upload
 * name cannot influence what lands on disk.
 */

export const IMAGE_TYPE_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
} as const satisfies Record<string, string>;

export type AcceptedImageType = keyof typeof IMAGE_TYPE_EXTENSIONS;

/** MIME types a cover image may use. */
export const ACCEPTED_IMAGE_TYPES = Object.keys(IMAGE_TYPE_EXTENSIONS) as AcceptedImageType[];

/** Value for the file input's `accept` attribute, built from the list above. */
export const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");

/**
 * File extension for a MIME type, or `undefined` when the type is not allowed.
 * The allow-list is the map's own keys, so the two cannot drift.
 *
 * `Object.hasOwn` rather than a plain index: a bare `map[type]` also resolves
 * inherited `Object.prototype` members, so a client sending
 * `Content-Type: constructor` would get a truthy value and slip past the
 * allow-list entirely.
 */
export function imageExtensionFor(type: string): string | undefined {
  if (!Object.hasOwn(IMAGE_TYPE_EXTENSIONS, type)) return undefined;
  return (IMAGE_TYPE_EXTENSIONS as Record<string, string>)[type];
}

/** Human-readable list for error messages and form hints. */
export function acceptedImageLabel(): string {
  const names = ACCEPTED_IMAGE_TYPES.map((type) => type.replace("image/", "").toUpperCase());
  const last = names.pop();
  return names.length ? `${names.join(", ")} or ${last}` : (last ?? "");
}
