type Props = {
  src: string;
  alt: string;
  /** Pass the height here, e.g. "h-12 md:h-14". */
  className?: string;
};

/**
 * Header logo. `src` points at a file in the app's `public/` dir.
 *
 * The image is shown as-is, with no card behind it: each app ships a `logo.svg`
 * toned for its own background (dark on the form's white card, light on the
 * wheel's near-black header).
 */
export function Wordmark({ src, alt, className = "h-12" }: Props) {
  return <img src={src} alt={alt} className={`w-auto ${className}`} />;
}
