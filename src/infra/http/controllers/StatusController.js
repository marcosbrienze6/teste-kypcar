import { sendJson } from "../json.js";

export class StatusController {
  constructor({ getApplicationStatusUseCase }) {
    this.getApplicationStatusUseCase = getApplicationStatusUseCase;
  }

  async handle(_req, res) {
    const status = await this.getApplicationStatusUseCase.execute();
    return sendJson(res, 200, status);
  }
}
