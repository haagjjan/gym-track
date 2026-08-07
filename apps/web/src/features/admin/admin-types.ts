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
