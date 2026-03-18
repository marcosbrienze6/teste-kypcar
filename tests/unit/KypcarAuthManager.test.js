import test from "node:test";
import assert from "node:assert/strict";
import { KypcarAuthManager } from "../../src/infra/kypcar/KypcarAuthManager.js";

function createLogger() {
  return {
    info() {},
    warn() {},
    error() {},
  };
}

function createJwt(exp) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `${header}.${payload}.signature`;
}

test("KypcarAuthManager logs in when there is no cached token", async () => {
  const calls = [];
  const manager = new KypcarAuthManager({
    httpClient: {
      async requestJson(request) {
        calls.push(request);
        return {
          access_token: createJwt(Math.floor(Date.now() / 1000) + 3600),
          refresh_token: "refresh-token",
          token_type: "bearer",
        };
      },
    },
    logger: createLogger(),
    baseUrl: "https://dev.api.kypcar.com/v1/exam",
    email: "user@example.com",
    password: "secret",
    userAgent: "Kypcar",
  });

  const token = await manager.getAccessToken({ correlation_id: "corr-1" });

  assert.equal(typeof token, "string");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://dev.api.kypcar.com/v1/exam/auth/login");
});

test("KypcarAuthManager refreshes token when it is close to expiring", async () => {
  const calls = [];
  const manager = new KypcarAuthManager({
    httpClient: {
      async requestJson(request) {
        calls.push(request);

        if (request.url.endsWith("/auth/refresh")) {
          return {
            access_token: createJwt(Math.floor(Date.now() / 1000) + 3600),
            refresh_token: "new-refresh-token",
            token_type: "bearer",
          };
        }

        return {
          access_token: createJwt(Math.floor(Date.now() / 1000) + 10),
          refresh_token: "refresh-token",
          token_type: "bearer",
        };
      },
    },
    logger: createLogger(),
    baseUrl: "https://dev.api.kypcar.com/v1/exam",
    email: "user@example.com",
    password: "secret",
    userAgent: "Kypcar",
  });

  await manager.login();
  const token = await manager.getAccessToken();

  assert.equal(typeof token, "string");
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, "https://dev.api.kypcar.com/v1/exam/auth/refresh");
});

test("KypcarAuthManager deduplicates concurrent refresh calls", async () => {
  let refreshCalls = 0;
  const manager = new KypcarAuthManager({
    httpClient: {
      async requestJson(request) {
        if (request.url.endsWith("/auth/login")) {
          return {
            access_token: createJwt(Math.floor(Date.now() / 1000) + 10),
            refresh_token: "refresh-token",
            token_type: "bearer",
          };
        }

        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));

        return {
          access_token: createJwt(Math.floor(Date.now() / 1000) + 3600),
          refresh_token: "refresh-token-2",
          token_type: "bearer",
        };
      },
    },
    logger: createLogger(),
    baseUrl: "https://dev.api.kypcar.com/v1/exam",
    email: "user@example.com",
    password: "secret",
    userAgent: "Kypcar",
  });

  await manager.login();

  await Promise.all([manager.refresh(), manager.refresh(), manager.refresh()]);

  assert.equal(refreshCalls, 1);
});
