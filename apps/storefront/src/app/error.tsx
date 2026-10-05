"use client";
export default function CatalogError({ reset }: { reset: () => void }) {
  return <main><h1>Temporarily unavailable</h1><p>We could not load the latest store data. Please try again.</p><button onClick={reset}>Try again</button></main>;
}
