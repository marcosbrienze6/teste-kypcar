import test from "node:test";
import assert from "node:assert/strict";
import { RegisterWebhookUseCase } from "../../src/app/use-cases/RegisterWebhookUseCase.js";

function createLogger() {
  return {
    info() {},
    warn() {},
    error() {},
  };
}

test("RegisterWebhookUseCase reuses existing webhook when URL is already registered", async () => {
  const saved = [];
  const useCase = new RegisterWebhookUseCase({
    webhookRegistrationStore: {
      async save(value) {
        saved.push(value);
        return value;
      },
    },
    kypcarGateway: {
      async listWebhooks() {
        return [
          { id: "wh-1", url: "https://app.test/api/webhooks/kypcar" },
          { id: "wh-2", url: "https://another.test/webhook" },
        ];
      },
      async registerWebhook() {
        throw new Error("should not create a new webhook");
      },
    },
    logger: createLogger(),
    webhookUrl: "https://app.test/api/webhooks/kypcar",
  });

  const registration = await useCase.execute();

  assert.equal(registration.id, "wh-1");
  assert.equal(saved.length, 1);
  assert.equal(saved[0].id, "wh-1");
});

test("RegisterWebhookUseCase creates webhook when URL is not registered", async () => {
  let created = 0;
  const saved = [];
  const useCase = new RegisterWebhookUseCase({
    webhookRegistrationStore: {
      async save(value) {
        saved.push(value);
        return value;
      },
    },
    kypcarGateway: {
      async listWebhooks() {
        return [];
      },
      async registerWebhook(url) {
        created += 1;
        return { id: "wh-created", url };
      },
    },
    logger: createLogger(),
    webhookUrl: "https://app.test/api/webhooks/kypcar",
  });

  const registration = await useCase.execute();

  assert.equal(created, 1);
  assert.equal(registration.id, "wh-created");
  assert.equal(saved[0].url, "https://app.test/api/webhooks/kypcar");
});
