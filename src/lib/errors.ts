/**
 * A single, transport-agnostic error type.
 *
 * Every layer (service → server action → API route) throws `AppError` for
 * expected failures. Unexpected exceptions are caught at the boundary and
 * mapped to `INTERNAL_ERROR`, so raw stack traces and SQL messages never reach
 * the browser.
 */

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  INTERNAL_ERROR: 500,
};

/**
 * HTTP status for an error code.
 *
 * Exported so every transport (REST, Server Action) derives its status from one
 * table instead of re-deriving it — that drift is how a 403 ends up returning
 * 500 and clients retry it as if it were a server fault.
 */
export function statusForCode(code: ErrorCode): number {
  return STATUS_BY_CODE[code];
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Per-field messages for `VALIDATION_ERROR`, otherwise omitted. */
  readonly details?: Record<string, string[]>;

  constructor(code: ErrorCode, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export const notFound = (what = "Resource") => new AppError("NOT_FOUND", `${what} not found.`);
export const unauthenticated = (message = "You must sign in to continue.") =>
  new AppError("UNAUTHENTICATED", message);
export const forbidden = (message = "You do not have access to this resource.") =>
  new AppError("FORBIDDEN", message);
export const validationError = (message: string, details?: Record<string, string[]>) =>
  new AppError("VALIDATION_ERROR", message, details);
export const conflict = (message: string) => new AppError("CONFLICT", message);

/** Narrow an unknown thrown value into a printable message. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong.";
}
