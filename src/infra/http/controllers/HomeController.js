import { sendJson } from "../json.js";

export class HomeController {
  async handle(_req, res) {
    return sendJson(res, 200, {
      service: "kypcar-exam-backend",
      status: "ok",
      health: "/health",
      status_endpoint: "/api/status",
      webhook_endpoint: "/api/webhooks/kypcar",
    });
  }
}
