import { confidenceTier } from '../../tokens';
import { StatusChip, type StatusTone } from './StatusChip';

// Visualizes the reconciliation pipeline's confidence tiers (doc 06 §5):
//   95–100 auto → success · 70–94 suggested → warning · <70 review → danger.
// Always shown next to a match/recommendation so the user knows what trust
// tier they're acting in.
export interface ConfidenceChipProps {
  score: number;
  className?: string;
}

const tierToTone: Record<ReturnType<typeof confidenceTier>, StatusTone> = {
  auto: 'success',
  suggested: 'warning',
  review: 'danger',
};

const tierToLabel: Record<ReturnType<typeof confidenceTier>, string> = {
  auto: 'Auto',
  suggested: 'Suggested',
  review: 'Review',
};

export function ConfidenceChip({ score, className }: ConfidenceChipProps) {
  const tier = confidenceTier(score);
  return (
    <StatusChip tone={tierToTone[tier]} className={className}>
      <span className="tabular">{Math.round(score)}%</span>
      <span aria-hidden className="opacity-60">·</span>
      <span>{tierToLabel[tier]}</span>
    </StatusChip>
  );
}
