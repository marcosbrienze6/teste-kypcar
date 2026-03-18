import test from "node:test";
import assert from "node:assert/strict";
import { FetchHttpClient, HttpRequestError } from "../../src/infra/http/FetchHttpClient.js";

function createLogger() {
  return {
    warn() {},
    error() {},
    info() {},
  };
}

function createResponse({ ok, status, body }) {
  return {
    ok,
    status,
    async text() {
      return body;
    },
  };
}

test("FetchHttpClient retries transient failures and eventually succeeds", async () => {
  const originalFetch = global.fetch;
  let calls = 0;

  global.fetch = async () => {
    calls += 1;

    if (calls < 3) {
      throw new Error("temporary network failure");
    }

    return createResponse({
      ok: true,
      status: 200,
      body: JSON.stringify({ ok: true }),
    });
  };

  const client = new FetchHttpClient({
    logger: createLogger(),
    timeoutMs: 1000,
    retryAttempts: 3,
    retryBaseDelayMs: 1,
    maxRetryDelayMs: 2,
  });

  try {
    const response = await client.requestJson({
      url: "https://example.test/resource",
      method: "GET",
    });

    assert.deepEqual(response, { ok: true });
    assert.equal(calls, 3);
  } finally {
    global.fetch = originalFetch;
  }
});

test("FetchHttpClient does not retry 4xx responses", async () => {
  const originalFetch = global.fetch;
  let calls = 0;

  global.fetch = async () => {
    calls += 1;
    return createResponse({
      ok: false,
      status: 400,
      body: JSON.stringify({ error: { message: "bad request" } }),
    });
  };

  const client = new FetchHttpClient({
    logger: createLogger(),
    timeoutMs: 1000,
    retryAttempts: 3,
    retryBaseDelayMs: 1,
    maxRetryDelayMs: 2,
  });

  try {
    await assert.rejects(
      client.requestJson({
        url: "https://example.test/resource",
        method: "POST",
      }),
      HttpRequestError,
    );
    assert.equal(calls, 1);
  } finally {
    global.fetch = originalFetch;
  }
});
