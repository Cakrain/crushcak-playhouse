import { Howl } from "howler";

// Lightweight sound manager. Sources are tiny Web-friendly URLs from public CDN samples.
// Volume defaults conservative.

type SoundKey =
  | "click"
  | "win"
  | "lose"
  | "crash"
  | "tick"
  | "hum"
  | "cashout"
  | "chime"
  | "explosion"
  | "card_flip"
  | "ball_bounce"
  | "balloon_pop"
  | "balloon_inflate";

const SOURCES: Record<SoundKey, string[]> = {
  click:            ["https://cdn.jsdelivr.net/gh/lovable-dev/sfx@main/click.mp3"],
  win:              ["https://cdn.jsdelivr.net/gh/lovable-dev/sfx@main/win.mp3"],
  lose:             ["https://cdn.jsdelivr.net/gh/lovable-dev/sfx@main/lose.mp3"],
  crash:            ["https://cdn.jsdelivr.net/gh/lovable-dev/sfx@main/crash.mp3"],
  tick:             ["https://cdn.jsdelivr.net/gh/lovable-dev/sfx@main/tick.mp3"],
  hum:              ["https://cdn.jsdelivr.net/gh/lovable-dev/sfx@main/hum.mp3"],
  cashout:          ["https://cdn.jsdelivr.net/gh/lovable-dev/sfx@main/cashout.mp3"],
  chime:            ["https://cdn.jsdelivr.net/gh/lovable-dev/sfx@main/chime.mp3"],
  explosion:        ["https://cdn.jsdelivr.net/gh/lovable-dev/sfx@main/explosion.mp3"],
  card_flip:        ["https://cdn.jsdelivr.net/gh/lovable-dev/sfx@main/card_flip.mp3"],
  ball_bounce:      ["https://cdn.jsdelivr.net/gh/lovable-dev/sfx@main/ball_bounce.mp3"],
  balloon_pop:      ["https://cdn.jsdelivr.net/gh/lovable-dev/sfx@main/balloon_pop.mp3"],
  balloon_inflate:  ["https://cdn.jsdelivr.net/gh/lovable-dev/sfx@main/balloon_inflate.mp3"],
};

const cache = new Map<SoundKey, Howl>();

const STORAGE_KEY = "crushcak.muted";

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setMuted(m: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, m ? "1" : "0");
}

function getHowl(key: SoundKey): Howl {
  let h = cache.get(key);
  if (!h) {
    h = new Howl({ src: SOURCES[key], volume: 0.5, html5: false, preload: false });
    cache.set(key, h);
  }
  return h;
}

export function playSound(key: SoundKey, opts?: { volume?: number; loop?: boolean }) {
  if (isMuted()) return null;
  try {
    const h = getHowl(key);
    if (opts?.volume != null) h.volume(opts.volume);
    if (opts?.loop) h.loop(true);
    const id = h.play();
    return { id, stop: () => h.stop(id) };
  } catch {
    return null;
  }
}

export function stopAll() {
  for (const h of cache.values()) h.stop();
}
