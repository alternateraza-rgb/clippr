/**
 * Pulls something readable out of a thrown Whop error.
 *
 * The SDK throws WhopError with the status code and the parsed response body
 * attached; the default `message` is often just "Status code: 400", which says
 * nothing about which field the API objected to.
 */
export function describeWhopError(error: unknown): {
  message: string;
  statusCode?: number;
  detail?: unknown;
} {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const err = error as {
    message?: string;
    statusCode?: number;
    body?: unknown;
    requestId?: string;
  };

  const body = err.body;
  let fromBody: string | undefined;
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const candidate = record.error ?? record.message ?? record.detail;
    if (typeof candidate === "string") fromBody = candidate;
    else if (candidate && typeof candidate === "object") {
      const nested = (candidate as Record<string, unknown>).message;
      if (typeof nested === "string") fromBody = nested;
    }
  } else if (typeof body === "string") {
    fromBody = body;
  }

  return {
    message: fromBody || err.message || "Unknown error from Whop",
    statusCode: err.statusCode,
    detail: body,
  };
}
