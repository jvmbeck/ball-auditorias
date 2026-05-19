import type { Daily5sAuditProcessKey } from 'src/types/audit';

export interface Daily5sProcessRosterEntry {
  auditor: string;
  backup: string;
  responsible: string;
}

export const DAILY5S_PROCESS_ROSTER: Record<Daily5sAuditProcessKey, Daily5sProcessRosterEntry> = {
  chs: { auditor: 'Arthur A.', backup: 'Artur B.', responsible: 'Diego' },
  areaDeBobina: { auditor: 'Arthur A.', backup: 'Artur B.', responsible: 'Diego' },
  minster: { auditor: 'Arthur A.', backup: 'Artur B.', responsible: 'Diego' },
  bms: { auditor: 'Ricardo', backup: 'Talita', responsible: 'Vinicios' },
  pisoDasBms: { auditor: 'Ricardo', backup: 'Talita', responsible: 'Vinicios' },
  plataformaBms: { auditor: 'Ricardo', backup: 'Talita', responsible: 'Vinicios' },
  recuperadorDeLataFrontEnd: { auditor: 'Ricardo', backup: 'Talita', responsible: 'Vinicios' },
  pickUpSystemFrontEnd: { auditor: 'Amanda', backup: 'Maria', responsible: 'Vinicios' },
  mezaninoFrontMinsterAtePt: { auditor: 'Amanda', backup: 'Maria', responsible: 'Vinicios' },
  mezaninoFrontAreaDoT: { auditor: 'Bruna', backup: 'Tiago', responsible: 'Norberto' },
  mezaninoSuperiorLavadora2: { auditor: 'Bruna', backup: 'Tiago', responsible: 'Norberto' },
  compactadora: { auditor: 'Tiago', backup: 'Bruna', responsible: 'Vinicios' },
  sos1: { auditor: 'Tiago', backup: 'Bruna', responsible: 'Norberto' },
  sos2: { auditor: 'Tiago', backup: 'Bruna', responsible: 'Norberto' },
  areaDaOsmose: { auditor: 'Vanessa', backup: 'Bruno', responsible: 'Norberto' },
  lavadoras: { auditor: 'Vanessa', backup: 'Bruno', responsible: 'Norberto' },
  recuperadoresDaLavadora: { auditor: 'Vanessa', backup: 'Bruno', responsible: 'Norberto' },
  singleFilerPts1e2: { auditor: 'Maria', backup: 'Bruno', responsible: 'Anderson' },
  singleFilerPt3: { auditor: 'Maria', backup: 'Bruno', responsible: 'Anderson' },
  saidaPinOvensInferior3Pts: { auditor: 'Maria', backup: 'Bruno', responsible: 'Anderson' },
  saidaPinOvensSuperior3Pts: { auditor: 'Maria', backup: 'Bruno', responsible: 'Anderson' },
  areaEntrePt2ePt3: { auditor: 'Maria', backup: 'Bruno', responsible: 'Anderson' },
  areaEntrePt1ePt2: { auditor: 'Maria', backup: 'Bruno', responsible: 'Anderson' },
  mezaninoEntradaIsLinha2: { auditor: 'Bruno', backup: 'Maria', responsible: 'Raissa' },
  mezaninoDosIs: { auditor: 'Bruno', backup: 'Maria', responsible: 'Raissa' },
  mezaninoSaidaPulmaoPt2e3: { auditor: 'Bruno', backup: 'Maria', responsible: 'Anderson' },
  presscoMezanino: { auditor: 'Artur B.', backup: 'Arthur A.', responsible: 'Anderson' },
  mezaninoBidiNc2: { auditor: 'Artur B.', backup: 'Arthur A.', responsible: 'Anderson' },
  necker: { auditor: 'Larissa', backup: 'Maria', responsible: 'Eduarda' },
  pickupSystem: { auditor: 'Maria', backup: 'Bruno', responsible: 'Anderson' },
  recuperadorDeLatasNc2: { auditor: 'Artur B.', backup: 'Arthur A.', responsible: 'Anderson' },
  finalDeLinha: { auditor: 'Maria', backup: 'Bruno', responsible: 'Webber' },
  corredorEntrePaletizadoras: { auditor: 'Maria', backup: 'Bruno', responsible: 'Webber' },
  waxerNc1: { auditor: 'Larissa', backup: 'Maria', responsible: 'Eduarda' },
  waxerNc2: { auditor: 'Larissa', backup: 'Maria', responsible: 'Eduarda' },
  limpezaFossoElevadorFrontEndLinha2: {
    auditor: 'Amanda',
    backup: 'Larissa',
    responsible: 'Vinicios',
  },
  areaDosInsideSprays: { auditor: 'Bruno', backup: 'Maria', responsible: 'Raissa' },
};
