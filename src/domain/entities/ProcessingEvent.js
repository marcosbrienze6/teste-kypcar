import crypto from "node:crypto";
import { EventStatus } from "./EventStatus.js";

export function createProcessingEvent({ payload, correlationId, receivedAt = new Date() }) {
  return {
    id: crypto.randomUUID(),
    correlationId,
    payload,
    status: EventStatus.RECEIVED,
    receivedAt: receivedAt.toISOString(),
  };
}
