// CakBot edge function — Anthropic Claude with rate limit + system prompt.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are CakBot, the AI support assistant for CrushCak online gaming platform.
Help users with: game rules (CakPlain, MinesCak, BlackCak, PlincoCak, LimboCak, RokketCak, BalloonCak), TRX deposits/withdrawals, account issues, password reset, profile settings, responsible gaming.
Be friendly, concise, professional.
Respond in Turkish or English based on user message language.
Never guarantee winnings or give financial advice.
End every message with: Başka nasıl yardımcı olabilirim? / Is there anything else I can help you with?`;

const RATE_LIMIT_PER_HOUR = 20;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized", reason: "missing_bearer" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE) {
      console.error("cakbot missing env", {
        hasUrl: !!SUPABASE_URL,
        hasAnon: !!SUPABASE_ANON_KEY,
        hasService: !!SERVICE_ROLE,
      });
      return json({ error: "server_misconfigured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify token by fetching the user from the auth server.
    const { data: userData, error: uErr } = await supabase.auth.getUser(token);
    if (uErr || !userData?.user?.id) {
      console.warn("cakbot auth rejected:", uErr?.message ?? "no user");
      return json({ error: "unauthorized", reason: "invalid_token", detail: uErr?.message }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const message = String(body.message ?? "").trim().slice(0, 2000);
    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    if (!message) return json({ error: "empty_message" }, 400);

    // Rate limit: count assistant messages in last hour for this user
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("support_chats")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", sinceIso);

    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: "rate_limit" }, 429);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "missing_api_key" }, 500);

    // Save user msg
    await admin.from("support_chats").insert({ user_id: userId, role: "user", content: message });

    const messages = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role === "assistant" ? "assistant" : "user",
        content: String(h.content).slice(0, 4000),
      })),
      { role: "user", content: message },
    ];

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error("anthropic error", r.status, txt);
      return json({ error: "ai_error" }, 500);
    }

    const data = await r.json();
    const reply = data?.content?.[0]?.text ?? "";
    await admin.from("support_chats").insert({ user_id: userId, role: "assistant", content: reply });

    return json({ reply });
  } catch (e) {
    console.error("cakbot error", e);
    return json({ error: "server_error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
