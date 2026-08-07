import { z } from "zod";

const auditCursorSchema = z.object({
  createdAt: z.string().datetime({ offset: true }).transform((value) => new Date(value)),
  id: z.string().regex(/^\d+$/)
});

export const adminUserParamsSchema = z.object({
  userId: z.string().uuid()
});

export const adminUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"])
});

export const adminAuditQuerySchema = z.object({
  cursor: z.string().max(512).optional().transform((value, context) => {
    if (!value) return undefined;
    try {
      const decoded: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
      const parsed = auditCursorSchema.safeParse(decoded);
      if (parsed.success) return parsed.data;
    } catch {
      // The validation issue below gives callers the standard API envelope.
    }
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Cursor is invalid." });
    return z.NEVER;
  }),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export type AdminAccountStatus = z.infer<typeof adminUserStatusSchema>["status"];
export type AdminAuditQuery = z.infer<typeof adminAuditQuerySchema>;
