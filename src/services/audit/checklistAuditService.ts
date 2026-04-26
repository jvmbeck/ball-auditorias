import { createAuditService } from './createAuditService';

// RTO audit service with specific collection configuration
export const checklistAuditService = createAuditService({
  auditCollection: 'rtoAudits',
  resultsCollection: 'rtoProcessResults',
});
