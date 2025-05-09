// hooks/use-media-query.ts
"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query);

      const listener = () => {
        setMatches(media.matches);
      };

      // Set initial value
      setMatches(media.matches);

      // Listen for changes
      media.addEventListener("change", listener);

      return () => {
        media.removeEventListener("change", listener);
      };
    }
  }, [query]);

  return matches;
}
