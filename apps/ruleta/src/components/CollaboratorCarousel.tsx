/* eslint-disable @next/next/no-img-element */
import { siteConfig, type Collaborator } from "@openruleta/config";
import { Marquee } from "@openruleta/ui";

const CARD =
  "mr-3 flex h-14 w-28 shrink-0 items-center justify-center rounded-lg bg-white px-3 shadow-[0_4px_16px_rgba(0,0,0,0.45)] ring-1 ring-black/5";

function Card({ collaborator }: { collaborator: Collaborator }) {
  if (collaborator.src) {
    return (
      <figure className={CARD}>
        <img
          src={collaborator.src}
          alt={collaborator.name}
          decoding="async"
          className="max-h-11 w-auto max-w-[92px] object-contain"
        />
      </figure>
    );
  }
  return (
    <figure className={`${CARD} text-center`}>
      <figcaption className="line-clamp-3 text-[10px] font-bold leading-tight text-primary">
        {collaborator.name}
      </figcaption>
    </figure>
  );
}

export function CollaboratorCarousel() {
  const duration = 40 + Math.max(0, siteConfig.collaborators.length - 8) * 4;
  return (
    <Marquee
      ariaLabel={siteConfig.ruleta.messages.collaboratorsLabel}
      durationSeconds={duration}
    >
      {siteConfig.collaborators.map((c) => (
        <Card key={c.name} collaborator={c} />
      ))}
    </Marquee>
  );
}
