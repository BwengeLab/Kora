import {
  ArrowLeftRight,
  CreditCard,
  FileSignature,
  GitBranch,
  Inbox,
  Undo2,
  type LucideIcon,
} from 'lucide-react';

export const TYPE_ICON: Record<ApprovalType, LucideIcon> = {
  match: GitBranch,
  payment: CreditCard,
  collection: Inbox,
  posting: ArrowLeftRight,
  renewal: FileSignature,
  refund: Undo2,
};

export const TYPE_TONE: Record<ApprovalType, string> = {
  match: 'bg-ai-soft text-ai',
  payment: 'bg-brand-soft text-brand-ink',
  collection: 'bg-info-soft text-info',
  posting: 'bg-lavender-soft text-lavender',
  renewal: 'bg-warning-soft text-warning',
  refund: 'bg-success-soft text-success',
};

export const RISK_LABEL: Record<ApprovalRisk, string> = {
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
};

export const RISK_TONE: Record<ApprovalRisk, string> = {
  low: 'bg-success-soft text-success',
  medium: 'bg-warning-soft text-warning',
  high: 'bg-danger-soft text-danger',
};
