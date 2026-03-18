import { EventStatus } from "../../domain/entities/EventStatus.js";
import { InvalidWebhookPayloadError } from "../../domain/errors/InvalidWebhookPayloadError.js";
import { VehicleNotFoundError } from "../../domain/errors/VehicleNotFoundError.js";
import { extractPlateFromWebhook } from "../../domain/services/extractPlateFromWebhook.js";

export class ProcessWebhookUseCase {
  constructor({ eventStore, kypcarGateway, reservationWindowPolicy, logger, now = () => new Date() }) {
    this.eventStore = eventStore;
    this.kypcarGateway = kypcarGateway;
    this.reservationWindowPolicy = reservationWindowPolicy;
    this.logger = logger;
    this.now = now;
  }

  async execute({ event }) {
    const correlationId = event.correlationId;
    const plate = extractPlateFromWebhook(event.payload);

    if (!plate) {
      throw await this.#fail(event.id, correlationId, new InvalidWebhookPayloadError());
    }

    await this.eventStore.update(event.id, {
      status: EventStatus.PROCESSING,
      plate,
      startedAt: this.now().toISOString(),
    });

    this.logger.info("Webhook processing started", {
      correlation_id: correlationId,
      event_id: event.id,
      plate,
    });

    try {
      const vehicle = await this.kypcarGateway.findVehicleByPlate(plate, {
        correlation_id: correlationId,
        plate,
      });

      if (!vehicle) {
        throw new VehicleNotFoundError(plate);
      }

      const { reservation, reservationWindow, attempts } = await this.#createReservationWithFallback({
        vehicleId: vehicle.id,
        correlationId,
        plate,
      });

      const completedEvent = await this.eventStore.update(event.id, {
        status: EventStatus.COMPLETED,
        plate,
        vehicle,
        reservation,
        reservationWindow,
        reservationAttempts: attempts,
        completedAt: this.now().toISOString(),
      });

      this.logger.info("Webhook processed successfully", {
        correlation_id: correlationId,
        event_id: event.id,
        plate,
        vehicle_id: vehicle.id,
        reservation_id: reservation.id,
        reservation_attempts: attempts,
      });

      return completedEvent;
    } catch (error) {
      throw await this.#fail(event.id, correlationId, error, { plate });
    }
  }

  async #createReservationWithFallback({ vehicleId, correlationId, plate }) {
    const baseDate = this.now();
    let lastError;

    for (let attempt = 0; attempt < this.reservationWindowPolicy.maxAttempts; attempt += 1) {
      // We advance the window deterministically so a transient overlap does not
      // fail the whole webhook when the next available day would be acceptable.
      const reservationWindow = this.reservationWindowPolicy.buildWindow(baseDate, attempt);

      try {
        const reservation = await this.kypcarGateway.createReservation(
          {
            vehicleId,
            startDate: reservationWindow.startDate,
            endDate: reservationWindow.endDate,
          },
          {
            correlation_id: correlationId,
            plate,
            vehicle_id: vehicleId,
            reservation_window: reservationWindow,
          },
        );

        return {
          reservation,
          reservationWindow,
          attempts: attempt + 1,
        };
      } catch (error) {
        lastError = error;

        if (!this.kypcarGateway.isReservationConflict(error) || attempt === this.reservationWindowPolicy.maxAttempts - 1) {
          throw error;
        }

        this.logger.warn("Reservation window unavailable, retrying with next slot", {
          correlation_id: correlationId,
          plate,
          vehicle_id: vehicleId,
          reservation_window: reservationWindow,
          attempt: attempt + 1,
        });
      }
    }

    throw lastError;
  }

  async #fail(eventId, correlationId, error, extra = {}) {
    await this.eventStore.update(eventId, {
      status: EventStatus.FAILED,
      failedAt: this.now().toISOString(),
      error: error.message,
      errorCode: error.code,
      errorDetails: error.metadata,
      ...extra,
    });

    this.logger.error("Webhook processing failed", {
      correlation_id: correlationId,
      event_id: eventId,
      ...extra,
      error,
    });

    return error;
  }
}
