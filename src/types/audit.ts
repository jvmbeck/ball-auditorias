import type { FieldValue, Timestamp } from 'firebase/firestore';

export type AuditStatus = 'in_progress' | 'completed';

export type AuditProcessKey =
  | 'rawMaterials'
  | 'assembly'
  | 'packaging'
  | 'qualityCheck'
  | 'storage'
  | 'shipping'
  | 'safetyInspection';

export type AuditProcessStatus = 'updated' | 'not_updated' | null;

export interface AuditProcess {
  status: AuditProcessStatus;
  comment?: string | null;
  imageUrl?: string | null;
}

export type AuditProcesses = Record<AuditProcessKey, AuditProcess>;

export interface AuditDocument {
  auditorId: string;
  createdAt: Timestamp;
  status: AuditStatus;
  processes: AuditProcesses;
  failedProcesses: number;
  totalProcesses: number;
  hasFailures?: boolean;
}

/** Read-side shape for a factory-level aggregation document in `factoryStats`. */
export interface FactoryStats {
  totalAudits: number;
  totalProcessesChecked: number;
  totalFailures: number;
  lastAuditAt: Timestamp;
  processFailures: Record<AuditProcessKey, number>;
}

/** Write-side shape for a single analytics record in the `auditResults` collection. */
export interface AuditResultDocument {
  auditId: string;
  auditorId: string;
  processKey: string;
  status: UpdatableProcessStatus;
  createdAt: FieldValue;
  hasImage: boolean;
}

export interface NewAuditDocument extends Omit<AuditDocument, 'createdAt'> {
  createdAt: FieldValue;
}

export type UpdatableProcessStatus = Exclude<AuditProcessStatus, null>;
