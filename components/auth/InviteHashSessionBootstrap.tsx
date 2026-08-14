"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Si Supabase renvoie les tokens dans le hash (#access_token=…&type=invite),
 * le route handler serveur ne les voit pas — on les consomme côté client.
 */
export function InviteHashSessionBootstrap({
  onReady,
}: {
  onReady: (hasSession: boolean) => void;
}) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const hash = window.location.hash.replace(/^#/, "");

      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            console.error("[invite-hash] setSession:", error.message);
          } else {
            // Nettoyer le hash sensible de l'URL
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search,
            );
          }
        }
      }

      // Aussi : ?token_hash=&type= si on atterrit directement sur finalize
      const search = new URLSearchParams(window.location.search);
      const token_hash = search.get("token_hash");
      const type = search.get("type");
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          type: type as "invite" | "magiclink" | "recovery" | "email",
          token_hash,
        });
        if (error) {
          console.error("[invite-hash] verifyOtp:", error.message);
        } else {
          const url = new URL(window.location.href);
          url.searchParams.delete("token_hash");
          url.searchParams.delete("type");
          window.history.replaceState(null, "", url.pathname + url.search);
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) {
        onReady(Boolean(user));
        setDone(true);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [onReady]);

  if (!done) {
    return (
      <p className="mt-6 text-sm text-slate-500">
        Vérification de l&apos;invitation…
      </p>
    );
  }

  return null;
}
