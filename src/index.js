import { createApplication } from "./bootstrap/createApplication.js";

const { config, logger, registerWebhookUseCase, server } = createApplication();

server.listen(config.server.port, config.server.host, async () => {
  logger.info("Server listening", {
    host: config.server.host,
    port: config.server.port,
    webhook_url: config.server.webhookUrl,
  });

  if (config.features.autoRegisterWebhook) {
    try {
      await registerWebhookUseCase.execute();
    } catch (error) {
      logger.error("Automatic webhook registration failed", { error });
    }
  }
});

process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
