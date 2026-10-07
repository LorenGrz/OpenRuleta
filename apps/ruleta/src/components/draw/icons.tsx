type IconProps = { className?: string };

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function WheelIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 1.75v12.5M1.75 8h12.5M3.6 3.6l8.8 8.8M12.4 3.6l-8.8 8.8" />
    </svg>
  );
}

export function SlotIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2" y="1.75" width="12" height="12.5" rx="2" />
      <path d="M2 5.5h12M2 10.5h12" />
    </svg>
  );
}

export function GridIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="1.75" y="1.75" width="5" height="5" rx="1" />
      <rect x="9.25" y="1.75" width="5" height="5" rx="1" />
      <rect x="1.75" y="9.25" width="5" height="5" rx="1" />
      <rect x="9.25" y="9.25" width="5" height="5" rx="1" />
    </svg>
  );
}

export function PlinkoIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="3" r="0.6" fill="currentColor" />
      <circle cx="5.5" cy="6.5" r="0.6" fill="currentColor" />
      <circle cx="10.5" cy="6.5" r="0.6" fill="currentColor" />
      <circle cx="3" cy="10" r="0.6" fill="currentColor" />
      <circle cx="8" cy="10" r="0.6" fill="currentColor" />
      <circle cx="13" cy="10" r="0.6" fill="currentColor" />
      <path d="M1.75 14.25h12.5M6 12.5v1.75M10 12.5v1.75" />
    </svg>
  );
}
