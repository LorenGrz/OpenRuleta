type Props = {
  src: string;
  alt: string;
  /** Pass the height here, e.g. "h-12 md:h-14". */
  className?: string;
};

/** Header logo. `src` points at a file in the app's `public/` dir. */
export function Wordmark({ src, alt, className = "h-12" }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      className={`w-auto rounded-xl bg-white p-2 shadow-sm ${className}`}
    />
  );
}
