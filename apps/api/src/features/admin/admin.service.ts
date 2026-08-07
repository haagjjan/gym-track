import type {
  AdminAuditCursor,
  AdminAuditRecord,
  AdminMutationResult,
  AdminRepository,
  AdminSessionRevocationResult,
  AdminUserRecord
} from "./admin.repository.js";
import type { AdminAccountStatus } from "./admin.schemas.js";

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "DELETION_PENDING" | "SUSPENDED";
  cohort: string | null;
  createdAt: string;
  activeSessionCount: number;
}

export interface AdminAuditEvent {
  id: string;
  adminUserId: string | null;
  adminUsername: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, string | number>;
  createdAt: string;
}

export interface AdminAuditPage {
  items: AdminAuditEvent[];
  nextCursor: string | null;
}

export interface AdminService {
  listUsers(): Promise<AdminUser[]>;
  setUserStatus(adminUserId: string, userId: string, status: AdminAccountStatus): Promise<AdminMutationResult>;
  revokeUserSessions(adminUserId: string, userId: string): Promise<AdminSessionRevocationResult>;
  listAuditEvents(cursor: AdminAuditCursor | undefined, limit: number): Promise<AdminAuditPage>;
}

export function createAdminService(options: {
  repository: AdminRepository;
  now?: () => Date;
}): AdminService {
  const now = options.now ?? (() => new Date());
  return {
    async listUsers() {
      return (await options.repository.listUsers(now())).map(toAdminUser);
    },
    setUserStatus(adminUserId, userId, status) {
      return options.repository.setUserStatus(adminUserId, userId, status, now());
    },
    revokeUserSessions(adminUserId, userId) {
      return options.repository.revokeUserSessions(adminUserId, userId, now());
    },
    async listAuditEvents(cursor, limit) {
      const records = await options.repository.listAuditEvents(cursor, limit + 1);
      const hasMore = records.length > limit;
      const visible = records.slice(0, limit);
      const last = visible.at(-1);
      return {
        items: visible.map(toAuditEvent),
        nextCursor: hasMore && last ? encodeCursor(last) : null
      };
    }
  };
}

function toAdminUser(record: AdminUserRecord): AdminUser {
  return { ...record, createdAt: record.createdAt.toISOString() };
}

function toAuditEvent(record: AdminAuditRecord): AdminAuditEvent {
  return {
    ...record,
    details: safeAuditDetails(record.details),
    createdAt: record.createdAt.toISOString()
  };
}

function safeAuditDetails(value: unknown): Record<string, string | number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const details: Record<string, string | number> = {};
  for (const key of ["previousStatus", "newStatus", "revokedSessions"] as const) {
    const entry = source[key];
    if (typeof entry === "string" && entry.length <= 40) details[key] = entry;
    if (typeof entry === "number" && Number.isSafeInteger(entry)) details[key] = entry;
  }
  return details;
}

function encodeCursor(record: AdminAuditRecord): string {
  return Buffer.from(JSON.stringify({
    createdAt: record.createdAt.toISOString(),
    id: record.id
  })).toString("base64url");
}
