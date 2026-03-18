export class GetApplicationStatusUseCase {
  constructor({ webhookRegistrationStore, webhookUrl, uptimeProvider }) {
    this.webhookRegistrationStore = webhookRegistrationStore;
    this.webhookUrl = webhookUrl;
    this.uptimeProvider = uptimeProvider;
  }

  async execute() {
    const registration = await this.webhookRegistrationStore.get();

    return {
      status: "ok",
      uptime: this.uptimeProvider(),
      webhookUrl: this.webhookUrl,
      webhookRegistration: registration,
    };
  }
}
