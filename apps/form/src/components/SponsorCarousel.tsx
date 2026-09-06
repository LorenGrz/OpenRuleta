/* eslint-disable @next/next/no-img-element */
import { siteConfig, type Sponsor } from "@openruleta/config";
import { Marquee } from "@openruleta/ui";

function Card({ sponsor }: { sponsor: Sponsor }) {
  return (
    <figure className="mr-3 flex h-14 w-28 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-white px-3 shadow-[0_6px_20px_rgba(0,20,60,0.15)] ring-1 ring-white/40 sm:mr-4 sm:h-20 sm:w-44 sm:gap-1 sm:px-4">
      {sponsor.src ? (
        <img
          src={sponsor.src}
          alt={sponsor.name}
          decoding="async"
          className="max-h-7 w-auto max-w-[88px] object-contain transition duration-300 hover:scale-105 sm:max-h-10 sm:max-w-[130px]"
        />
      ) : (
        <figcaption className="line-clamp-2 text-center text-[11px] font-bold leading-tight text-primary sm:text-sm">
          {sponsor.name}
        </figcaption>
      )}
      {sponsor.tier && (
        <figcaption className="hidden text-[9px] font-semibold uppercase tracking-[0.14em] text-primary/60 sm:block">
          {sponsor.tier}
        </figcaption>
      )}
    </figure>
  );
}

export function SponsorCarousel() {
  return (
    <Marquee
      ariaLabel={siteConfig.form.messages.sponsorsLabel}
      className="py-1"
    >
      {siteConfig.sponsors.map((sponsor) => (
        <Card key={sponsor.name} sponsor={sponsor} />
      ))}
    </Marquee>
  );
}
