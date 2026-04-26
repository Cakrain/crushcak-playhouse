import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X, MessageCircle, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const STORAGE_KEY = "crushcak.cakbot.history";
const MAX_HISTORY = 60;

export function CakBot() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {/* noop */}
    return [];
  });

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
    } catch {/* noop */}
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const send = async (text: string) => {
    if (!text.trim() || sending || !user) return;
    const userMsg: Msg = { role: "user", content: text.trim(), ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    // Special operator request
    const lc = text.toLowerCase();
    if (/\b(human|operator|operatör)\b/.test(lc)) {
      setTimeout(() => {
        const note: Msg = {
          role: "assistant",
          content:
            lang === "tr"
              ? "Canlı operatörümüz şu an müsait değil. Bu arada ben yardımcı olabilirim — sorununu yazar mısın?"
              : "Our live operator is currently unavailable. In the meantime, I can help — could you describe the issue?",
          ts: Date.now(),
        };
        setMessages((m) => [...m, note]);
        if (!open) setUnread((u) => u + 1);
        playSound("chime", { volume: 0.3 });
        setSending(false);
      }, 600);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("cakbot", {
        body: {
          message: text.trim(),
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          lang,
        },
      });

      if (error || !data?.reply) {
        const errMsg: Msg = {
          role: "assistant",
          content: data?.error === "rate_limit" ? t("bot.rate_limit") : t("bot.error"),
          ts: Date.now(),
        };
        setMessages((m) => [...m, errMsg]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply, ts: Date.now() }]);
        if (!open) setUnread((u) => u + 1);
        playSound("chime", { volume: 0.3 });
      }
    } catch (e) {
      console.error(e);
      setMessages((m) => [...m, { role: "assistant", content: t("bot.error"), ts: Date.now() }]);
    } finally {
      setSending(false);
    }
  };

  const QUICK = [
    { key: "bot.quick.deposit" },
    { key: "bot.quick.play" },
    { key: "bot.quick.withdraw" },
    { key: "bot.quick.password" },
    { key: "bot.quick.bonus" },
  ];

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary shadow-glow transition-transform hover:scale-110 md:bottom-6 md:right-6",
          !open && "animate-pulse-glow",
        )}
        aria-label={t("bot.title")}
      >
        {open ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <>
            <Bot className="h-6 w-6 text-primary-foreground" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed bottom-20 right-2 z-40 flex h-[80vh] max-h-[600px] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-elevated md:bottom-24 md:right-6 md:w-96"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border bg-gradient-card p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-display font-bold">{t("bot.title")}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {t("bot.subtitle")}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="text-4xl">🤖</div>
                  <p className="text-sm text-muted-foreground">{t("bot.welcome")}</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn("flex flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      m.role === "user"
                        ? "bg-gradient-primary text-primary-foreground"
                        : "bg-card text-card-foreground",
                    )}
                  >
                    {m.content.split("\n").map((line, j) => (
                      <span key={j}>
                        {line}
                        {j < m.content.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                  <span className="px-1 text-[10px] text-muted-foreground">
                    {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-1.5 rounded-2xl bg-card px-3 py-2.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Quick replies */}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-border bg-card/30 p-2">
                {QUICK.map((q) => (
                  <button
                    key={q.key}
                    onClick={() => send(t(q.key))}
                    className="rounded-full bg-card px-3 py-1.5 text-xs hover:bg-primary hover:text-primary-foreground"
                  >
                    {t(q.key)}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2 border-t border-border bg-card/40 p-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("bot.placeholder")}
                disabled={sending || !user}
                className="bg-background"
              />
              <Button type="submit" size="icon" disabled={sending || !input.trim() || !user} className="bg-gradient-primary shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
