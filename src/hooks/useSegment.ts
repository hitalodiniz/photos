// hooks/useSegment.ts
import { SEGMENT_TERMS } from '@/core/config/segments';

export function useSegment() {
  const segment = (process.env.NEXT_PUBLIC_APP_SEGMENT ||
    'PHOTOGRAPHER') as keyof typeof SEGMENT_TERMS;

  return {
    segment,
    terms: SEGMENT_TERMS[segment],
  };
}
