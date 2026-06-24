import { createContext, useContext, useState } from "react";
import pt from "./locales/pt";
import en from "./locales/en";

const DICTS = { pt, en };

const LocaleCtx = createContext({ t: k => k, lang: "pt", setLang: () => {} });

export function LocaleProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem("nexus_lang") || "pt"
  );

  const setLang = (l) => {
    localStorage.setItem("nexus_lang", l);
    setLangState(l);
  };

  const dict = DICTS[lang] || pt;

  const t = (key) => {
    const parts = key.split(".");
    let val = dict;
    for (const p of parts) val = val?.[p];
    if (val && typeof val === "string") return val;
    // fallback to pt if key missing in current lang
    let fallback = pt;
    for (const p of parts) fallback = fallback?.[p];
    return (fallback && typeof fallback === "string") ? fallback : key;
  };

  return (
    <LocaleCtx.Provider value={{ t, lang, setLang }}>
      {children}
    </LocaleCtx.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleCtx);
}
