import type { FieldValue, Timestamp } from 'firebase/firestore';

export type AuditStatus = 'in_progress' | 'completed';

export type AuditType = 'rto' | 'board5s' | 'daily5s';

export type Daily5sRatingValue = 1 | 3 | 5;

export type PrinterCheckKey = 'printer1' | 'printer2' | 'printer3';

export type RtoAuditProcessKey =
  | 'frontEnd'
  | 'lavadora'
  | 'printer'
  | 'necker'
  | 'insideSpray'
  | 'paletizadora';

export type Board5sAuditProcessKey =
  | 'minsters'
  | 'bodyMakers11to14'
  | 'bodyMakers15to18'
  | 'bodyMakers19to23'
  | 'bodyMakers24to31'
  | 'printer1'
  | 'printer2e3';

export type Daily5sAuditProcessKey =
  | 'minsters'
  | 'bodyMakers11to14'
  | 'bodyMakers15to18'
  | 'bodyMakers19to23'
  | 'bodyMakers24to31'
  | 'printer1'
  | 'printer2e3';

export type DualAuditProcessKey =
  | RtoAuditProcessKey
  | Board5sAuditProcessKey
  | Daily5sAuditProcessKey;

// Legacy single-audit key type (RTO-only)
export type AuditProcessKey = RtoAuditProcessKey;

export type rtoAuditProcessKey = AuditProcessKey;

export type AuditProcessStatus = 'updated' | 'not_updated' | null;

export interface PrinterCheckResult {
  status: AuditProcessStatus;
  comment?: string | null;
  imageUrl?: string | null;
}

export type PrinterChecks = Record<PrinterCheckKey, PrinterCheckResult>;

export interface AuditProcess {
  status: AuditProcessStatus;
  comment?: string | null;
  imageUrl?: string | null;
  printerChecks?: PrinterChecks | null;
  issueTargets?: PrinterCheckKey[];
}

export type AuditProcesses = Record<AuditProcessKey, AuditProcess>;

export interface AuditDocument {
  auditorId: string;
  turma: 'A e C' | 'B e D';
  dayOfWeek: string;
  yearMonth: string;
  createdAt: Timestamp;
  status: AuditStatus;
  processes: AuditProcesses;
  failedProcesses: number;
  totalProcesses: number;
  hasFailures?: boolean;
}

export interface AuditHistoryItem {
  id: string;
  status: AuditStatus;
  turma: 'A e C' | 'B e D' | null;
  dayOfWeek: string;
  yearMonth: string;
  createdAt: Date | null;
  failedProcesses: number;
  totalProcesses: number;
  hasFailures: boolean;
  processes: AuditProcesses;
}

export interface FailuresOverTimeData {
  labels: string[];
  data: number[];
  countsByDate: Record<string, number>;
}

export interface FailuresByProcessData {
  labels: string[];
  data: number[];
  countsByProcess: Record<string, number>;
  mostProblematicProcess: string | null;
}

export interface ProcessFailureRatesData {
  labels: string[];
  data: number[];
  totalsByProcess: Record<string, number>;
  failuresByProcess: Record<string, number>;
}

export interface FailuresByProcessAndTurmaData {
  labels: string[];
  seriesAC: number[];
  seriesBD: number[];
}

export interface FailuresByDateAndProcessSeries {
  name: string;
  data: number[];
}

export interface FailuresByDateAndProcessData {
  labels: string[];
  series: FailuresByDateAndProcessSeries[];
}

/** Write-side shape for a single analytics record in a process-results collection. */
export interface rtoAuditResultDocument {
  auditId: string;
  auditorId: string;
  turma: 'A e C' | 'B e D';
  dayOfWeek: string;
  yearMonth: string;
  date: string;
  process: AuditProcessKey;
  processKey: AuditProcessKey;
  status: UpdatableProcessStatus;
  hasIssue: boolean;
  createdAt: FieldValue;
  hasImage: boolean;
}

export interface NewAuditDocument extends Omit<AuditDocument, 'createdAt'> {
  createdAt: FieldValue;
}

export type UpdatableProcessStatus = Exclude<AuditProcessStatus, null>;

// ─── New Dual-Type Audit Structure ───────────────────────────────────────

/**
 * New audit document structure for both RTO and board 5S audits.
 * Uses date as document ID.
 */
export interface DualTypeAuditDocument {
  auditSessionId: string;
  date: string; // YYYY-MM-DD
  turma: 'A e C' | 'B e D';
  completedAt?: Timestamp;
  inspector: string; // userId
  createdAt: Timestamp;
}

/**
 * New dual-type audit result structure.
 * One document per process per audit.
 */
export interface DualTypeAuditResultDocument {
  auditId: string; // date string (YYYY-MM-DD)
  auditSessionId: string;
  date: string; // YYYY-MM-DD
  turma: 'A e C' | 'B e D';
  process: DualAuditProcessKey;
  status: UpdatableProcessStatus;
  hasIssue: boolean; // status === 'not_updated'
  rating?: Daily5sRatingValue | null;
  comment?: string | null;
  imageUrl?: string | null;
  printerChecks?: PrinterChecks | null;
  issueTargets?: PrinterCheckKey[];
  createdAt: FieldValue;
}

/**
 * Configuration for creating audit services
 */
export interface AuditServiceConfig {
  auditCollection: string;
  resultsCollection: string;
}

/**
 * A completed audit session as shown in the history page.
 * Type-aware: covers both rto and board5s (and future types).
 * Processes are keyed by process key and hold the raw result document.
 */
export interface DualTypeHistoryItem {
  id: string; // YYYY-MM-DD (the auditId / document ID)
  type: AuditType;
  turma: 'A e C' | 'B e D' | null;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  yearMonth: string;
  completedAt: Date | null;
  failedProcesses: number;
  totalProcesses: number;
  hasFailures: boolean;
  processes: Partial<Record<DualAuditProcessKey, DualTypeAuditResultDocument>>;
}
