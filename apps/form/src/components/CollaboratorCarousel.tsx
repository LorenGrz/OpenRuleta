/* eslint-disable @next/next/no-img-element */
import { siteConfig, type Collaborator } from "@openruleta/config";
import { Marquee } from "@openruleta/ui";

const CARD =
  "mr-3 flex h-14 w-28 shrink-0 items-center justify-center rounded-xl bg-white px-3 shadow-[0_6px_20px_rgba(0,20,60,0.15)] ring-1 ring-white/40 sm:mr-4 sm:h-20 sm:w-44 sm:px-4";

function Card({ collaborator }: { collaborator: Collaborator }) {
  if (collaborator.src) {
    return (
      <figure className={CARD}>
        <img
          src={collaborator.src}
          alt={collaborator.name}
          decoding="async"
          className="max-h-11 w-auto max-w-[92px] object-contain transition duration-300 hover:scale-105 sm:max-h-14 sm:max-w-[144px]"
        />
      </figure>
    );
  }
  return (
    <figure className={`${CARD} text-center`}>
      <figcaption className="line-clamp-3 text-[11px] font-bold leading-tight text-primary sm:text-sm">
        {collaborator.name}
      </figcaption>
    </figure>
  );
}

export function CollaboratorCarousel() {
  // A longer list needs a longer loop to keep the scroll speed even.
  const duration = 45 + Math.max(0, siteConfig.collaborators.length - 8) * 5;
  return (
    <Marquee
      ariaLabel={siteConfig.form.messages.collaboratorsLabel}
      durationSeconds={duration}
      className="py-1"
    >
      {siteConfig.collaborators.map((c) => (
        <Card key={c.name} collaborator={c} />
      ))}
    </Marquee>
  );
}
