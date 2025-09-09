export default class AppError extends Error {
  public statusCode: number;
  public data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.statusCode = statusCode;

    if (data && process.env.NODE_ENV === "development") {
      this.data = data;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}
