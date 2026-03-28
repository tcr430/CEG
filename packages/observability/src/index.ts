export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContextValue = string | number | boolean | null;
export type LogContext = Record<string, LogContextValue>;

export type StructuredLogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
};

export type StructuredLogger = {
  log(level: LogLevel, message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): StructuredLogger;
};

export type LogSink = {
  write(entry: StructuredLogEntry): void;
};

const MAX_BUFFERED_LOG_ENTRIES = 250;
const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /(secret|token|password|passwd|authorization|cookie|signature|key)$/i;
const globalLogState = globalThis as typeof globalThis & {
  __cegBufferedOperationLogs?: StructuredLogEntry[];
};

function sanitizeLogContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED_VALUE : value,
    ]),
  );
}

function mergeContexts(baseContext: LogContext, context?: LogContext): LogContext {
  return sanitizeLogContext({
    ...baseContext,
    ...(context ?? {}),
  });
}

function writeToConsole(entry: StructuredLogEntry) {
  const payload = {
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    ...entry.context,
  };

  console[entry.level === "debug" ? "log" : entry.level](JSON.stringify(payload));
}

function getBufferedEntries(): StructuredLogEntry[] {
  if (globalLogState.__cegBufferedOperationLogs === undefined) {
    globalLogState.__cegBufferedOperationLogs = [];
  }

  return globalLogState.__cegBufferedOperationLogs;
}

export function createBufferedLogSink(
  maxEntries: number = MAX_BUFFERED_LOG_ENTRIES,
): LogSink {
  return {
    write(entry) {
      const entries = getBufferedEntries();
      entries.push(entry);

      if (entries.length > maxEntries) {
        entries.splice(0, entries.length - maxEntries);
      }
    },
  };
}

export function listBufferedLogEntries(input: {
  limit?: number;
  workspaceId?: string;
  requestId?: string;
} = {}): StructuredLogEntry[] {
  const entries = [...getBufferedEntries()];
  const filtered = entries.filter((entry) => {
    if (
      input.workspaceId !== undefined &&
      entry.context.workspaceId !== input.workspaceId
    ) {
      return false;
    }

    if (input.requestId !== undefined && entry.context.requestId !== input.requestId) {
      return false;
    }

    return true;
  });

  const limit = input.limit ?? 50;
  return filtered.slice(Math.max(filtered.length - limit, 0)).reverse();
}

function createLogger(
  writer: (entry: StructuredLogEntry) => void,
  baseContext: LogContext = {},
): StructuredLogger {
  const write = (level: LogLevel, message: string, context?: LogContext) => {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: mergeContexts(baseContext, context),
    };

    writer(entry);
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
      return createLogger(writer, mergeContexts(baseContext, context));
    },
  };
}

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
      return createNoopLogger(mergeContexts(baseContext, context));
    },
  };
}

export function createConsoleLogger(
  baseContext: LogContext = {},
): StructuredLogger {
  const sink = createBufferedLogSink();

  return createLogger((entry) => {
    sink.write(entry);
    writeToConsole(entry);
  }, baseContext);
}
