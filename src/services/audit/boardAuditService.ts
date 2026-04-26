import { createAuditService } from './createAuditService';

// Board 5S audit service with specific collection configuration
export const boardAuditService = createAuditService({
  auditCollection: 'board5sAudits',
  resultsCollection: 'board5sProcessResults',
});
