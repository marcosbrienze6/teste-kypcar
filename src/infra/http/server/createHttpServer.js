import http from "node:http";
import { ApplicationError } from "../../../domain/errors/ApplicationError.js";
import { InvalidJsonBodyError, sendJson } from "../json.js";

function matchRoute(method, pathname, routes) {
  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }

    if (route.path === pathname) {
      return { route, params: {} };
    }

    const routeParts = route.path.split("/").filter(Boolean);
    const pathParts = pathname.split("/").filter(Boolean);

    if (routeParts.length !== pathParts.length) {
      continue;
    }

    const params = {};
    let matched = true;

    for (let index = 0; index < routeParts.length; index += 1) {
      const routePart = routeParts[index];
      const pathPart = pathParts[index];

      if (routePart.startsWith(":")) {
        params[routePart.slice(1)] = pathPart;
        continue;
      }

      if (routePart !== pathPart) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { route, params };
    }
  }

  return null;
}

export function createHttpServer({ logger, routes }) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const matched = matchRoute(req.method, url.pathname, routes);

      if (!matched) {
        return sendJson(res, 404, { error: "Not found" });
      }

      return await matched.route.controller.handle(req, res, matched.params);
    } catch (error) {
      if (error instanceof InvalidJsonBodyError) {
        return sendJson(res, 400, {
          error: "Invalid JSON body",
          message: "Send a valid JSON object, for example: {\"plate\":\"BRA2E19\"}",
        });
      }

      if (error instanceof ApplicationError) {
        logger.warn("Handled application error", {
          code: error.code,
          metadata: error.metadata,
          error,
        });
        return sendJson(res, error.statusCode, {
          error: error.code,
          message: error.message,
          details: error.metadata,
        });
      }

      logger.error("Unhandled request error", { error });
      return sendJson(res, 500, { error: "INTERNAL_SERVER_ERROR", message: "Internal server error" });
    }
  });
}
