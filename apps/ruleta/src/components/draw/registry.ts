import type { ComponentType } from "react";

import { siteConfig } from "@openruleta/config";

import { GridMode } from "./GridMode";
import { GridIcon, PlinkoIcon, SlotIcon, WheelIcon } from "./icons";
import { PlinkoMode } from "./PlinkoMode";
import { SlotMode } from "./SlotMode";
import type { DrawModeId, DrawModeProps } from "./types";
import { WheelMode } from "./WheelMode";

export type DrawModeDefinition = {
  id: DrawModeId;
  label: string;
  Component: ComponentType<DrawModeProps>;
  Icon: ComponentType<{ className?: string }>;
};

const labels = siteConfig.ruleta.drawModes.labels;

/** Every draw mode, in selector order. */
export const DRAW_MODES: readonly DrawModeDefinition[] = [
  { id: "wheel", label: labels.wheel, Component: WheelMode, Icon: WheelIcon },
  { id: "slot", label: labels.slot, Component: SlotMode, Icon: SlotIcon },
  { id: "grid", label: labels.grid, Component: GridMode, Icon: GridIcon },
  {
    id: "plinko",
    label: labels.plinko,
    Component: PlinkoMode,
    Icon: PlinkoIcon,
  },
];

export function getDrawMode(id: DrawModeId): DrawModeDefinition {
  return DRAW_MODES.find((m) => m.id === id) ?? DRAW_MODES[0];
}
