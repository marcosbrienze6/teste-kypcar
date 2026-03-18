function serializeError(error) {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    metadata: error.metadata,
  };
}

function buildEntry(level, message, context) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...Object.fromEntries(
      Object.entries(context || {}).map(([key, value]) => [key, value instanceof Error ? serializeError(value) : value]),
    ),
  });
}

export class JsonLogger {
  info(message, context = {}) {
    console.log(buildEntry("INFO", message, context));
  }

  warn(message, context = {}) {
    console.warn(buildEntry("WARN", message, context));
  }

  error(message, context = {}) {
    console.error(buildEntry("ERROR", message, context));
  }
}
