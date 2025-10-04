export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function getHttpErrorPayload(
  error: unknown
): { status: number; message: string } | null {
  if (error instanceof HttpError) {
    return { status: error.status, message: error.message };
  }

  if (error && typeof error === 'object') {
    const maybeStatus = (error as { status?: unknown }).status;
    const maybeMessage = (error as { message?: unknown }).message;

    if (
      typeof maybeStatus === 'number' &&
      Number.isFinite(maybeStatus) &&
      typeof maybeMessage === 'string' &&
      maybeMessage.length > 0
    ) {
      return { status: maybeStatus, message: maybeMessage };
    }
  }

  return null;
}
