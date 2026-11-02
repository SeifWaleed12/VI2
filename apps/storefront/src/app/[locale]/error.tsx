"use client";
import { useLanguage } from "@/context/LanguageContext";
export default function CatalogError({ reset }: { reset: () => void }) {
  const { msg } = useLanguage();
  return <main><h1>{msg("error.temporarilyUnavailable")}</h1><p>{msg("error.weCouldNotLoadThe")}</p><button onClick={reset}>{msg("error.tryAgain")}</button></main>;
}
