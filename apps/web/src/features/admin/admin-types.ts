export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "DELETION_PENDING" | "SUSPENDED";
  createdAt: string;
  activeSessionCount: number;
  emailVerified: boolean;
  lastActiveAt: string | null;
  completedWorkoutCount: number;
  lastWorkoutAt: string | null;
}

export interface AdminOverview {
  generatedAt: string;
  totalAccounts: number;
  activeAccounts: number;
  suspendedAccounts: number;
  deletionPendingAccounts: number;
  unverifiedEmails: number;
  signupsLast7Days: number;
  signupsLast30Days: number;
  activeUsersLast7Days: number;
  activeUsersLast30Days: number;
  activeSessions: number;
  workoutsCompletedTotal: number;
  workoutsCompletedLast7Days: number;
  setsLoggedLast7Days: number;
}

export interface AdminSettings {
  campaignsOpen: boolean;
  updatedAt: string;
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
