import { formatMoney, type Money } from '../../../lib/money';
import { cn } from '../../utils/cn';

// Renders money with tabular numerals so columns line up perfectly. Negative
// amounts go danger by default; positives stay neutral unless `showSign` lifts them.
export interface MoneyCellProps {
  amount: Money;
  locale?: string;
  showSign?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses: Record<NonNullable<MoneyCellProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl font-display font-semibold',
  xl: 'text-3xl font-display font-semibold tracking-tight',
};

export function MoneyCell({ amount, locale, showSign, className, size = 'md' }: MoneyCellProps) {
  const isNegative = amount.amountMinor < 0n;
  const text = formatMoney(amount, locale);
  return (
    <span
      className={cn(
        'tabular whitespace-nowrap',
        sizeClasses[size],
        isNegative && 'text-danger',
        showSign && !isNegative && 'text-success',
        className,
      )}
    >
      {text}
    </span>
  );
}
