import { BackgroundWebhookProcessor } from "../app/services/BackgroundWebhookProcessor.js";
import { ReservationWindowPolicy } from "../app/services/ReservationWindowPolicy.js";
import { GetApplicationStatusUseCase } from "../app/use-cases/GetApplicationStatusUseCase.js";
import { GetEventStatusUseCase } from "../app/use-cases/GetEventStatusUseCase.js";
import { ProcessWebhookUseCase } from "../app/use-cases/ProcessWebhookUseCase.js";
import { ReceiveWebhookUseCase } from "../app/use-cases/ReceiveWebhookUseCase.js";
import { RegisterWebhookUseCase } from "../app/use-cases/RegisterWebhookUseCase.js";
import { loadConfig } from "../infra/config/loadConfig.js";
import { FetchHttpClient } from "../infra/http/FetchHttpClient.js";
import { GetEventStatusController } from "../infra/http/controllers/GetEventStatusController.js";
import { HealthController } from "../infra/http/controllers/HealthController.js";
import { ReceiveWebhookController } from "../infra/http/controllers/ReceiveWebhookController.js";
import { RegisterWebhookController } from "../infra/http/controllers/RegisterWebhookController.js";
import { StatusController } from "../infra/http/controllers/StatusController.js";
import { createHttpServer } from "../infra/http/server/createHttpServer.js";
import { KypcarAuthManager } from "../infra/kypcar/KypcarAuthManager.js";
import { KypcarGateway } from "../infra/kypcar/KypcarGateway.js";
import { JsonLogger } from "../infra/logging/JsonLogger.js";
import { FileEventStore } from "../infra/persistence/FileEventStore.js";
import { FileWebhookRegistrationStore } from "../infra/persistence/FileWebhookRegistrationStore.js";
import { InMemoryJobQueue } from "../infra/queue/InMemoryJobQueue.js";

export function createApplication() {
  const config = loadConfig();
  const logger = new JsonLogger();

  const httpClient = new FetchHttpClient({
    logger,
    timeoutMs: config.http.timeoutMs,
    retryAttempts: config.http.retryAttempts,
    retryBaseDelayMs: config.http.retryBaseDelayMs,
    maxRetryDelayMs: config.http.maxRetryDelayMs,
  });

  const authManager = new KypcarAuthManager({
    httpClient,
    logger,
    baseUrl: config.kypcar.baseUrl,
    email: config.kypcar.email,
    password: config.kypcar.password,
    userAgent: config.kypcar.userAgent,
  });

  const kypcarGateway = new KypcarGateway({
    httpClient,
    authManager,
    logger,
    baseUrl: config.kypcar.baseUrl,
    userAgent: config.kypcar.userAgent,
  });

  const eventStore = new FileEventStore({
    filePath: config.storage.eventStoreFile,
  });
  const webhookRegistrationStore = new FileWebhookRegistrationStore({
    filePath: config.storage.webhookRegistrationFile,
  });
  const queue = new InMemoryJobQueue({
    logger,
    concurrency: config.queue.concurrency,
  });
  const reservationWindowPolicy = new ReservationWindowPolicy(config.reservation);

  const processWebhookUseCase = new ProcessWebhookUseCase({
    eventStore,
    kypcarGateway,
    reservationWindowPolicy,
    logger,
  });

  const backgroundWebhookProcessor = new BackgroundWebhookProcessor({
    queue,
    processWebhookUseCase,
    logger,
  });

  const receiveWebhookUseCase = new ReceiveWebhookUseCase({
    eventStore,
    backgroundWebhookProcessor,
    logger,
  });

  const registerWebhookUseCase = new RegisterWebhookUseCase({
    webhookRegistrationStore,
    kypcarGateway,
    logger,
    webhookUrl: config.server.webhookUrl,
  });

  const getEventStatusUseCase = new GetEventStatusUseCase({
    eventStore,
  });

  const getApplicationStatusUseCase = new GetApplicationStatusUseCase({
    webhookRegistrationStore,
    webhookUrl: config.server.webhookUrl,
    uptimeProvider: () => process.uptime(),
  });

  const server = createHttpServer({
    logger,
    routes: [
      { method: "GET", path: "/health", controller: new HealthController() },
      { method: "GET", path: "/api/status", controller: new StatusController({ getApplicationStatusUseCase }) },
      { method: "POST", path: "/api/setup/webhook/register", controller: new RegisterWebhookController({ registerWebhookUseCase }) },
      { method: "GET", path: "/api/events/:eventId", controller: new GetEventStatusController({ getEventStatusUseCase }) },
      { method: "POST", path: config.server.webhookPath, controller: new ReceiveWebhookController({ receiveWebhookUseCase, logger }) },
    ],
  });

  return {
    config,
    logger,
    registerWebhookUseCase,
    server,
  };
}
