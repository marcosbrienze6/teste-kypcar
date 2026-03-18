import { ReservationConflictError } from "../../domain/errors/ReservationConflictError.js";
import { mapKypcarError } from "./KypcarApiError.js";

export class KypcarGateway {
  constructor({ httpClient, authManager, logger, baseUrl, userAgent }) {
    this.httpClient = httpClient;
    this.authManager = authManager;
    this.logger = logger;
    this.baseUrl = baseUrl;
    this.userAgent = userAgent;
  }

  async listWebhooks(context = {}) {
    const body = await this.#authorizedRequest({
      path: "/webhooks/",
      method: "GET",
      context: {
        ...context,
        integration: "kypcar_list_webhooks",
      },
    });

    return Array.isArray(body) ? body : body?.items || body?.data || [];
  }

  async registerWebhook(url, context = {}) {
    return this.#authorizedRequest({
      path: "/webhooks/",
      method: "POST",
      body: {
        url,
      },
      context: {
        ...context,
        integration: "kypcar_register_webhook",
      },
    });
  }

  async findVehicleByPlate(plate, context = {}) {
    const body = await this.#authorizedRequest({
      path: `/vehicles/?plate=${encodeURIComponent(plate)}`,
      method: "GET",
      context: {
        ...context,
        integration: "kypcar_find_vehicle_by_plate",
      },
    });

    const items = body?.items || body?.data || [];
    return items[0] || null;
  }

  async createReservation({ vehicleId, startDate, endDate }, context = {}) {
    return this.#authorizedRequest({
      path: "/reservations/",
      method: "POST",
      body: {
        vehicle_id: vehicleId,
        start_date: startDate,
        end_date: endDate,
      },
      context: {
        ...context,
        integration: "kypcar_create_reservation",
      },
    });
  }

  isReservationConflict(error) {
    return error instanceof ReservationConflictError;
  }

  async #authorizedRequest({ path, method, body, context }) {
    const execute = async () => {
      const accessToken = await this.authManager.getAccessToken(context);

      return this.httpClient.requestJson({
        url: `${this.baseUrl}${path}`,
        method,
        headers: {
          ...this.#jsonHeaders(),
          Authorization: `Bearer ${accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        context,
      });
    };

    try {
      return await this.#executeWithMappedErrors(execute);
    } catch (error) {
      const mappedError = mapKypcarError(error);

      if (mappedError.metadata?.upstreamStatus === 401) {
        this.logger.warn("Kypcar returned 401, forcing token refresh", context);
        await this.authManager.refresh(context);
        return this.#executeWithMappedErrors(execute);
      }

      throw mappedError;
    }
  }

  async #executeWithMappedErrors(execute) {
    try {
      return await execute();
    } catch (error) {
      throw mapKypcarError(error);
    }
  }

  #jsonHeaders() {
    return {
      "Content-Type": "application/json",
      "User-Agent": this.userAgent,
    };
  }
}
