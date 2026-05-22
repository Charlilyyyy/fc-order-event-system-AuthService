declare namespace API {
  /** Shared JSON body shape (matches Express `res.json(...)`). */
  interface ResponseBody<T = unknown> {
    data?: T;
    message?: string;
    error?: string | null;
  }

  /** Success — `data` required, no error. */
  interface SuccessResponse<T> extends ResponseBody<T> {
    data: T;
    error: null;
    status: 200;
  }

  /** Created — e.g. signup. */
  interface CreatedResponse<T> extends ResponseBody<T> {
    data: T;
    error: null;
    status: 201;
  }

  /** Error — `error` required, no data. */
  interface ErrorResponse extends ResponseBody<null> {
    data?: null;
    error: string;
    status: 400 | 401 | 403 | 404 | 409 | 429 | 500;
  }
}
