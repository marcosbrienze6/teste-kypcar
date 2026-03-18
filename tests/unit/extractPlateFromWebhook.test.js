import test from "node:test";
import assert from "node:assert/strict";
import { extractPlateFromWebhook } from "../../src/domain/services/extractPlateFromWebhook.js";

test("extractPlateFromWebhook supports multiple payload shapes", () => {
  assert.equal(extractPlateFromWebhook({ plate: "abc1d23" }), "ABC1D23");
  assert.equal(extractPlateFromWebhook({ data: { vehicle: { plate: "rio3f45" } } }), "RIO3F45");
  assert.equal(extractPlateFromWebhook({ event: { plate: "mig4g78" } }), "MIG4G78");
  assert.equal(extractPlateFromWebhook({ foo: "bar" }), null);
});
