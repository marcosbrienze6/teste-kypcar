import test from "node:test";
import assert from "node:assert/strict";
import { KypcarGateway } from "../../src/infra/kypcar/KypcarGateway.js";
import { HttpRequestError } from "../../src/infra/http/FetchHttpClient.js";
import { ReservationConflictError } from "../../src/domain/errors/ReservationConflictError.js";

function createLogger() {
  return {
    info() {},
    warn() {},
    error() {},
  };
}

test("KypcarGateway remaps post-refresh conflicts after an initial 401", async () => {
  let calls = 0;

  const gateway = new KypcarGateway({
    httpClient: {
      async requestJson() {
        calls += 1;

        if (calls === 1) {
          throw new HttpRequestError("unauthorized", {
            status: 401,
            body: { error: { message: "token expired" } },
            url: "https://dev.api.kypcar.com/v1/exam/reservations/",
          });
        }

        throw new HttpRequestError("conflict", {
          status: 400,
          body: { error: { message: "reservation overlaps with an existing confirmed reservation" } },
          url: "https://dev.api.kypcar.com/v1/exam/reservations/",
        });
      },
    },
    authManager: {
      async getAccessToken() {
        return "token";
      },
      async refresh() {
        return undefined;
      },
    },
    logger: createLogger(),
    baseUrl: "https://dev.api.kypcar.com/v1/exam",
    userAgent: "Kypcar",
  });

  await assert.rejects(
    gateway.createReservation({
      vehicleId: "vehicle-1",
      startDate: "2026-03-20",
      endDate: "2026-03-21",
    }),
    ReservationConflictError,
  );
});
