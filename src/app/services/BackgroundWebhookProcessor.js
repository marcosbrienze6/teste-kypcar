export class BackgroundWebhookProcessor {
  constructor({ queue, processWebhookUseCase, logger }) {
    this.queue = queue;
    this.processWebhookUseCase = processWebhookUseCase;
    this.logger = logger;
  }

  async enqueue(event) {
    await this.queue.enqueue(async () => {
      await this.processWebhookUseCase.execute({ event });
    });

    this.logger.info("Webhook job enqueued", {
      correlation_id: event.correlationId,
      event_id: event.id,
    });
  }
}
