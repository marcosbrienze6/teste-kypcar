import { ApplicationError } from "../../domain/errors/ApplicationError.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeExponentialDelay(baseDelayMs, maxDelayMs, attempt) {
  return Math.min(baseDelayMs * (2 ** (attempt - 1)), maxDelayMs);
}

function parseResponseBody(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class HttpRequestError extends ApplicationError {
  constructor(message, details = {}) {
    super(message, {
      code: details.code || "HTTP_REQUEST_ERROR",
      statusCode: details.statusCode || 502,
      metadata: {
        url: details.url,
        status: details.status,
        body: details.body,
      },
    });
    this.name = "HttpRequestError";
    this.status = details.status;
    this.body = details.body;
    this.url = details.url;
  }
}

export class FetchHttpClient {
  constructor({ logger, timeoutMs, retryAttempts, retryBaseDelayMs, maxRetryDelayMs }) {
    this.logger = logger;
    this.timeoutMs = timeoutMs;
    this.retryAttempts = retryAttempts;
    this.retryBaseDelayMs = retryBaseDelayMs;
    this.maxRetryDelayMs = maxRetryDelayMs;
  }

  async requestJson({ url, method, headers = {}, body, context = {} }) {
    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt += 1) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        const text = await response.text();
        const responseBody = parseResponseBody(text);

        if (!response.ok) {
          throw new HttpRequestError(`HTTP ${response.status} for ${url}`, {
            status: response.status,
            body: responseBody,
            url,
          });
        }

        return responseBody;
      } catch (error) {
        lastError = error;
        const shouldRetry = attempt < this.retryAttempts && this.#isRetryable(error);

        if (!shouldRetry) {
          throw error;
        }

        const delayMs = computeExponentialDelay(this.retryBaseDelayMs, this.maxRetryDelayMs, attempt);
        this.logger.warn("Transient HTTP failure, retrying request", {
          ...context,
          attempt,
          delay_ms: delayMs,
          error,
        });
        await sleep(delayMs);
      }
    }

    throw lastError;
  }

  #isRetryable(error) {
    return !(error instanceof HttpRequestError) || error.status >= 500;
  }
}
