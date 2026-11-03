"use client";

import Image from "next/image";
import { useState } from "react";

// The logo staff uploaded in Admin, or the brand's name when there is none or
// the file cannot be loaded.
export default function BrandLogo({ name, logo, className }: { name: string; logo?: string | null; className?: string }) {
  const [failed, setFailed] = useState<string>();
  if (!logo || failed === logo) return <span>{name}</span>;
  return <Image src={logo} alt={`${name} logo`} fill sizes="220px" className={className} onError={() => setFailed(logo)} />;
}
