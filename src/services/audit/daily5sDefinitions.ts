import type { Daily5sAuditProcessKey } from 'src/types/audit';

export interface Daily5sProcessDefinition {
  key: Daily5sAuditProcessKey;
  label: string;
  guidance: {
    1: string;
    3: string;
    5: string;
  };
}

export const DAILY5S_PROCESS_DEFINITIONS: Daily5sProcessDefinition[] = [
  {
    key: 'minsters',
    label: 'Minsters',
    guidance: {
      1: 'Area desorganizada, com sujeira visivel e materiais fora do local definido.',
      3: 'Area parcialmente organizada, com pequenos desvios de limpeza ou sinalizacao.',
      5: 'Area exemplar, limpa, organizada e com padrao visual totalmente mantido.',
    },
  },
  {
    key: 'bodyMakers11to14',
    label: 'Body Makers 11 a 14',
    guidance: {
      1: 'Equipamentos e entorno sem padrao de 5S, com risco de desperdicio e retrabalho.',
      3: 'Padrao intermediario: rotina 5S aplicada, mas com inconsistencias pontuais.',
      5: 'Padrao completo de 5S: limpeza, organizacao e disciplina visual consistentes.',
    },
  },
  {
    key: 'bodyMakers15to18',
    label: 'Body Makers 15 a 18',
    guidance: {
      1: 'Desvios criticos de organizacao e limpeza, exigindo acao corretiva imediata.',
      3: 'Conformidade parcial, com oportunidades de melhoria evidentes.',
      5: 'Conformidade total com o padrao 5S esperado para a area.',
    },
  },
  {
    key: 'bodyMakers19to23',
    label: 'Body Makers 19 a 23',
    guidance: {
      1: 'Condicao inadequada de 5S, com itens sem identificacao e area comprometida.',
      3: 'Condicao aceitavel, mas sem consistencia total no padrao diario.',
      5: 'Condicao de referencia, com excelente padronizacao, limpeza e arranjo.',
    },
  },
  {
    key: 'bodyMakers24to31',
    label: 'Body Makers 24 a 31',
    guidance: {
      1: 'Falta de padrao 5S visivel na area e necessidade de intervencao.',
      3: 'Padrao parcialmente atendido, com desvios moderados.',
      5: 'Padrao 5S plenamente atendido com manutencao visual e operacional adequada.',
    },
  },
  {
    key: 'printer1',
    label: 'Printer 1',
    guidance: {
      1: 'Area com falhas relevantes de 5S, sem condicao minima esperada.',
      3: 'Area atende parcialmente ao 5S, com ajustes necessarios.',
      5: 'Area atende plenamente ao 5S, com boa pratica sustentada.',
    },
  },
  {
    key: 'printer2e3',
    label: 'Printer 2 e 3',
    guidance: {
      1: 'Condicao critica de 5S, exigindo justificativa e evidencia imediata.',
      3: 'Condicao intermediaria, com melhorias necessarias para atingir o padrao.',
      5: 'Condicao ideal de 5S, com area limpa, organizada e estabilizada.',
    },
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

export function isDaily5sProcessKey(value: string): value is Daily5sAuditProcessKey {
  return DAILY5S_PROCESS_DEFINITIONS.some((process) => process.key === value);
}
