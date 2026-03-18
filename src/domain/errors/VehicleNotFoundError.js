import { ApplicationError } from "./ApplicationError.js";

export class VehicleNotFoundError extends ApplicationError {
  constructor(plate) {
    super(`Vehicle not found for plate ${plate}`, {
      code: "VEHICLE_NOT_FOUND",
      statusCode: 404,
      metadata: { plate },
    });
    this.name = "VehicleNotFoundError";
  }
}
