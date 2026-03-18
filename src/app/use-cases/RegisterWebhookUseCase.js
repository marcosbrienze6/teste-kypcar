export class RegisterWebhookUseCase {
  constructor({ webhookRegistrationStore, kypcarGateway, logger, webhookUrl }) {
    this.webhookRegistrationStore = webhookRegistrationStore;
    this.kypcarGateway = kypcarGateway;
    this.logger = logger;
    this.webhookUrl = webhookUrl;
  }

  async execute() {
    const remoteWebhooks = await this.kypcarGateway.listWebhooks();
    const existing = remoteWebhooks.find((item) => item.url === this.webhookUrl);

    if (existing) {
      await this.webhookRegistrationStore.save(existing);
      this.logger.info("Webhook already registered", {
        webhook_id: existing.id,
        webhook_url: this.webhookUrl,
      });
      return existing;
    }

    const registration = await this.kypcarGateway.registerWebhook(this.webhookUrl);
    await this.webhookRegistrationStore.save(registration);

    this.logger.info("Webhook registered", {
      webhook_id: registration.id,
      webhook_url: this.webhookUrl,
    });

    return registration;
  }
}
