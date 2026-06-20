// The glass-sphere brand mark + "BUSINESS OS" wordmark. Inline SVG so it
// stays crisp at any density and inherits color from the surrounding text.

export function KoraLogo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <KoraGlyph className="size-12 shrink-0" />
        <div className="flex flex-col leading-none">
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink">KORA</span>
          <span className="text-[10px] font-semibold tracking-[0.22em] text-ink-muted">BUSINESS OS</span>
        </div>
      </div>
    </div>
  );
}

export function KoraGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <radialGradient id="kora-sphere" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#dfe7ff" />
          <stop offset="35%" stopColor="#8ea4ff" />
          <stop offset="75%" stopColor="#5a78f5" />
          <stop offset="100%" stopColor="#3340c0" />
        </radialGradient>
        <radialGradient id="kora-sheen" cx="30%" cy="22%" r="40%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <linearGradient id="kora-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20" fill="url(#kora-sphere)" />
      <circle cx="24" cy="24" r="20" fill="url(#kora-sheen)" />
      <path
        d="M16 14v20M16 24l11-10M16 24l11 10"
        fill="none"
        stroke="url(#kora-stroke)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="19.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
    </svg>
  );
}
