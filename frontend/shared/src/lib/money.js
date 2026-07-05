export function formatMoney(m, locale = 'en-US') {
    const major = Number(m.amountMinor) / 100;
    return new Intl.NumberFormat(locale, { style: 'currency', currency: m.currency }).format(major);
}
