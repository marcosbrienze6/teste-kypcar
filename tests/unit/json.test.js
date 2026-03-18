import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { InvalidJsonBodyError, readJsonBody } from "../../src/infra/http/json.js";

test("readJsonBody parses valid JSON payloads", async () => {
  const req = Readable.from([Buffer.from('{"plate":"BRA2E19"}')]);
  const body = await readJsonBody(req);

  assert.deepEqual(body, { plate: "BRA2E19" });
});

test("readJsonBody throws InvalidJsonBodyError on malformed JSON", async () => {
  const req = Readable.from([Buffer.from("-BRA2E19")]);

  await assert.rejects(readJsonBody(req), InvalidJsonBodyError);
});
