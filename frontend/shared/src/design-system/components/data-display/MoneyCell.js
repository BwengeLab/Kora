import { jsx as _jsx } from "react/jsx-runtime";
import { formatMoney } from '../../../lib/money';
import { cn } from '../../utils/cn';
const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl font-display font-semibold',
    xl: 'text-3xl font-display font-semibold tracking-tight',
};
export function MoneyCell({ amount, locale, showSign, className, size = 'md' }) {
    const isNegative = amount.amountMinor < 0n;
    const text = formatMoney(amount, locale);
    return (_jsx("span", { className: cn('tabular whitespace-nowrap', sizeClasses[size], isNegative && 'text-danger', showSign && !isNegative && 'text-success', className), children: text }));
}
