import { useEffect, useState, useCallback } from "react";

export type Media = { id: string; url: string; preview?: string; type: "image" | "video" };
const LS_KEY = "pinnedMedia";

export function usePinnedMedia() {
  const [pinned, setPinned] = useState<Media[]>([]);

  /* 1. İlk yüklemede diski oku */
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) setPinned(JSON.parse(raw));
  }, []);

  /* 2. Her değişiklikte diske yaz */
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(pinned));
  }, [pinned]);

  /* 3. API */
  const pin   = useCallback((m: Media) => setPinned(p => [...p.filter(x => x.id !== m.id), m]), []);
  const unpin = useCallback((id: string) => setPinned(p => p.filter(x => x.id !== id)), []);
  const isPinned = useCallback((id: string) => pinned.some(x => x.id === id), [pinned]);

  return { pinned, pin, unpin, isPinned };
} 