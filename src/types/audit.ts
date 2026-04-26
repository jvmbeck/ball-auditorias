import type { FieldValue, Timestamp } from 'firebase/firestore';

export type AuditStatus = 'in_progress' | 'completed';

export type AuditType = 'rto' | 'board5s';

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

export type DualAuditProcessKey = RtoAuditProcessKey | Board5sAuditProcessKey;

// Legacy single-audit key type (RTO-only)
export type AuditProcessKey = RtoAuditProcessKey;

export type rtoAuditProcessKey = AuditProcessKey;

export type AuditProcessStatus = 'updated' | 'not_updated' | null;

export interface AuditProcess {
  status: AuditProcessStatus;
  comment?: string | null;
  imageUrl?: string | null;
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
  process: DualAuditProcessKey;
  status: UpdatableProcessStatus;
  hasIssue: boolean; // status === 'not_updated'
  comment?: string | null;
  imageUrl?: string | null;
  createdAt: FieldValue;
}

/**
 * Configuration for creating audit services
 */
export interface AuditServiceConfig {
  auditCollection: string;
  resultsCollection: string;
}
