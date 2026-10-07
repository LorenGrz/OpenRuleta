/**
 * OpenRuleta — single source of branding, copy and event data.
 *
 * This is the only file you need to edit to make OpenRuleta your own.
 * Everything user-facing in both apps (`apps/form` and `apps/ruleta`) reads
 * from the `siteConfig` object exported at the bottom.
 *
 * Two things live outside this file on purpose:
 *   - Colour palette / fonts  ->  packages/ui/src/theme.css  (Tailwind v4 `@theme`)
 *   - The Google font import   ->  each app's src/app/layout.tsx (compile-time API)
 */

export type Sponsor = {
  name: string;
  /** Path under the app's `public/` dir. Omit to render a name-only card. */
  src?: string;
  /** Free-form tier label shown under the logo (e.g. "Gold"). Optional. */
  tier?: string;
};

export type Collaborator = {
  name: string;
  /** Path under the app's `public/` dir. Omit to render a name-only card. */
  src?: string;
};

export type DocFieldConfig = {
  /** When false, the form drops the field entirely and the DB column stays null. */
  enabled: boolean;
  label: string;
  hint: string;
  placeholder: string;
  /** Max characters accepted by the input. */
  maxLength: number;
  /** Regex source (no slashes) the value must match when the field is enabled. */
  pattern: string;
  /** Prefix shown before the masked value, e.g. "ID ••• 123". */
  displayLabel: string;
  /** Glyphs standing in for the hidden part of the value. */
  maskGlyph: string;
};

/**
 * Landscape 1920x1080 QR poster rendered by `pnpm poster <form-url>`
 * (apps/form/scripts/poster.mjs) and projected full-screen by the wheel's
 * "Show QR" button. Logo and sponsor chips come from `assets.logo` /
 * `sponsors[]`; everything else on the poster is configured here.
 */
export type PosterConfig = {
  /** Big headline. Use `\n` for a line break. */
  title: string;
  /** Uppercase line under the headline (e.g. the event name). */
  subtitle: string;
  /** Short line under the QR code, inside the white card. */
  hint: string;
  /** Label above the sponsor chips. */
  supportLabel: string;
  /** CSS `background` value for the whole poster (colour, gradients…). */
  background: string;
  /** Dark text colour used on white surfaces (QR hint, name-only chips). */
  ink: string;
  /** Accent colour: the URL pill and the glow around the QR card. */
  accent: string;
  /** Google Fonts family name, loaded by the poster page. Default "Montserrat". */
  font?: string;
  /** Put the logo on a white card (for dark logos on a dark background). Default true. */
  logoCard?: boolean;
};

/**
 * Winner email (simulated — OpenRuleta sends nothing). `{name}` and `{prize}`
 * are substituted in `subject` and `body`; `body` is plain text, blank lines
 * become paragraphs in the HTML preview.
 */
export type WinnerEmailConfig = {
  /** "Display Name <address>" or a bare address. */
  from: string;
  subject: string;
  body: string;
};

/** Labels for the four draw modes, keyed by mode id (see apps/ruleta draw registry). */
export type DrawModeLabels = {
  wheel: string;
  slot: string;
  grid: string;
  plinko: string;
};

/**
 * Draw-mode presentation: selector copy, mode labels and the colours the
 * slot / grid / plinko modes paint with (the wheel keeps `wheelSegmentFills`).
 */
export type DrawModesConfig = {
  /** Accessible name of the mode selector in the header. */
  selectorLabel: string;
  labels: DrawModeLabels;
  /** Caption above the live name banner on a wheel too crowded for labels. */
  pointerLabel: string;
  /** Colour reserved for the winning moment (grid pulse, slot name, plinko PRIZE bin). */
  winColor: string;
  /** Text drawn on top of `winColor`. */
  winInk: string;
  plinko: {
    /** Label of the single golden bin. */
    prizeLabel: string;
    /** Label of every other bin. */
    outLabel: string;
    /** Heading of the side ticker listing balls as they land. */
    tickerHeading: string;
    /** Accessible description of the canvas board. */
    boardAriaLabel: string;
    /** Peg colour. */
    pegColor: string;
    /** Ball colours, cycled per participant. */
    ballColors: string[];
    /** Initials drawn on the balls. */
    ballInk: string;
  };
};

