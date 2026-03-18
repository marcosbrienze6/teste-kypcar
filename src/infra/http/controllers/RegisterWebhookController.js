import { sendJson } from "../json.js";

export class RegisterWebhookController {
  constructor({ registerWebhookUseCase }) {
    this.registerWebhookUseCase = registerWebhookUseCase;
  }

  async handle(_req, res) {
    const registration = await this.registerWebhookUseCase.execute();
    return sendJson(res, 200, {
      registered: true,
      registration,
    });
  }
}
