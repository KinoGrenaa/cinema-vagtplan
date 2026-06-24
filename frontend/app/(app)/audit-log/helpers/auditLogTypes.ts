export type AuditUser = {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type AuditLog = {
  id: number;
  action: string;
  entityType: string;
  entityId?: number | null;
  description?: string | null;
  createdAt: string;

  user?: AuditUser | null;
  subjectUser?: AuditUser | null;

  cinema?: {
    name: string;
  } | null;
};

export type AuditLogGroup = {
  dateKey: string;
  dateLabel: string;
  logs: AuditLog[];
};
