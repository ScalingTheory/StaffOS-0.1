export const RESUME_TARGET_MATRIX: Record<string, Record<string, number>> = {
  HIGH: {
    Easy: 6,
    Medium: 4,
    Tough: 2,
  },
  MEDIUM: {
    Easy: 5,
    Medium: 3,
    Tough: 2,
  },
  LOW: {
    Easy: 4,
    Medium: 3,
    Tough: 2,
  },
};

export function getResumeTarget(criticality: string, toughness: string): number {
  const criticalityUpper = criticality?.toUpperCase() || 'MEDIUM';
  const toughnessCapitalized = toughness 
    ? toughness.charAt(0).toUpperCase() + toughness.slice(1).toLowerCase()
    : 'Medium';
  
  return RESUME_TARGET_MATRIX[criticalityUpper]?.[toughnessCapitalized] ?? 4;
}

export type CriticalityLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ToughnessLevel = 'Easy' | 'Medium' | 'Tough';
export type MetricsScope = 'recruiter' | 'team' | 'org';
