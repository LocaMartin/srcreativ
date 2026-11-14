import { useEffect, useMemo, useState } from "react";
import { Globe, Search, X } from "lucide-react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

const languages = [
  ["en", "English"], ["hi", "Hindi"], ["bn", "Bengali"], ["gu", "Gujarati"],
  ["kn", "Kannada"], ["ml", "Malayalam"], ["mr", "Marathi"], ["ne", "Nepali"],
  ["or", "Odia"], ["pa", "Punjabi"], ["ta", "Tamil"], ["te", "Telugu"], ["ur", "Urdu"],
  ["ar", "Arabic"], ["zh-CN", "Chinese"], ["fr", "French"], ["de", "German"],
  ["it", "Italian"], ["ja", "Japanese"], ["ko", "Korean"], ["pt", "Portuguese"],
  ["ru", "Russian"], ["es", "Spanish"],
] as const;

/** A compact, searchable control for the site-wide Google Translate widget. */
export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const init = () => {
      const host = document.getElementById("google_translate_element");
      if (!host || host.childElementCount > 0 || !window.google?.translate) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "google_translate_element",
      );
    };
    if (window.google?.translate) {
      init();
      return;
    }
    window.googleTranslateElementInit = init;
    if (!document.getElementById("gt-script")) {
      const s = document.createElement("script");
      s.id = "gt-script";
      s.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  const filtered = useMemo(
    () => languages.filter(([, label]) => label.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  const changeLanguage = (code: string) => {
    const select = document.querySelector<HTMLSelectElement>(
      "#google_translate_element select.goog-te-combo",
    );
    if (select) {
      select.value = code;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Change language"
        title="Change language"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        <Globe className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-60 w-64 rounded-2xl border border-border bg-card p-3 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Search className="h-4 w-4 text-primary" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search language" className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground" />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close language menu" className="text-muted-foreground hover:text-primary"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto">
            {filtered.map(([code, label]) => (
              <button key={code} type="button" onClick={() => changeLanguage(code)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary hover:text-primary">
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
