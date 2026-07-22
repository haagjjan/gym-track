import type { FastifyServerOptions } from "fastify";

export type ApiLogger = NonNullable<FastifyServerOptions["logger"]>;
type AppLogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

interface LoggerStream {
  write(message: string): void;
}

export interface ApiLoggerConfig {
  level: AppLogLevel;
  nodeEnv: "development" | "test" | "production";
  environment?: string;
  version?: string;
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
  "body",
  "req.body",
  "request.body",
  "response.body",
  "res.headers.set-cookie",
  "response.headers.set-cookie",
  "password",
  "token",
  "secret",
  "email",
  "to",
  "DATABASE_URL",
  "sessionToken",
  "sessionTokenHash",
  "*.password",
  "*.token",
  "*.secret",
  "*.email",
  "*.to",
  "*.DATABASE_URL",
  "*.sessionToken",
  "*.sessionTokenHash"
] as const;

export function createApiLogger(config: ApiLoggerConfig): ApiLogger {
  if (config.nodeEnv === "test" || config.level === "silent") {
    return false;
  }

  const logger = {
    level: config.level,
    base: {
      service: "api",
      environment: config.environment ?? config.nodeEnv,
      version: config.version ?? "unknown"
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
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
