"use client";

import { useCallback, useRef, useState } from "react";

import { siteConfig } from "@openruleta/config";

import {
  notifyWinner,
  NotifyWinnerError,
  type NotifyWinnerResponse,
  type Participant,
} from "@/lib/api";

const m = siteConfig.ruleta.messages;

export type WinnerNotificationState =
  | { status: "idle" }
  | { status: "sending"; participant: Participant }
  | {
      status: "sent";
      participant: Participant;
      result: NotifyWinnerResponse;
    }
  | { status: "error"; participant: Participant; message: string };

type Options = {
  /** Runs after every successful send (even if the preview was closed). */
  onNotified: (id: string, notifiedAt: string) => void;
};

/**
 * Owns the "notify winner by email" flow (simulated send) so RuletaClient only
 * wires it up. A request token makes a late response from a closed / replaced
 * preview a no-op for the UI, while `onNotified` still runs so the list
 * reflects the new `notifiedAt`.
 */
export function useWinnerNotification({ onNotified }: Options) {
  const [state, setState] = useState<WinnerNotificationState>({
    status: "idle",
  });
  const tokenRef = useRef(0);

  const notify = useCallback(
    async (participant: Participant) => {
      const token = ++tokenRef.current;
      setState({ status: "sending", participant });
      try {
        const result = await notifyWinner(participant.id);
        onNotified(participant.id, result.notifiedAt);
        if (token === tokenRef.current) {
          setState({ status: "sent", participant, result });
        }
      } catch (err) {
        if (token !== tokenRef.current) return;
        const message =
          err instanceof NotifyWinnerError && err.serverMessage
            ? err.serverMessage
            : m.notifyFailed;
        setState({ status: "error", participant, message });
      }
    },
    [onNotified],
  );

  const close = useCallback(() => {
    tokenRef.current++;
    setState({ status: "idle" });
  }, []);

  return { state, notify, close };
}
