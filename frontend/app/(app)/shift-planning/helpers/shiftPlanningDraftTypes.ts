export type SavedDraftSummary = {
  id: number | string;
  cinemaId?: number | null;
  year?: number | null;
  month?: number | null;
  status?: string | null;
  source?: string | null;
  note?: string | null;
  warnings?: unknown;
  createdAt?: string | null;
  updatedAt?: string | null;
  itemCount?: number | string | null;
  unassignedItemCount?: number | string | null;
  warningItemCount?: number | string | null;
};

export type SavedDraftItem = {
  id: number | string;
  date?: string | null;
  status?: string | null;
  jobFunctionName?: string | null;
  jobFunctionColor?: string | null;
  scheduleTemplateName?: string | null;
  userFirstName?: string | null;
  userLastName?: string | null;
  userEmail?: string | null;
  plannedStartMinute?: number | string | null;
  plannedEndMinute?: number | string | null;
  warningCode?: string | null;
  warningMessage?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type SavedDraftDetails = SavedDraftSummary & {
  items?: SavedDraftItem[];
};

export type MonthDraftResponse = {
  drafts?: SavedDraftSummary[];
};

export type DraftDateGroup = {
  dateKey: string;
  label: string;
  items: SavedDraftItem[];
  unassignedCount: number;
  warningCount: number;
  missingTimeCount: number;
};

export type DraftControlSummary = {
  totalItems: number;
  dateCount: number;
  unassignedCount: number;
  warningCount: number;
  missingTimeCount: number;
  missingJobFunctionCount: number;
  missingTemplateCount: number;
};

export type DraftValidationIssue = {
  id?: number | string | null;
  itemId?: number | string | null;
  date?: string | null;
  dateKey?: string | null;
  severity?: string | null;
  code?: string | null;
  message?: string | null;
  employeeName?: string | null;
  userName?: string | null;
  jobFunctionName?: string | null;
  details?: unknown;
};

export type DraftValidationSummary = {
  isValid?: boolean;
  errorCount?: number | string | null;
  warningCount?: number | string | null;
  issueCount?: number | string | null;
};

export type DraftValidationResult = {
  draftId?: number | string;
  cinemaId?: number | null;
  year?: number | null;
  month?: number | null;
  status?: string | null;
  checkedAt?: string | null;
  summary?: DraftValidationSummary | null;
  issues?: DraftValidationIssue[];
};

export type DraftPublicationPreviewSummary = {
  canPublishLater?: boolean;
  itemCount?: number | string | null;
  publishableItemCount?: number | string | null;
  blockedItemCount?: number | string | null;
  validationErrorCount?: number | string | null;
  validationWarningCount?: number | string | null;
  validationIssueCount?: number | string | null;
};

export type DraftPublicationPreviewItem = {
  draftItemId?: number | string | null;
  dateKey?: string | null;
  status?: string | null;
  jobFunctionName?: string | null;
  jobFunctionColor?: string | null;
  userName?: string | null;
  plannedStartMinute?: number | string | null;
  plannedEndMinute?: number | string | null;
  canBecomeShift?: boolean | null;
  jobFunctionId?: number | string | null;
  blockReasons?: string[] | null;
  warningMessage?: string | null;
};

export type DraftPublicationPreviewResult = {
  draftId?: number | string;
  cinemaId?: number | null;
  year?: number | null;
  month?: number | null;
  status?: string | null;
  checkedAt?: string | null;
  mode?: string | null;
  createsShifts?: boolean | null;
  summary?: DraftPublicationPreviewSummary | null;
  blockingReasons?: string[];
  validationSummary?: DraftValidationSummary | null;
  validationIssues?: DraftValidationIssue[];
  previewItems?: DraftPublicationPreviewItem[];
};

export type JobFunctionOption = {
  id: number | string;
  name: string;
  color?: string | null;
  isActive?: boolean | null;
  archivedAt?: string | null;
};

export type DraftPublishResult = {
  draftId?: number | string;
  cinemaId?: number | null;
  year?: number | null;
  month?: number | null;
  status?: string | null;
  mode?: string | null;
  createsShifts?: boolean | null;
  createdShiftCount?: number | string | null;
  createdShiftIds?: Array<number | string>;
  affectedDateKeys?: string[];
  jobFunctionId?: number | string | null;
  jobFunctionName?: string | null;
  jobFunctionNames?: string[];
  publishedAt?: string | null;
  message?: string | null;
};
