import path from "node:path";

function readNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig() {
  const port = readNumber(process.env.PORT, 3000);
  const host = process.env.HOST || "0.0.0.0";
  const appBaseUrl = (process.env.APP_BASE_URL || `http://localhost:${port}`).replace(/\/$/, "");
  const webhookPath = process.env.WEBHOOK_PATH || "/api/webhooks/kypcar";

  return {
    server: {
      port,
      host,
      appBaseUrl,
      webhookPath,
      webhookUrl: `${appBaseUrl}${webhookPath}`,
    },
    kypcar: {
      baseUrl: (process.env.KYP_CAR_BASE_URL || "https://dev.api.kypcar.com/v1/exam").replace(/\/$/, ""),
      email: process.env.KYP_CAR_EMAIL || "",
      password: process.env.KYP_CAR_PASSWORD || "",
      userAgent: process.env.KYP_CAR_USER_AGENT || "Kypcar",
    },
    http: {
      timeoutMs: readNumber(process.env.HTTP_TIMEOUT_MS, 10000),
      retryAttempts: readNumber(process.env.HTTP_RETRY_ATTEMPTS, 3),
      retryBaseDelayMs: readNumber(process.env.HTTP_RETRY_BASE_DELAY_MS, 300),
      maxRetryDelayMs: readNumber(process.env.HTTP_MAX_RETRY_DELAY_MS, 3000),
    },
    reservation: {
      startOffsetDays: readNumber(process.env.RESERVATION_START_OFFSET_DAYS, 1),
      durationDays: readNumber(process.env.RESERVATION_DURATION_DAYS, 1),
      maxAttempts: readNumber(process.env.RESERVATION_MAX_DATE_ATTEMPTS, 7),
    },
    storage: {
      webhookRegistrationFile: path.resolve(
        process.cwd(),
        process.env.WEBHOOK_REGISTRATION_FILE || "./storage-data/webhook-registration.json",
      ),
      eventStoreFile: path.resolve(
        process.cwd(),
        process.env.EVENT_STORE_FILE || "./storage-data/events.json",
      ),
    },
    features: {
      autoRegisterWebhook: String(process.env.AUTO_REGISTER_WEBHOOK || "false").toLowerCase() === "true",
    },
    queue: {
      concurrency: readNumber(process.env.QUEUE_CONCURRENCY, 4),
    },
  };
}
