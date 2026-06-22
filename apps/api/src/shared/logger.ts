import type { FastifyServerOptions } from "fastify";

export type ApiLogger = NonNullable<FastifyServerOptions["logger"]>;
type AppLogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

interface LoggerStream {
  write(message: string): void;
}

export interface ApiLoggerConfig {
  level: AppLogLevel;
  nodeEnv: "development" | "test" | "production";
  stream?: LoggerStream;
}

export const sensitiveLogPaths = [
  "authorization",
  "cookie",
  "cookies",
  "headers.authorization",
  "headers.cookie",
  "req.headers.authorization",
  "req.headers.cookie",
  "req.cookies",
  "request.headers.authorization",
  "request.headers.cookie",
  "request.cookies",
  "res.headers.set-cookie",
  "response.headers.set-cookie",
  "sessionToken",
  "sessionTokenHash",
  "*.sessionToken",
  "*.sessionTokenHash"
] as const;

export function createApiLogger(config: ApiLoggerConfig): ApiLogger {
  if (config.nodeEnv === "test" || config.level === "silent") {
    return false;
  }

  const logger = {
    level: config.level,
    redact: {
      paths: [...sensitiveLogPaths],
      censor: "[Redacted]"
    }
  };

  if (config.nodeEnv === "development" && config.stream === undefined) {
    return {
      ...logger,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "HH:MM:ss Z"
        }
      }
    };
  }

  return config.stream === undefined ? logger : { ...logger, stream: config.stream };
}
