import type { Metadata } from "next";

import FlashDeals from "@/components/FlashDeals";

export const metadata: Metadata = {
  title: "Flash Deals | Vi2",
  description:
    "Explore Vi2 daily flash deals and rotating 24-hour supplement picks.",
};

export default function DealsPage() {
  return (
    <main>
      <FlashDeals />
    </main>
  );
}
