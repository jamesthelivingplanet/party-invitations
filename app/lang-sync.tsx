"use client";

import { useEffect } from "react";

/** Keeps <html lang> in sync with the page language (for screen readers and translation tools). */
export default function LangSync({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