export type SiteConfig = {
  /** Product / event name. */
  name: string;
  /** Kebab-case id. Namespaces this deployment's localStorage keys. */
  slug: string;
  /** `<html lang>` value for both apps. */
  lang: string;
  /** BCP-47 locale for date/number formatting in the wheel app. */
  locale: string;

  assets: {
    /** Header wordmark, both apps. */
    logo: string;
    /** Small mark in the centre of the wheel (ruleta only). */
    wheelLogo: string;
    /** Full-screen image the ruleta projects behind "Show QR". */
    poster: string;
  };

  /** Generated QR poster — see {@link PosterConfig}. */
  poster: PosterConfig;

  form: {
    meta: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
    };
    /** Minimum length for the name field. */
    nameMinLength: number;
    docField: DocFieldConfig;
    messages: {
      sponsorsLabel: string;
      collaboratorsLabel: string;
      privacyNote: string;
      heading: string;
      subtitle: string;
      logoAlt: string;
      nameLabel: string;
      namePlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      honeypotLabel: string;
      consent: string;
      termsRequired: string;
      submit: string;
      submitting: string;
      successHeading: string;
      ticketLabel: string;
      statusLabel: string;
      statusValue: string;
      deviceNote: string;
      /** Validation errors. */
      nameError: string;
      emailError: string;
      docError: string;
      /** Client transport errors. */
      offline: string;
      genericError: string;
      /** Server (route handler) errors. */
      invalidJson: string;
      invalidData: string;
      serverMisconfigured: string;
      saveFailed: string;
      duplicate: string;
    };
  };

  ruleta: {
    meta: { title: string; description: string };
    /** First-run value of the editable title above the wheel. */
    defaultTitle: string;
    /** Full turns before landing on the winning segment. */
    wheelSpins: number;
    /** Spin animation length in ms (kept in sync with the CSS transition). */
    wheelDurationMs: number;
    /** Confetti burst colours on the winner modal. */
    confettiColors: string[];
    /** Alternating fill for the wheel segments: [even, odd]. */
    wheelSegmentFills: [string, string];
    /** Solid colour of the wheel rim / single-entry disc. */
    wheelRimColor: string;
    /** Draw modes (wheel, slot, grid, plinko) — see {@link DrawModesConfig}. */
    drawModes: DrawModesConfig;
    csv: {
      filenamePrefix: string;
      headers: [string, string, string, string, string];
      /** Filename prefix for the "export all participants" CSV. */
      participantsFilenamePrefix: string;
      /** Columns for the "export all participants" CSV (incl. winners). */
      participantsHeaders: [string, string, string, string, string, string];
    };
    /** Winner email — see {@link WinnerEmailConfig}. */
    email: WinnerEmailConfig;
    messages: {
      sponsorsLabel: string;
      collaboratorsLabel: string;
      privateBadge: string;
      showQr: string;
      posterAlt: string;
      close: string;
      muteSound: string;
      unmuteSound: string;
      /** Header hamburger menu. */
      menu: string;
      menuOpen: string;
      menuClose: string;
      exportParticipantsCsv: string;
      titleAriaLabel: string;
      editTitle: string;
      spin: string;
      spinning: string;
      viewWinners: string;
      resetDraw: string;
      poolEmpty: string;
      noParticipants: string;
      participantsHeading: string;
      inPlay: string;
      refresh: string;
      refreshing: string;
      deleteAll: string;
      deletingAll: string;
      searchPlaceholder: string;
      lastUpdated: string;
      noResults: string;
      wonTag: string;
      skippedTag: string;
      newTag: string;
      deleteEntry: string;
      winnerHeading: string;
      prizeLabel: string;
      prizePlaceholder: string;
      confirmWinner: string;
      saving: string;
      spinAgain: string;
      winnersHeading: string;
      exportCsv: string;
      noWinners: string;
      addPrize: string;
      undoWinner: string;
      editPrizePrompt: string;
      /** confirm() dialogs — {name} / {n} are substituted. */
      confirmDelete: string;
      confirmDeleteAll: string;
      confirmResetWithWinners: string;
      confirmReset: string;
      /** Load / write errors surfaced under the wheel. */
      loadFailed: string;
      confirmFailed: string;
      reloadFailed: string;
      prizeFailed: string;
      undoFailed: string;
      deleteFailed: string;
      deleteAllFailed: string;
      resetFailed: string;
      /** Route-handler error bodies. */
      listFailed: string;
      missingId: string;
      notFound: string;
      deleteRouteFailed: string;
      markFailed: string;
      prizeRouteFailed: string;
      undoRouteFailed: string;
      resetRouteFailed: string;
      /** Winner email (simulated). {name} / {time} / {action} are substituted. */
      notifyByEmail: string;
      notifyAriaLabel: string;
      resendEmail: string;
      notifiedBadge: string;
      winnerConfirmed: string;
      done: string;
      emailPreviewHeading: string;
      emailTo: string;
      emailFrom: string;
      emailSubject: string;
      emailBody: string;
      emailMessageId: string;
      emailSending: string;
      emailSent: string;
      emailSimulatedNote: string;
      notifyFailed: string;
      retry: string;
      /** Notify route-handler error bodies. */
      notifyNotWinner: string;
      notifyNoPrize: string;
      notifyInvalidId: string;
      notifyRouteFailed: string;
    };
  };

  sponsors: Sponsor[];
  collaborators: Collaborator[];
};

