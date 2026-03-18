import crypto from "node:crypto";
import { readJsonBody, sendJson } from "../json.js";

export class ReceiveWebhookController {
  constructor({ receiveWebhookUseCase, logger }) {
    this.receiveWebhookUseCase = receiveWebhookUseCase;
    this.logger = logger;
  }

  async handle(req, res) {
    const payload = await readJsonBody(req);
    const correlationId = req.headers["x-correlation-id"] || crypto.randomUUID();

    // The webhook should acknowledge receipt quickly; the heavy work happens in
    // the background processor started by the use case.
    this.logger.info("Webhook HTTP request received", {
      correlation_id: correlationId,
      payload,
    });

    const event = await this.receiveWebhookUseCase.execute({
      payload,
      correlationId,
    });

    return sendJson(res, 202, {
      received: true,
      eventId: event.id,
      correlationId,
      statusUrl: `/api/events/${event.id}`,
    });
  }
}
