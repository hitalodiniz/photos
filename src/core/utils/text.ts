import { SegmentType } from '../config/plans';
import { SEGMENT_DICTIONARY } from '../config/segments';

// core/utils/text.ts
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const getSegmentTerms = () => {
  const segment = (process.env.NEXT_PUBLIC_APP_SEGMENT ||
    'PHOTOGRAPHER') as SegmentType;
  return SEGMENT_DICTIONARY[segment];
};
