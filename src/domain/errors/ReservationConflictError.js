import { ApplicationError } from "./ApplicationError.js";

export class ReservationConflictError extends ApplicationError {
  constructor(message = "Reservation conflicts with an existing booking", metadata = {}) {
    super(message, {
      code: "RESERVATION_CONFLICT",
      statusCode: 409,
      metadata,
    });
    this.name = "ReservationConflictError";
  }
}
