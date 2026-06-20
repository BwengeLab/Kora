import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { StatusChip } from './StatusChip';

export type RiskLevel = 'low' | 'medium' | 'high';

const config = {
  low: { tone: 'success' as const, icon: <ShieldCheck />, label: 'Low risk' },
  medium: { tone: 'warning' as const, icon: <AlertTriangle />, label: 'Medium risk' },
  high: { tone: 'danger' as const, icon: <ShieldAlert />, label: 'High risk' },
};

export function RiskFlag({ level, label }: { level: RiskLevel; label?: string }) {
  const c = config[level];
  return (
    <StatusChip tone={c.tone} icon={c.icon}>
      {label ?? c.label}
    </StatusChip>
  );
}
