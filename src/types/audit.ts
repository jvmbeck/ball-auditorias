import type { FieldValue, Timestamp } from 'firebase/firestore';

export type AuditStatus = 'in_progress' | 'completed';

export type AuditProcessKey =
  | 'frontEnd'
  | 'lavadora'
  | 'printer'
  | 'necker'
  | 'insideSpray'
  | 'paletizadora';

export type AuditProcessStatus = 'updated' | 'not_updated' | null;

export interface AuditProcess {
  status: AuditProcessStatus;
  comment?: string | null;
  imageUrl?: string | null;
}

export type AuditProcesses = Record<AuditProcessKey, AuditProcess>;

export interface AuditDocument {
  auditorId: string;
  turma: 'A' | 'B' | 'C' | 'D';
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
  turma: 'A' | 'B' | 'C' | 'D' | null;
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

/** Write-side shape for a single analytics record in the `auditResults` collection. */
export interface AuditResultDocument {
  auditId: string;
  auditorId: string;
  turma: 'A' | 'B' | 'C' | 'D';
  dayOfWeek: string;
  yearMonth: string;
  date: string;
  process: string;
  processKey: string;
  status: UpdatableProcessStatus;
  hasIssue: boolean;
  createdAt: FieldValue;
  hasImage: boolean;
}

export interface NewAuditDocument extends Omit<AuditDocument, 'createdAt'> {
  createdAt: FieldValue;
}

export type UpdatableProcessStatus = Exclude<AuditProcessStatus, null>;
