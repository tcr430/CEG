export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, string | number | boolean | null>;

export type StructuredLogger = {
  log(level: LogLevel, message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): StructuredLogger;
};

export function createNoopLogger(
  baseContext: LogContext = {},
): StructuredLogger {
  const write = (level: LogLevel, message: string, context?: LogContext) => {
    void level;
    void message;
    void context;
    return;
  };

  return {
    log(level, message, context) {
      write(level, message, { ...baseContext, ...context });
    },
    debug(message, context) {
      write("debug", message, { ...baseContext, ...context });
    },
    info(message, context) {
      write("info", message, { ...baseContext, ...context });
    },
    warn(message, context) {
      write("warn", message, { ...baseContext, ...context });
    },
    error(message, context) {
      write("error", message, { ...baseContext, ...context });
    },
    child(context) {
      return createNoopLogger({ ...baseContext, ...context });
    },
  };
}

export function createConsoleLogger(
  baseContext: LogContext = {},
): StructuredLogger {
  const write = (level: LogLevel, message: string, context?: LogContext) => {
    const payload = {
      level,
      message,
      ...baseContext,
      ...(context ?? {}),
    };

    console[level === "debug" ? "log" : level](JSON.stringify(payload));
  };

  return {
    log(level, message, context) {
      write(level, message, context);
    },
    debug(message, context) {
      write("debug", message, context);
    },
    info(message, context) {
      write("info", message, context);
    },
    warn(message, context) {
      write("warn", message, context);
    },
    error(message, context) {
      write("error", message, context);
    },
    child(context) {
      return createConsoleLogger({ ...baseContext, ...context });
    },
  };
}
