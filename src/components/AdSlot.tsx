import { useEffect } from "react";

/**
 * Paste your Google AdSense publisher ID (ca-pub-XXXX) and slot IDs here once approved.
 * Until then a labelled placeholder is shown.
 */
export const ADSENSE_CLIENT = "";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({
  slot = "",
  className = "",
}: {
  slot?: string;
  className?: string;
}) {
  useEffect(() => {
    if (!ADSENSE_CLIENT) return;
    if (!document.getElementById("adsense-script")) {
      const s = document.createElement("script");
      s.id = "adsense-script";
      s.async = true;
      s.crossOrigin = "anonymous";
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      document.head.appendChild(s);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className={`mx-auto w-full max-w-5xl px-6 ${className}`}>
      <p className="mb-2 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
        Advertisement
      </p>
      {ADSENSE_CLIENT ? (
        <ins
          className="adsbygoogle block"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="flex h-24 items-center justify-center border border-dashed border-border text-xs text-muted-foreground/60">
          Ad space
        </div>
      )}
    </div>
  );
}
