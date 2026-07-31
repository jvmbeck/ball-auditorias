export type Daily5sRatingValue = 1 | 3 | 5;

export type Daily5sIssueReason =
  | 'Latas acumuladas'
  | 'Sujeira no Piso'
  | 'Sujeira nas Máquinas'
  | 'Desorganização';

export type AuditTurma = 'A e C' | 'B e D';

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

export interface Daily5sScoreTrendData {
  labels: string[];
  percentages: number[];
  totals: number[];
  percentagesByDate: Record<string, number>;
  totalsByDate: Record<string, number>;
}

export type Daily5sHeatmapValue = Daily5sRatingValue | 0;

export interface Daily5sHeatmapCategory {
  key: string;
  date: string;
  turma: AuditTurma;
  label: string;
}

export type Daily5sHeatmapPoint = [number, number, Daily5sHeatmapValue];

export interface Daily5sMonthlyHeatmapData {
  monthKey: string;
  processLabels: string[];
  processKeys: Daily5sAuditProcessKey[];
  xAxisCategories: Daily5sHeatmapCategory[];
  points: Daily5sHeatmapPoint[];
}

export interface Daily5sCanonicalRow {
  date: string;
  turma: AuditTurma;
  process: Daily5sAuditProcessKey;
  rating: Daily5sHeatmapValue;
  grade1Reason: Daily5sIssueReason[];
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
  turma: AuditTurma | null;
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
  byProcess: Daily5sIssueByProcessData;
}

export interface Daily5sIssueByReasonAndTurmaData {
  reasons: Daily5sIssueReason[];
  seriesAC: number[];
  seriesBD: number[];
  grandTotal: number;
}

export interface Daily5sIssueByProcessEntry {
  processKey: Daily5sAuditProcessKey;
  seriesAC: number[];
  seriesBD: number[];
  total: number;
}

export interface Daily5sIssueByProcessData {
  reasons: Daily5sIssueReason[];
  processes: Daily5sIssueByProcessEntry[];
  grandTotal: number;
}

export interface Daily5sRating1ByProcessData {
  labels: string[];
  data: number[];
  total: number;
}

export type Daily5sActionPlanOwner = 'Turma ou Cormat' | 'Sodexo' | 'Turma' | 'Nao definido';

export interface Daily5sActionPlanRow {
  id: string;
  date: string;
  turma: AuditTurma;
  process: string;
  auditor: string;
  processResponsible: string;
  reason: Daily5sIssueReason;
  whoShouldAct: Daily5sActionPlanOwner;
}

export interface Daily5sActionPlanData {
  rows: Daily5sActionPlanRow[];
  total: number;
}

export interface Daily5sMonthlyScoreTrendByTurmaData {
  monthKey: string;
  ac: Daily5sScoreTrendData;
  bd: Daily5sScoreTrendData;
}
