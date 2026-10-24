"use client";

import { createContext, useContext } from "react";

// True when the guide is rendered for the printable PDF (see
// app/guide/[slug]/print): images load eagerly (the headless browser never
// scrolls, so lazy images would be missing from the PDF) and the web-only
// chrome is dropped.
const PrintModeContext = createContext(false);

export const PrintModeProvider = PrintModeContext.Provider;

export function usePrintMode(): boolean {
  return useContext(PrintModeContext);
}

export function useImgLoading(): "eager" | "lazy" {
  return usePrintMode() ? "eager" : "lazy";
}
