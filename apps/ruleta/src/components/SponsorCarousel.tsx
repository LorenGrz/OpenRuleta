/* eslint-disable @next/next/no-img-element */
import { siteConfig, type Sponsor } from "@openruleta/config";
import { Marquee } from "@openruleta/ui";

/** Compact dark-panel variant of the form's carousel. Same marquee + data. */
function Card({ sponsor }: { sponsor: Sponsor }) {
  return (
    <figure className="mr-3 flex h-14 w-28 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg bg-white px-3 shadow-[0_4px_16px_rgba(0,0,0,0.45)] ring-1 ring-black/5">
      {sponsor.src ? (
        <img
          src={sponsor.src}
          alt={sponsor.name}
          decoding="async"
          className="max-h-7 w-auto max-w-[92px] object-contain"
        />
      ) : (
        <figcaption className="line-clamp-2 text-center text-[10px] font-bold leading-tight text-primary">
          {sponsor.name}
        </figcaption>
      )}
      {sponsor.tier && (
        <figcaption className="text-[8px] font-semibold uppercase tracking-[0.12em] text-primary/60">
          {sponsor.tier}
        </figcaption>
      )}
    </figure>
  );
}

export function SponsorCarousel() {
  return (
    <Marquee ariaLabel={siteConfig.ruleta.messages.sponsorsLabel}>
      {siteConfig.sponsors.map((sponsor) => (
        <Card key={sponsor.name} sponsor={sponsor} />
      ))}
    </Marquee>
  );
}
