import test from "node:test";
import assert from "node:assert/strict";
import { ReceiveWebhookUseCase } from "../../src/app/use-cases/ReceiveWebhookUseCase.js";
import { InMemoryEventStore } from "../../src/infra/persistence/InMemoryEventStore.js";

test("ReceiveWebhookUseCase stores event and enqueues background processing", async () => {
  const eventStore = new InMemoryEventStore();
  const queued = [];
  const useCase = new ReceiveWebhookUseCase({
    eventStore,
    backgroundWebhookProcessor: {
      async enqueue(event) {
        queued.push(event);
      },
    },
    logger: {
      info() {},
    },
  });

  const event = await useCase.execute({
    payload: { plate: "BRA2E19" },
    correlationId: "corr-123",
  });

  assert.equal(event.correlationId, "corr-123");
  assert.equal(queued.length, 1);
  assert.equal((await eventStore.findById(event.id)).id, event.id);
});
