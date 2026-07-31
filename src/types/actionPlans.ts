import type { Daily5sActionPlanOwner, Daily5sIssueReason } from 'src/types/audit';
import type { FieldValue, Timestamp } from 'firebase/firestore';

export const ACTION_OWNER_BY_REASON: Record<Daily5sIssueReason, Daily5sActionPlanOwner> = {
  'Latas acumuladas': 'Turma ou Cormat',
  'Sujeira no Piso': 'Sodexo',
  'Sujeira nas Máquinas': 'Turma ou Cormat',
  Desorganização: 'Turma',
};

export interface ActionPlanDocument {
  auditDate: FieldValue;
  processKey: string;
  processName: string;
  auditorId: string;
  reason: Daily5sIssueReason;
  owner: Daily5sActionPlanOwner;
  status: 'Aberto' | 'Em andamento' | 'Concluído';
  createdAt: FieldValue | Timestamp;
  completedAt?: FieldValue | Timestamp;
}
