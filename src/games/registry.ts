import { Plane, Bomb, Spade, CircleDot, Target, Rocket, type LucideIcon } from "lucide-react";

export type GameId = "cakplain" | "minescak" | "blackcak" | "plincocak" | "limbocak" | "rokketcak" | "ballooncak";

export interface GameMeta {
  id: GameId;
  icon: LucideIcon | null;
  emoji?: string;
  nameKey: string;
  descKey: string;
  available: boolean; // v1: only cakplain
  accent: string; // background tint
}

export const GAMES: GameMeta[] = [
  { id: "cakplain", icon: Plane, nameKey: "game.cakplain", descKey: "game.cakplain.desc", available: true,  accent: "from-emerald-500/20 to-cyan-500/20" },
  { id: "minescak", icon: Bomb, nameKey: "game.minescak", descKey: "game.minescak.desc", available: false, accent: "from-orange-500/20 to-red-500/20" },
  { id: "blackcak", icon: Spade, nameKey: "game.blackcak", descKey: "game.blackcak.desc", available: false, accent: "from-slate-500/20 to-zinc-500/20" },
  { id: "plincocak", icon: CircleDot, nameKey: "game.plincocak", descKey: "game.plincocak.desc", available: false, accent: "from-pink-500/20 to-purple-500/20" },
  { id: "limbocak", icon: Target, nameKey: "game.limbocak", descKey: "game.limbocak.desc", available: false, accent: "from-yellow-500/20 to-orange-500/20" },
  { id: "rokketcak", icon: Rocket, nameKey: "game.rokketcak", descKey: "game.rokketcak.desc", available: false, accent: "from-indigo-500/20 to-blue-500/20" },
  { id: "ballooncak", icon: null, emoji: "🎈", nameKey: "game.ballooncak", descKey: "game.ballooncak.desc", available: false, accent: "from-rose-500/20 to-pink-500/20" },
];
