import type { SurveyLine } from '../store';

export function getLineTypeLabel(lineType: SurveyLine['lineType']) {
  if (!lineType) return 'UNKNOWN';
  if (lineType === 'LT_440V') return 'LT LINE';
  if (typeof lineType === 'string') return lineType.replace('_', ' ');
  return String(lineType);
}
