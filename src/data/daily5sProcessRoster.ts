import type { Daily5sAuditProcessKey } from 'src/types/audit';

export interface Daily5sProcessRosterEntry {
  auditor: string;
  backup: string;
  responsible: string;
}

export const DAILY5S_PROCESS_ROSTER: Record<Daily5sAuditProcessKey, Daily5sProcessRosterEntry> = {
  chs: { auditor: 'Marcelo', backup: 'Talita', responsible: 'Diego' },
  areaDeBobina: { auditor: '', backup: ' ', responsible: '' },
  minster: { auditor: '', backup: '', responsible: '' },
  bms: { auditor: 'Henrique', backup: 'Bruno', responsible: 'Vinicios' },
  pisoDasBms: { auditor: 'Henrique', backup: 'Bruno', responsible: 'Vinicios' },
  plataformaBms: { auditor: 'Henrique', backup: 'Bruno', responsible: 'Vinicios' },
  recuperadorDeLataFrontEnd: { auditor: '', backup: '', responsible: '' },
  pickUpSystemFrontEnd: { auditor: 'Henrique', backup: 'Bruno', responsible: 'Vinicios' },
  mezaninoFrontMinsterAtePt: { auditor: 'Amanda', backup: 'Larissa', responsible: 'Vinicios' },
  mezaninoFrontAreaDoT: { auditor: 'Bruna', backup: 'Tiago', responsible: 'Norberto' },
  mezaninoSuperiorLavadora2: { auditor: 'Bruna', backup: 'Tiago', responsible: 'Norberto' },
  compactadora: { auditor: 'Tiago', backup: 'Bruna', responsible: 'Vinicios' },
  sos1: { auditor: 'Tiago', backup: 'Bruna', responsible: 'Norberto' },
  sos2: { auditor: 'Tiago', backup: 'Bruna', responsible: 'Norberto' },
  areaDaOsmose: { auditor: '', backup: '', responsible: '' },
  lavadoras: { auditor: 'Bruno', backup: 'Tiago', responsible: 'Norberto' },
  recuperadoresDaLavadora: { auditor: '', backup: '', responsible: '' },
  singleFilerPts1e2: { auditor: 'Larissa', backup: 'Bruno', responsible: 'Anderson' },
  singleFilerPt3: { auditor: 'Larissa', backup: 'Bruno', responsible: 'Anderson' },
  saidaPinOvensInferior3Pts: { auditor: 'Larissa', backup: 'Bruno', responsible: 'Anderson' },
  saidaPinOvensSuperior3Pts: { auditor: 'Larissa', backup: 'Bruno', responsible: 'Anderson' },
  areaEntrePt2ePt3: { auditor: 'Larissa', backup: 'Bruno', responsible: 'Anderson' },
  areaEntrePt1ePt2: { auditor: 'Larissa', backup: 'Bruno', responsible: 'Anderson' },
  mezaninoEntradaIsLinha2: { auditor: '', backup: '', responsible: '' },
  mezaninoDosIs: { auditor: 'Guilherme', backup: 'Bruno', responsible: 'Raissa' },
  mezaninoSaidaPulmaoPt2e3: { auditor: 'Guilherme', backup: 'Bruno', responsible: 'Anderson' },
  presscoMezanino: { auditor: '', backup: '', responsible: '' },
  mezaninoBidiNc2: { auditor: 'Gustavo', backup: 'Artur B.', responsible: 'Anderson' },
  necker: { auditor: 'Bruno', backup: 'Larissa', responsible: 'Eduarda' },
  pickupSystem: { auditor: 'Artur B.', backup: 'Tiago', responsible: 'Anderson' },
  recuperadorDeLatasNc2: { auditor: 'Gustavo', backup: 'Artur B.', responsible: 'Anderson' },
  finalDeLinha: { auditor: 'Artur B.', backup: 'Tiago', responsible: 'Webber' },
  corredorEntrePaletizadoras: { auditor: 'Artur B.', backup: 'Tiago', responsible: 'Webber' },
  waxerNc1: { auditor: 'Bruno', backup: 'Larissa', responsible: 'Eduarda' },
  waxerNc2: { auditor: 'Bruno', backup: 'Larissa', responsible: 'Eduarda' },
  limpezaFossoElevadorFrontEndLinha2: {
    auditor: 'Amanda',
    backup: 'Larissa',
    responsible: 'Vinicios',
  },
  areaDosInsideSprays: { auditor: 'Guilherme', backup: 'Bruno', responsible: 'Raissa' },
};
