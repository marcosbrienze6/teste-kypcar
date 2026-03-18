import test from "node:test";
import assert from "node:assert/strict";
import { ProcessWebhookUseCase } from "../../src/app/use-cases/ProcessWebhookUseCase.js";
import { ReservationWindowPolicy } from "../../src/app/services/ReservationWindowPolicy.js";
import { ReservationConflictError } from "../../src/domain/errors/ReservationConflictError.js";
import { InMemoryEventStore } from "../../src/infra/persistence/InMemoryEventStore.js";

function createLogger() {
  return {
    info() {},
    warn() {},
    error() {},
  };
}

test("ProcessWebhookUseCase completes vehicle lookup and reservation", async () => {
  const eventStore = new InMemoryEventStore();
  const calls = [];
  const gateway = {
    async findVehicleByPlate(plate) {
      calls.push(["findVehicleByPlate", plate]);
      return { id: "vehicle-1", plate };
    },
    async createReservation(payload) {
      calls.push(["createReservation", payload]);
      return { id: "reservation-1", ...payload };
    },
    isReservationConflict() {
      return false;
    },
  };

  const useCase = new ProcessWebhookUseCase({
    eventStore,
    kypcarGateway: gateway,
    reservationWindowPolicy: new ReservationWindowPolicy({
      startOffsetDays: 1,
      durationDays: 1,
      maxAttempts: 5,
    }),
    logger: createLogger(),
    now: () => new Date("2026-03-18T00:00:00Z"),
  });

  const event = {
    id: "event-1",
    correlationId: "corr-1",
    payload: { plate: "bra2e19" },
    status: "received",
  };

  await eventStore.save(event);
  const result = await useCase.execute({ event });

  assert.equal(result.status, "completed");
  assert.equal(result.plate, "BRA2E19");
  assert.equal(result.vehicle.id, "vehicle-1");
  assert.equal(result.reservation.id, "reservation-1");
  assert.equal(result.reservationWindow.startDate, "2026-03-19");
  assert.deepEqual(calls[0], ["findVehicleByPlate", "BRA2E19"]);
});

test("ProcessWebhookUseCase retries reservation with next dates on conflict", async () => {
  const eventStore = new InMemoryEventStore();
  const windows = [];
  const gateway = {
    async findVehicleByPlate(plate) {
      return { id: "vehicle-2", plate };
    },
    async createReservation(payload) {
      windows.push(payload);
      if (windows.length < 3) {
        throw new ReservationConflictError();
      }

      return { id: "reservation-2", ...payload };
    },
    isReservationConflict(error) {
      return error instanceof ReservationConflictError;
    },
  };

  const useCase = new ProcessWebhookUseCase({
    eventStore,
    kypcarGateway: gateway,
    reservationWindowPolicy: new ReservationWindowPolicy({
      startOffsetDays: 1,
      durationDays: 1,
      maxAttempts: 5,
    }),
    logger: createLogger(),
    now: () => new Date("2026-03-18T00:00:00Z"),
  });

  const event = {
    id: "event-2",
    correlationId: "corr-2",
    payload: { plate: "bra2e19" },
    status: "received",
  };

  await eventStore.save(event);
  const result = await useCase.execute({ event });

  assert.equal(result.status, "completed");
  assert.equal(windows.length, 3);
  assert.equal(windows[0].startDate, "2026-03-19");
  assert.equal(windows[1].startDate, "2026-03-20");
  assert.equal(windows[2].startDate, "2026-03-21");
});
