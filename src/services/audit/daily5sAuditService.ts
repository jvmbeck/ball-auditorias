import { createAuditService } from './createAuditService';

export const daily5sAuditService = createAuditService({
  auditCollection: 'daily5sAudits',
  resultsCollection: 'daily5sProcessResults',
});
