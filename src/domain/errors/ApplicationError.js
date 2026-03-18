export class ApplicationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ApplicationError";
    this.code = details.code || "APPLICATION_ERROR";
    this.statusCode = details.statusCode || 500;
    this.metadata = details.metadata || {};
  }
}
