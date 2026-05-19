import type { FieldValue, Timestamp } from 'firebase/firestore';

export type AuditStatus = 'in_progress' | 'completed';

export type AuditType = 'rto' | 'board5s' | 'daily5s';

export type Daily5sRatingValue = 1 | 3 | 5;

export type Daily5sIssueReason =
  | 'Latas acumuladas'
  | 'Sujeira no Piso'
  | 'Sujeira nas Máquinas'
  | 'Desorganização';

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
  | 'chs'
  | 'areaDeBobina'
  | 'minster'
  | 'bms'
  | 'pisoDasBms'
  | 'plataformaBms'
  | 'recuperadorDeLataFrontEnd'
  | 'pickUpSystemFrontEnd'
  | 'mezaninoFrontMinsterAtePt'
  | 'mezaninoFrontAreaDoT'
  | 'mezaninoSuperiorLavadora2'
  | 'compactadora'
  | 'sos1'
  | 'sos2'
  | 'areaDaOsmose'
  | 'lavadoras'
  | 'recuperadoresDaLavadora'
  | 'singleFilerPts1e2'
  | 'singleFilerPt3'
  | 'saidaPinOvensInferior3Pts'
  | 'saidaPinOvensSuperior3Pts'
  | 'areaEntrePt2ePt3'
  | 'areaEntrePt1ePt2'
  | 'mezaninoEntradaIsLinha2'
  | 'mezaninoDosIs'
  | 'mezaninoSaidaPulmaoPt2e3'
  | 'presscoMezanino'
  | 'mezaninoBidiNc2'
  | 'necker'
  | 'pickupSystem'
  | 'recuperadorDeLatasNc2'
  | 'finalDeLinha'
  | 'corredorEntrePaletizadoras'
  | 'waxerNc1'
  | 'waxerNc2'
  | 'limpezaFossoElevadorFrontEndLinha2'
  | 'areaDosInsideSprays';

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
  imageUrls?: string[] | null;
}

export type PrinterChecks = Record<PrinterCheckKey, PrinterCheckResult>;

export interface AuditProcess {
  status: AuditProcessStatus;
  comment?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
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

export interface Daily5sScoreTrendData {
  labels: string[];
  percentages: number[];
  totals: number[];
  percentagesByDate: Record<string, number>;
  totalsByDate: Record<string, number>;
}

export type Daily5sTurma = 'A e C' | 'B e D';

export type Daily5sHeatmapValue = Daily5sRatingValue | 0;

export interface Daily5sHeatmapCategory {
  key: string;
  date: string;
  turma: Daily5sTurma;
  label: string;
}

export type Daily5sHeatmapPoint = [number, number, Daily5sHeatmapValue];

export interface Daily5sMonthlyHeatmapData {
  monthKey: string;
  processLabels: string[];
  xAxisCategories: Daily5sHeatmapCategory[];
  points: Daily5sHeatmapPoint[];
}

export interface Daily5sCanonicalRow {
  id: string;
  date: string;
  turma: Daily5sTurma;
  process: Daily5sAuditProcessKey;
  rating: Daily5sHeatmapValue;
  status: Exclude<AuditProcessStatus, null> | null;
  hasIssue: boolean;
  comment: Daily5sIssueReason | null;
  createdAtMs: number;
}

export interface Daily5sCanonicalMonthlyData {
  monthKey: string;
  startKey: string;
  endKey: string;
  rows: Daily5sCanonicalRow[];
}

export interface Daily5sIssueAnalyticsBucket {
  key: string;
  date: string;
  turma: Daily5sTurma | null;
  displayLabel: string;
  countsByReason: Record<Daily5sIssueReason, number>;
  total: number;
}

export interface Daily5sIssueAnalyticsSeries {
  key: Daily5sIssueReason;
  label: string;
  color: string;
  data: number[];
}

export interface Daily5sIssueAnalyticsViewData {
  labels: string[];
  buckets: Daily5sIssueAnalyticsBucket[];
  series: Daily5sIssueAnalyticsSeries[];
  grandTotal: number;
}

export interface Daily5sIssueAnalyticsData {
  monthKey: string;
  byTurmaTime: Daily5sIssueAnalyticsViewData;
  overall: Daily5sIssueAnalyticsViewData;
  byReasonAndTurma: Daily5sIssueByReasonAndTurmaData;
}

export interface Daily5sIssueByReasonAndTurmaData {
  reasons: Daily5sIssueReason[];
  seriesAC: number[];
  seriesBD: number[];
  grandTotal: number;
}

export interface Daily5sRating1ByProcessData {
  labels: string[];
  data: number[];
  total: number;
}

export interface Daily5sMonthlyScoreTrendByTurmaData {
  monthKey: string;
  ac: Daily5sScoreTrendData;
  bd: Daily5sScoreTrendData;
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
  imageUrls?: string[] | null;
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
