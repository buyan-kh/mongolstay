"use client";

import { useEffect } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

// Marks the given messages read on mount. Renders nothing.
// Used by the dashboard detail page to clear unread badges as soon as the
// client opens the conversation.
export function MarkMessagesRead({ ids }: { ids: string[] }) {
  useEffect(() => {
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const sb = getBrowserSupabase();
      // RLS limits this update to messages on intakes the user owns.
      await sb.from("intake_messages").update({ read_at: new Date().toISOString() }).in("id", ids);
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [ids]);
  return null;
}
