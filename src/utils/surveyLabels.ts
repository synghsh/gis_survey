import type { SurveyLine } from '../store';

export function getLineTypeLabel(lineType: SurveyLine['lineType']) {
  if (lineType === 'LT_440V') return 'LT LINE';
  return lineType.replace('_', ' ');
}
