import crypto from "node:crypto";
import { createProcessingEvent } from "../../domain/entities/ProcessingEvent.js";

export class ReceiveWebhookUseCase {
  constructor({ eventStore, backgroundWebhookProcessor, logger }) {
    this.eventStore = eventStore;
    this.backgroundWebhookProcessor = backgroundWebhookProcessor;
    this.logger = logger;
  }

  async execute({ payload, correlationId = crypto.randomUUID() }) {
    const event = createProcessingEvent({
      payload,
      correlationId,
    });

    await this.eventStore.save(event);
    await this.backgroundWebhookProcessor.enqueue(event);

    this.logger.info("Webhook accepted", {
      correlation_id: correlationId,
      event_id: event.id,
    });

    return event;
  }
}
