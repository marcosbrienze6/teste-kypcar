import { sendJson } from "../json.js";

export class GetEventStatusController {
  constructor({ getEventStatusUseCase }) {
    this.getEventStatusUseCase = getEventStatusUseCase;
  }

  async handle(_req, res, params) {
    const event = await this.getEventStatusUseCase.execute({
      eventId: params.eventId,
    });

    if (!event) {
      return sendJson(res, 404, {
        error: "Event not found",
      });
    }

    return sendJson(res, 200, event);
  }
}
