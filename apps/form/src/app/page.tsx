import { siteConfig } from "@openruleta/config";

import { CollaboratorCarousel } from "@/components/CollaboratorCarousel";
import { RaffleForm } from "@/components/RaffleForm";
import { SponsorCarousel } from "@/components/SponsorCarousel";

const { sponsorsLabel, collaboratorsLabel, privacyNote } =
  siteConfig.form.messages;

export default function HomePage() {
  return (
    <div className="bg-brand-gradient flex min-h-full flex-col">
      <main className="flex flex-1 flex-col items-center gap-3 py-4 md:gap-5 md:py-6">
        {/* Full-bleed carousels, flush to the edges. */}
        <div className="w-full">
          <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
            {sponsorsLabel}
          </p>
          <SponsorCarousel />
        </div>

        <div className="flex w-full max-w-[480px] flex-col items-center px-4">
          <RaffleForm />
        </div>

        <div className="w-full">
          <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
            {collaboratorsLabel}
          </p>
          <CollaboratorCarousel />
        </div>

        <p className="max-w-[480px] px-4 text-center text-[11px] leading-relaxed text-white/55">
          {privacyNote}
        </p>
      </main>
    </div>
  );
}
