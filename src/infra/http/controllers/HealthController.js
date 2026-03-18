import { sendJson } from "../json.js";

export class HealthController {
  async handle(_req, res) {
    return sendJson(res, 200, { status: "ok" });
  }
}
