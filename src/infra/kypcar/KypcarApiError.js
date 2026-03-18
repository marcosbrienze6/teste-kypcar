import { ApplicationError } from "../../domain/errors/ApplicationError.js";
import { ReservationConflictError } from "../../domain/errors/ReservationConflictError.js";
import { HttpRequestError } from "../http/FetchHttpClient.js";

export class KypcarApiError extends ApplicationError {
  constructor(message, details = {}) {
    super(message, {
      code: details.code || "KYP_CAR_API_ERROR",
      statusCode: details.statusCode || 502,
      metadata: details.metadata || {},
    });
    this.name = "KypcarApiError";
  }
}

export function mapKypcarError(error) {
  if (!(error instanceof HttpRequestError)) {
    return error;
  }

  const apiMessage = error.body?.error?.message || error.body?.message || error.message;

  if (error.status === 400 && typeof apiMessage === "string" && apiMessage.toLowerCase().includes("overlaps")) {
    return new ReservationConflictError(apiMessage, {
      upstreamStatus: error.status,
      upstreamBody: error.body,
    });
  }

  return new KypcarApiError(apiMessage, {
    statusCode: error.status || 502,
    metadata: {
      upstreamStatus: error.status,
      upstreamBody: error.body,
      upstreamUrl: error.url,
    },
  });
}
