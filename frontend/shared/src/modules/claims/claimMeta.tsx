import { Building2, Car, HeartPulse, Scale, Shield, type LucideIcon } from 'lucide-react';

export const TYPE_ICON: Record<ClaimType, LucideIcon> = {
  motor: Car,
  health: HeartPulse,
  property: Building2,
  liability: Scale,
  life: Shield,
};

export const TYPE_TONE: Record<ClaimType, string> = {
  motor: 'bg-brand-soft text-brand-ink',
  health: 'bg-danger-soft text-danger',
  property: 'bg-warning-soft text-warning',
  liability: 'bg-lavender-soft text-lavender',
  life: 'bg-success-soft text-success',
};

export const SEVERITY_TONE: Record<Severity, string> = {
  low: 'bg-success-soft text-success',
  medium: 'bg-info-soft text-info',
  high: 'bg-warning-soft text-warning',
  critical: 'bg-danger-soft text-danger',
};

export function fraudTone(score: number): string {
  if (score >= 70) return 'bg-danger-soft text-danger';
  if (score >= 40) return 'bg-warning-soft text-warning';
  return 'bg-success-soft text-success';
}
