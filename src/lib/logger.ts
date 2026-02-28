type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) ?? 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function emit(entry: LogEntry) {
  if (!shouldLog(entry.level)) return;

  // Structured JSON logging for production, readable for dev
  if (process.env.NODE_ENV === 'production') {
    const output = JSON.stringify(entry);
    if (entry.level === 'error') {
      console.error(output);
    } else if (entry.level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  } else {
    const prefix = `[${entry.level.toUpperCase()}]${entry.context ? ` [${entry.context}]` : ''}`;
    const msg = `${prefix} ${entry.message}`;
    if (entry.level === 'error') {
      console.error(msg, entry.data ?? '');
    } else if (entry.level === 'warn') {
      console.warn(msg, entry.data ?? '');
    } else if (entry.level === 'debug') {
      console.debug(msg, entry.data ?? '');
    } else {
      console.log(msg, entry.data ?? '');
    }
  }
}

function createLogger(context: string) {
  return {
    debug(message: string, data?: Record<string, unknown>) {
      emit({ level: 'debug', message, context, data, timestamp: new Date().toISOString() });
    },
    info(message: string, data?: Record<string, unknown>) {
      emit({ level: 'info', message, context, data, timestamp: new Date().toISOString() });
    },
    warn(message: string, data?: Record<string, unknown>) {
      emit({ level: 'warn', message, context, data, timestamp: new Date().toISOString() });
    },
    error(message: string, data?: Record<string, unknown>) {
      emit({ level: 'error', message, context, data, timestamp: new Date().toISOString() });
    },
  };
}

export const logger = {
  create: createLogger,
  // Convenience: top-level logger with no context
  debug: (msg: string, data?: Record<string, unknown>) => createLogger('app').debug(msg, data),
  info: (msg: string, data?: Record<string, unknown>) => createLogger('app').info(msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => createLogger('app').warn(msg, data),
  error: (msg: string, data?: Record<string, unknown>) => createLogger('app').error(msg, data),
};
