export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <g stroke="var(--on-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 8 13.5 18.5" />
        <path d="M11 14.5 17.5 21" />
        <path d="M13.5 18.5 9 23" />
      </g>
      <circle cx="8" cy="24" r="1.6" fill="var(--on-primary)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-hand font-bold text-logo ${className}`}>Excalibur</span>;
}