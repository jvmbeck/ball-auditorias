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
  active: boolean;
}

const DEFAULT_DAILY5S_GUIDANCE = {
  1: 'Area desorganizada, com sujeira visivel e materiais fora do local definido.',
  3: 'Area parcialmente organizada, com pequenos desvios de limpeza ou sinalizacao.',
  5: 'Area exemplar, limpa, organizada e com padrao visual totalmente mantido.',
} as const;

export const DAILY5S_PROCESS_DEFINITIONS: Daily5sProcessDefinition[] = [
  {
    key: 'chs',
    section: 'frontEnd',
    label: 'CHS',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'areaDeBobina',
    section: 'frontEnd',
    label: 'Area de Bobina',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: false,
  },
  {
    key: 'minster',
    section: 'frontEnd',
    label: 'Minster',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: false,
  },
  {
    key: 'bms',
    section: 'frontEnd',
    label: "BM's",
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'pisoDasBms',
    section: 'frontEnd',
    label: "Piso das BM's",
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'plataformaBms',
    section: 'frontEnd',
    label: "Plataforma BM's",
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'recuperadorDeLataFrontEnd',
    section: 'frontEnd',
    label: 'Recuperador de lata do Front End',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: false,
  },
  {
    key: 'pickUpSystemFrontEnd',
    section: 'frontEnd',
    label: 'Pick Up Sistem do Front End',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'mezaninoFrontMinsterAtePt',
    section: 'frontEnd',
    label: 'Mezanino Front (Minster ate a PT)',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'mezaninoFrontAreaDoT',
    section: 'frontEnd',
    label: 'Mezanino Front (Area do T)',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'mezaninoSuperiorLavadora2',
    section: 'frontEnd',
    label: 'Mezanino Superior Lavadora 2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'compactadora',
    section: 'frontEnd',
    label: 'Compactadora',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'sos1',
    section: 'frontEnd',
    label: 'SOS 1',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'sos2',
    section: 'frontEnd',
    label: 'SOS 2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'areaDaOsmose',
    section: 'frontEnd',
    label: 'Area da Osmose',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: false,
  },
  {
    key: 'lavadoras',
    section: 'frontEnd',
    label: 'Lavadoras',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'recuperadoresDaLavadora',
    section: 'frontEnd',
    label: 'Recuperadores da lavadora',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: false,
  },
  {
    key: 'singleFilerPts1e2',
    section: 'backEnd',
    label: "Single filer das PT's 1 e 2",
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'singleFilerPt3',
    section: 'backEnd',
    label: 'Single filer da PT3',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'saidaPinOvensInferior3Pts',
    section: 'backEnd',
    label: "Saida dos Pin Ovens inferior (3 PT's)",
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'saidaPinOvensSuperior3Pts',
    section: 'backEnd',
    label: "Saida dos Pin Ovens superior (3 PT's)",
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'areaEntrePt2ePt3',
    section: 'backEnd',
    label: 'Area entre PT2 e PT3',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'areaEntrePt1ePt2',
    section: 'backEnd',
    label: 'Area entre PT1 e PT2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'mezaninoEntradaIsLinha2',
    section: 'backEnd',
    label: 'Mezanino entrada do IS linha 2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: false,
  },
  {
    key: 'mezaninoDosIs',
    section: 'backEnd',
    label: 'Mezanino dos IS',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'mezaninoSaidaPulmaoPt2e3',
    section: 'backEnd',
    label: 'Mezanino - Saida do pulmao das PT 2 e 3',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'presscoMezanino',
    section: 'backEnd',
    label: 'Pressco (mezanino)',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: false,
  },
  {
    key: 'mezaninoBidiNc2',
    section: 'backEnd',
    label: 'Mezanino BIDI NC2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'necker',
    section: 'backEnd',
    label: 'Necker',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'pickupSystem',
    section: 'backEnd',
    label: 'Pickup System',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'recuperadorDeLatasNc2',
    section: 'backEnd',
    label: 'Recuperador de latas NC2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'finalDeLinha',
    section: 'backEnd',
    label: 'Final de linha',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'corredorEntrePaletizadoras',
    section: 'backEnd',
    label: 'Corredor entre Paletizadoras',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'waxerNc1',
    section: 'backEnd',
    label: 'Waxer NC 1',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'waxerNc2',
    section: 'backEnd',
    label: 'Waxer NC 2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'limpezaFossoElevadorFrontEndLinha2',
    section: 'backEnd',
    label: 'Limpeza fosso elevador do front end linha 2',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
  },
  {
    key: 'areaDosInsideSprays',
    section: 'backEnd',
    label: 'Area dos Inside Sprays',
    guidance: DEFAULT_DAILY5S_GUIDANCE,
    active: true,
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

// Separate lists for front-end and back-end processes, these are used for filtering in the UI and for analytics purposes
export const DAILY5S_FRONTEND_PROCESS_DEFINITIONS = DAILY5S_PROCESS_DEFINITIONS.filter(
  (process) => process.section === 'frontEnd',
);

export const DAILY5S_BACKEND_PROCESS_DEFINITIONS = DAILY5S_PROCESS_DEFINITIONS.filter(
  (process) => process.section === 'backEnd',
);

// Used for the actual auditing process, only active processes are included in this list
export const ACTIVE_DAILY5S_PROCESS_DEFINITIONS = DAILY5S_PROCESS_DEFINITIONS.filter(
  (process) => process.active,
);

export const ACTIVE_DAILY5S_FRONTEND_PROCESS_DEFINITIONS = DAILY5S_PROCESS_DEFINITIONS.filter(
  (process) => process.section === 'frontEnd' && process.active,
);

export const ACTIVE_DAILY5S_BACKEND_PROCESS_DEFINITIONS = DAILY5S_PROCESS_DEFINITIONS.filter(
  (process) => process.section === 'backEnd' && process.active,
);

export const DAILY5S_MAXIMUM_DAILY_POINTS = ACTIVE_DAILY5S_PROCESS_DEFINITIONS.length * 5;

// Fallback value for max possible score in case of legacy data that doesn't have the maxPossibleScoreByDate field
export const DAILY5S_LEGACY_MAXIMUM_DAILY_POINTS = 185;

export function isDaily5sProcessKey(value: string): value is Daily5sAuditProcessKey {
  return DAILY5S_PROCESS_DEFINITIONS.some((process) => process.key === value);
}
