// src/types/actionPlans.ts

import type { Timestamp } from 'firebase/firestore';
import type {
  Daily5sActionPlanOwner,
  Daily5sAuditProcessKey,
  Daily5sIssueReason,
} from 'src/types/audit';

export const ACTION_PLAN_REASON_KEY: Record<Daily5sIssueReason, string> = {
  'Latas acumuladas': 'latas-acumuladas',
  'Sujeira no Piso': 'sujeira-piso',
  'Sujeira nas Máquinas': 'sujeira-maquinas',
  Desorganização: 'desorganizacao',
};

export const ACTION_OWNER_BY_REASON: Record<Daily5sIssueReason, Daily5sActionPlanOwner> = {
  'Latas acumuladas': 'Turma ou Cormat',
  'Sujeira no Piso': 'Sodexo',
  'Sujeira nas Máquinas': 'Turma ou Cormat',
  Desorganização: 'Turma',
};

export type ActionPlanStatus = 'Aberto' | 'Concluído' | 'Cancelado';

export interface ActionPlanDocument {
  auditDate: string;
  processKey: Daily5sAuditProcessKey;
  processName: string;
  auditorId: string;
  reason: Daily5sIssueReason;
  owner: Daily5sActionPlanOwner;
  status: ActionPlanStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt: Timestamp | null;
  cancelledAt: Timestamp | null;
}

// this is used by the service layer to return action plans with their IDs
export interface ActionPlan extends ActionPlanDocument {
  id: string;
}
