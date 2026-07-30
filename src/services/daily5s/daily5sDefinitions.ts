import type { Daily5sAuditProcessKey } from 'src/types/audit';

export type Daily5sProcessSection = 'frontEnd' | 'backEnd';

export const DAILY5S_ISSUE_REASONS = [
  'Latas acumuladas',
  'Sujeira no Piso',
  'Sujeira nas Máquinas',
  'Desorganização',
] as const;

export type Daily5sIssueReason = (typeof DAILY5S_ISSUE_REASONS)[number];

export function isDaily5sIssueReason(value: unknown): value is Daily5sIssueReason {
  return typeof value === 'string' && DAILY5S_ISSUE_REASONS.includes(value as Daily5sIssueReason);
}

export interface Daily5sProcessDefinition {
  key: Daily5sAuditProcessKey;
  section: Daily5sProcessSection;
  label: string;
  guidance: {
    1: string;
    3: string;
    5: string;
  };
}

const DEFAULT_DAILY5S_GUIDANCE = {
  1: 'Area desorganizada, com sujeira visivel e materiais fora do local definido.',
  3: 'Area parcialmente organizada, com pequenos desvios de limpeza ou sinalizacao.',
  5: 'Area exemplar, limpa, organizada e com padrao visual totalmente mantido.',
} as const;

export const DAILY5S_PROCESS_DEFINITIONS: Daily5sProcessDefinition[] = [
  { key: 'chs', section: 'frontEnd', label: 'CHS', guidance: DEFAULT_DAILY5S_GUIDANCE },
  {
    key: 'areaDeBobina',
    section: 'frontEnd',
    label: 'Area de Bobina',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'minster',
    section: 'frontEnd',
    label: 'Minster',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  { key: 'bms', section: 'frontEnd', label: "BM's", guidance: DEFAULT_DAILY5S_GUIDANCE },
  {
    key: 'pisoDasBms',
    section: 'frontEnd',
    label: "Piso das BM's",
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'plataformaBms',
    section: 'frontEnd',
    label: "Plataforma BM's",
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'recuperadorDeLataFrontEnd',
    section: 'frontEnd',
    label: 'Recuperador de lata do Front End',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'pickUpSystemFrontEnd',
    section: 'frontEnd',
    label: 'Pick Up Sistem do Front End',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'mezaninoFrontMinsterAtePt',
    section: 'frontEnd',
    label: 'Mezanino Front (Minster ate a PT)',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'mezaninoFrontAreaDoT',
    section: 'frontEnd',
    label: 'Mezanino Front (Area do T)',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'mezaninoSuperiorLavadora2',
    section: 'frontEnd',
    label: 'Mezanino Superior Lavadora 2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'compactadora',
    section: 'frontEnd',
    label: 'Compactadora',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  { key: 'sos1', section: 'frontEnd', label: 'SOS 1', guidance: DEFAULT_DAILY5S_GUIDANCE },
  { key: 'sos2', section: 'frontEnd', label: 'SOS 2', guidance: DEFAULT_DAILY5S_GUIDANCE },
  {
    key: 'areaDaOsmose',
    section: 'frontEnd',
    label: 'Area da Osmose',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'lavadoras',
    section: 'frontEnd',
    label: 'Lavadoras',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'recuperadoresDaLavadora',
    section: 'frontEnd',
    label: 'Recuperadores da lavadora',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'singleFilerPts1e2',
    section: 'backEnd',
    label: "Single filer das PT's 1 e 2",
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'singleFilerPt3',
    section: 'backEnd',
    label: 'Single filer da PT3',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'saidaPinOvensInferior3Pts',
    section: 'backEnd',
    label: "Saida dos Pin Ovens inferior (3 PT's)",
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'saidaPinOvensSuperior3Pts',
    section: 'backEnd',
    label: "Saida dos Pin Ovens superior (3 PT's)",
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'areaEntrePt2ePt3',
    section: 'backEnd',
    label: 'Area entre PT2 e PT3',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'areaEntrePt1ePt2',
    section: 'backEnd',
    label: 'Area entre PT1 e PT2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'mezaninoEntradaIsLinha2',
    section: 'backEnd',
    label: 'Mezanino entrada do IS linha 2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'mezaninoDosIs',
    section: 'backEnd',
    label: 'Mezanino dos IS',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'mezaninoSaidaPulmaoPt2e3',
    section: 'backEnd',
    label: 'Mezanino - Saida do pulmao das PT 2 e 3',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'presscoMezanino',
    section: 'backEnd',
    label: 'Pressco (mezanino)',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'mezaninoBidiNc2',
    section: 'backEnd',
    label: 'Mezanino BIDI NC2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  { key: 'necker', section: 'backEnd', label: 'Necker', guidance: DEFAULT_DAILY5S_GUIDANCE },
  {
    key: 'pickupSystem',
    section: 'backEnd',
    label: 'Pickup System',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'recuperadorDeLatasNc2',
    section: 'backEnd',
    label: 'Recuperador de latas NC2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'finalDeLinha',
    section: 'backEnd',
    label: 'Final de linha',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'corredorEntrePaletizadoras',
    section: 'backEnd',
    label: 'Corredor entre Paletizadoras',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'waxerNc1',
    section: 'backEnd',
    label: 'Waxer NC 1',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'waxerNc2',
    section: 'backEnd',
    label: 'Waxer NC 2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'limpezaFossoElevadorFrontEndLinha2',
    section: 'backEnd',
    label: 'Limpeza fosso elevador do front end linha 2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
  {
    key: 'areaDosInsideSprays',
    section: 'backEnd',
    label: 'Area dos Inside Sprays',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
  },
];

export const DAILY5S_PROCESS_LABELS: Record<Daily5sAuditProcessKey, string> =
  DAILY5S_PROCESS_DEFINITIONS.reduce(
    (acc, process) => {
      acc[process.key] = process.label;
      return acc;
    },
    {} as Record<Daily5sAuditProcessKey, string>,
  );

export const DAILY5S_PROCESS_SECTION_LABELS: Record<Daily5sProcessSection, string> = {
  frontEnd: 'Front End',
  backEnd: 'Back End',
};

export const DAILY5S_PROCESS_SECTION_BY_KEY: Record<Daily5sAuditProcessKey, Daily5sProcessSection> =
  DAILY5S_PROCESS_DEFINITIONS.reduce(
    (acc, process) => {
      acc[process.key] = process.section;
      return acc;
    },
    {} as Record<Daily5sAuditProcessKey, Daily5sProcessSection>,
  );

export const DAILY5S_FRONTEND_PROCESS_DEFINITIONS = DAILY5S_PROCESS_DEFINITIONS.filter(
  (process) => process.section === 'frontEnd',
);

export const DAILY5S_BACKEND_PROCESS_DEFINITIONS = DAILY5S_PROCESS_DEFINITIONS.filter(
  (process) => process.section === 'backEnd',
);

export function isDaily5sProcessKey(value: string): value is Daily5sAuditProcessKey {
  return DAILY5S_PROCESS_DEFINITIONS.some((process) => process.key === value);
}
