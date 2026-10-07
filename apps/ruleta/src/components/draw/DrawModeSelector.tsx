"use client";

import { useId } from "react";

import { siteConfig } from "@openruleta/config";

import { DRAW_MODES } from "./registry";
import type { DrawModeId } from "./types";

type Props = {
  value: DrawModeId;
  onChange: (mode: DrawModeId) => void;
  /** True while a draw runs or awaits confirmation. */
  disabled?: boolean;
  className?: string;
};

/**
 * Segmented control built on native radios: arrow keys move between modes,
 * the fieldset disables the whole group during a draw. Reusable in any
 * header slot (e.g. a menu).
 */
export function DrawModeSelector({
  value,
  onChange,
  disabled,
  className = "",
}: Props) {
  const name = useId();
  return (
    <fieldset
      disabled={disabled}
      className={`inline-flex items-center gap-0.5 rounded-lg bg-white/10 p-1 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <legend className="sr-only">
        {siteConfig.ruleta.drawModes.selectorLabel}
      </legend>
      {DRAW_MODES.map(({ id, label, Icon }) => (
        <label
          key={id}
          title={label}
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-white/70 transition hover:text-white has-[:checked]:bg-primary has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-white has-[:disabled]:cursor-not-allowed"
        >
          <input
            type="radio"
            name={name}
            value={id}
            checked={value === id}
            onChange={() => onChange(id)}
            className="sr-only"
          />
          <Icon className="h-4 w-4 flex-none" />
          <span className="sr-only lg:not-sr-only">{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
