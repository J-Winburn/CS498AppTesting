"use client";

import { useEffect } from "react";

export default function DevHostCanonicalizer() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (window.location.hostname !== "localhost") return;

    const canonicalUrl = new URL(window.location.href);
    canonicalUrl.hostname = "127.0.0.1";
    window.location.replace(canonicalUrl.toString());
  }, []);

  return null;
}
