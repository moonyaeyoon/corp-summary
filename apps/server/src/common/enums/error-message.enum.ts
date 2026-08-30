export enum ErrorMessage {
  VALIDATION_ERROR = 'Request validation failed',
  REPORT_DATE_REQUIRED = 'Report dates are required',
  REPORT_NAME_ALREADY_EXISTS = 'Report name already exists',
  REPORT_NOT_FOUND = 'Report not found',
  REPORT_ALREADY_RUNNING = 'Report is already running',
  REPORT_SUMMARY_NOT_FOUND = 'Report summary not found',
  REPORT_AGGREGATION_FAILED = 'Report aggregation failed',
  AI_MODEL_NOT_CONFIGURED = 'AI model is not configured',
  AI_SQL_GUIDE_FAILED = 'AI SQL guide generation failed',
  INTERNAL_ERROR = 'Internal server error',
}
