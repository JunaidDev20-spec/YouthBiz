/**
 * HttpError — thrown by service modules to signal an HTTP-level error.
 * The Express error handler in app.ts catches these and formats the response.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function notFound(message = "Not found"): HttpError {
  return new HttpError(404, message);
}

export function forbidden(message = "Forbidden"): HttpError {
  return new HttpError(403, message);
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, message);
}

export function conflict(message: string): HttpError {
  return new HttpError(409, message);
}
