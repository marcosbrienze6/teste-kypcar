import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileEventStore } from "../../src/infra/persistence/FileEventStore.js";

test("FileEventStore persists events across instances", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "kypcar-events-"));
  const filePath = path.join(dir, "events.json");

  const storeA = new FileEventStore({ filePath });
  await storeA.save({
    id: "event-1",
    correlationId: "corr-1",
    status: "received",
  });

  await storeA.update("event-1", {
    status: "completed",
    reservationId: "res-1",
  });

  const storeB = new FileEventStore({ filePath });
  const event = await storeB.findById("event-1");

  assert.equal(event.status, "completed");
  assert.equal(event.reservationId, "res-1");
});