/** Identity helper — keeps editing type-checked without importing types by hand. */
export function defineSiteConfig(config: SiteConfig): SiteConfig {
  return config;
}

export const siteConfig = defineSiteConfig({
  name: "OpenRuleta",
  slug: "openruleta",
  lang: "en",
  locale: "en-US",

  assets: {
    logo: "/logo.svg",
    wheelLogo: "/logos/wheel-logo.svg",
    poster: "/poster.svg",
  },

  poster: {
    title: "SCAN THE QR\nTO ENTER",
    subtitle: "OpenRuleta",
    hint: "Point your phone camera at it",
    supportLabel: "WITH SUPPORT FROM",
    background:
      "radial-gradient(1100px 640px at 25% -10%, rgba(255,255,255,.16), transparent 60%), linear-gradient(160deg, #2563eb 0%, #1e3a8a 100%)",
    ink: "#0b3b73",
    accent: "rgba(255,255,255,.14)",
    font: "Montserrat",
    logoCard: true,
  },

  form: {
    meta: {
      title: "OpenRuleta — Raffle sign-up",
      description:
        "Enter your details for a chance to win. Powered by OpenRuleta.",
      ogTitle: "Join the raffle",
      ogDescription: "Enter your details for a chance to win.",
    },
    nameMinLength: 2,
    docField: {
      enabled: true,
      label: "Last 3 digits of your ID",
      hint: "We only store the last 3 digits — never your full ID number.",
      placeholder: "e.g. 123",
      maxLength: 3,
      pattern: "^\\d{3}$",
      displayLabel: "ID",
      maskGlyph: "•••",
    },
    messages: {
      sponsorsLabel: "Sponsors",
      collaboratorsLabel: "Collaborators",
      privacyNote:
        "We use your details only to run this raffle and contact the winner.",
      heading: "Join the raffle",
      subtitle: "Enter your details below for a chance to win.",
      logoAlt: "OpenRuleta",
      nameLabel: "Full name",
      namePlaceholder: "e.g. Alex Doe",
      emailLabel: "Email",
      emailPlaceholder: "alex@example.com",
      honeypotLabel: "Do not fill this in",
      consent: "I agree to enter this raffle and to the use of my data for it.",
      termsRequired: "You need to accept the terms to enter.",
      submit: "Enter",
      submitting: "Sending…",
      successHeading: "You're in!",
      ticketLabel: "Raffle ticket",
      statusLabel: "Status",
      statusValue: "CONFIRMED",
      deviceNote: "This device has already entered once. One entry per person.",
      nameError: "Please enter your name.",
      emailError: "Please enter a valid email address.",
      docError: "Must be exactly 3 digits.",
      offline: "You appear to be offline. Check your connection.",
      genericError: "Could not submit the form.",
      invalidJson: "Invalid JSON.",
      invalidData: "Invalid data.",
      serverMisconfigured:
        "Server configuration incomplete (Supabase): missing environment variables.",
      saveFailed: "Could not save. Please try again.",
      duplicate: "That email is already entered.",
    },
  },

  ruleta: {
    meta: {
      title: "Winner wheel — OpenRuleta",
      description: "Local winner-picker wheel for the OpenRuleta raffle.",
    },
    defaultTitle: "Raffle draw",
    wheelSpins: 6,
    wheelDurationMs: 4600,
    confettiColors: ["#0059b5", "#ffffff", "#abc7ff"],
    wheelSegmentFills: ["#0a63c4", "#00306b"],
    wheelRimColor: "#003e7e",
    drawModes: {
      selectorLabel: "Draw mode",
      labels: {
        wheel: "Wheel",
        slot: "Slot",
        grid: "Grid",
        plinko: "Plinko",
      },
      pointerLabel: "Under the pointer",
      winColor: "#f5b82e",
      winInk: "#1a1200",
      plinko: {
        prizeLabel: "PRIZE",
        outLabel: "out",
        tickerHeading: "Landing",
        boardAriaLabel:
          "Plinko board: every participant drops as a ball, one lands in the prize bin.",
        pegColor: "#9fb8e6",
        ballColors: ["#0a63c4", "#3b82f6", "#00306b", "#60a5fa", "#1e40af"],
        ballInk: "#ffffff",
      },
    },
    csv: {
      filenamePrefix: "winners",
      headers: ["name", "email", "id_last_3", "prize", "won_at"],
      participantsFilenamePrefix: "participants",
      participantsHeaders: [
        "name",
        "email",
        "id_last_3",
        "created_at",
        "won_at",
        "prize",
      ],
    },
    email: {
      from: "OpenRuleta <no-reply@example.com>",
      subject: "You won {prize}!",
      body: "Hi {name},\n\nCongratulations! You won the prize {prize} in the OpenRuleta raffle draw.\n\nWe will contact you soon with the details to collect it.\n\nThe OpenRuleta team",
    },
    messages: {
      sponsorsLabel: "Sponsors",
      collaboratorsLabel: "Collaborators",
      privateBadge: "Private · local view",
      showQr: "Show QR",
      posterAlt: "Scan the QR code to enter the raffle",
      close: "Close (Esc)",
      muteSound: "Mute wheel",
      unmuteSound: "Unmute wheel",
      menu: "Menu",
      menuOpen: "Open menu",
      menuClose: "Close menu",
      exportParticipantsCsv: "Export participants CSV",
      titleAriaLabel: "Draw title",
      editTitle: "Edit title",
      spin: "Spin",
      spinning: "Spinning…",
      viewWinners: "View winners ({n})",
      resetDraw: "Reset draw (put everyone back in)",
      poolEmpty: "Nobody left in the pool.",
      noParticipants: "No participants yet. Share the form.",
      participantsHeading: "Participants — {n}",
      inPlay: "{n} in play",
      refresh: "Refresh participants",
      refreshing: "Refreshing…",
      deleteAll: "Delete all participants",
      deletingAll: "Deleting…",
      searchPlaceholder: "Search participant…",
      lastUpdated: "Last updated {time}",
      noResults: "No matches for that search.",
      wonTag: "won",
      skippedTag: "out",
      newTag: "New",
      deleteEntry: "Remove from database",
      winnerHeading: "Winner",
      prizeLabel: "Prize (optional)",
      prizePlaceholder: "e.g. Gift card, book, T-shirt…",
      confirmWinner: "Confirm winner",
      saving: "Saving…",
      spinAgain: "Skip and spin again",
      winnersHeading: "Winners ({n})",
      exportCsv: "Export CSV",
      noWinners: "No winners yet.",
      addPrize: "+ prize",
      undoWinner: "Undo (back in the pool)",
      editPrizePrompt: "Prize for {name}:",
      confirmDelete: "Remove {name} from the database? This cannot be undone.",
      confirmDeleteAll:
        "You are about to DELETE all {n} participants. This cannot be undone. Are you sure?",
      confirmResetWithWinners:
        "This puts {n} winner(s) back in the pool. Are you sure?",
      confirmReset: "Reset the draw?",
      loadFailed: "Could not load the list.",
      confirmFailed: "Could not confirm the winner. Try again.",
      reloadFailed:
        "Winner confirmed, but the list could not refresh. Refresh manually.",
      prizeFailed: "Could not save the prize.",
      undoFailed: "Could not undo.",
      deleteFailed: "Could not remove the participant.",
      deleteAllFailed: "Could not remove the participants.",
      resetFailed: "Could not reset.",
      listFailed: "Could not read the list from Supabase.",
      missingId: "Missing id.",
      notFound: "Participant not found.",
      deleteRouteFailed: "Could not delete.",
      markFailed: "Could not confirm.",
      prizeRouteFailed: "Could not save the prize.",
      undoRouteFailed: "Could not undo.",
      resetRouteFailed: "Could not reset.",
      notifyByEmail: "Notify by email",
      notifyAriaLabel: "{action}: {name}",
      resendEmail: "Resend email",
      notifiedBadge: "Notified {time}",
      winnerConfirmed: "Winner confirmed ✓",
      done: "Done",
      emailPreviewHeading: "Winner email",
      emailTo: "To",
      emailFrom: "From",
      emailSubject: "Subject",
      emailBody: "Body",
      emailMessageId: "Message ID",
      emailSending: "Sending…",
      emailSent: "Sent (simulated) ✓",
      emailSimulatedNote:
        "Simulation: no email was actually sent. This is a preview of what the winner would receive.",
      notifyFailed: "Could not send the email. Try again.",
      retry: "Try again",
      notifyNotWinner: "This participant has not won.",
      notifyNoPrize: "Assign a prize before notifying the winner.",
      notifyInvalidId: "Invalid id.",
      notifyRouteFailed: "Could not send the email.",
    },
  },

  sponsors: [
    { name: "Placeholder Co", src: "/logos/placeholder-a.svg", tier: "Gold" },
    { name: "Example Labs", src: "/logos/placeholder-b.svg", tier: "Gold" },
    { name: "Acme Corp", tier: "Silver" },
    { name: "Globex", tier: "Silver" },
    { name: "Initech", tier: "Silver" },
    { name: "Umbrella", tier: "Silver" },
  ],
  collaborators: [
    { name: "Placeholder Co", src: "/logos/placeholder-a.svg" },
    { name: "Example Labs", src: "/logos/placeholder-b.svg" },
    { name: "Community Group A" },
    { name: "Community Group B" },
    { name: "Jane Contributor" },
    { name: "John Contributor" },
    { name: "Local Meetup" },
    { name: "Student Chapter" },
  ],
});
