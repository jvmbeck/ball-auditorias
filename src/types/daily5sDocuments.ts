import type {
  Daily5sAuditProcessKey,
  Daily5sRatingValue,
  Daily5sIssueReason,
  AuditTurma,
} from './audit';
import type { FieldValue, Timestamp } from 'firebase/firestore';

export interface Daily5sAuditDocument {
  date: string;
  turma: AuditTurma;
  inspector: string;

  aggregateGrades: Partial<Record<Daily5sAuditProcessKey, Daily5sRatingValue>>;

  completedProcesses: number;

  createdAt: Timestamp | FieldValue;
  completedAt?: Timestamp | FieldValue;
}

export interface Daily5sProcessResultDocument {
  date: string;
  turma: AuditTurma;
  process: Daily5sAuditProcessKey;

  rating: Daily5sRatingValue;

  imageUrls: string[];

  grade1Reason: Daily5sIssueReason[];
  grade1Comment: string | null;

  createdAt: Timestamp | FieldValue;
}
