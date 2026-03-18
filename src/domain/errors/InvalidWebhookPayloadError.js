import { ApplicationError } from "./ApplicationError.js";

export class InvalidWebhookPayloadError extends ApplicationError {
  constructor(message = "Webhook payload does not contain a valid vehicle plate", metadata = {}) {
    super(message, {
      code: "INVALID_WEBHOOK_PAYLOAD",
      statusCode: 400,
      metadata,
    });
    this.name = "InvalidWebhookPayloadError";
  }
}
