// supabase/functions/telegram-exchange/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!; // от @BotFather

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyTelegram(data: Record<string, string>) {
  const authDate = Number(data.auth_date ?? 0);
  const now = Math.floor(Date.now() / 1000);
  // Не старше 5 минут
  if (!authDate || now - authDate > 300) {
    throw new Error("Auth data is too old");
  }

  const hash = data.hash;
  if (!hash) throw new Error("Missing hash");

  // Строка проверяемых данных
  const pairs = Object.entries(data)
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // секрет: HMAC-SHA256(data_check_string, SHA256(bot_token))
  const secret = await crypto.subtle.digest("SHA-256", enc.encode(BOT_TOKEN));
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(pairs));
  const calc = toHex(sig);

  if (calc !== hash) throw new Error("Bad signature");
}

async function deterministicPassword(tgId: string) {
  // Пароль, который не надо хранить — вычисляем по tgId и секрету бота
  const secretSalt = `tg:${BOT_TOKEN}:v1`;
  const raw = `${tgId}:${secretSalt}`;
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(raw));
  return toHex(digest);
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const data: Record<string, string> = body?.auth ?? {};
    if (!data.id) throw new Error("No telegram data");

    await verifyTelegram(data);

    const tgId = String(data.id);
    const email = `tg-${tgId}@telegram.local`; // синтетическая почта
    const name =
      [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || `tg_${tgId}`;
    const password = await deterministicPassword(tgId);

    // 1) создать пользователя (если уже есть — игнорируем ошибку)
    const create = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        telegram_id: tgId,
        username: data.username ?? null,
        from_login: "telegram",
        avatar_url: data.photo_url ?? null,
      },
    });
    if (create.error && !/already registered/i.test(create.error.message)) {
      throw create.error;
    }

    // 2) Войти этим пользователем и получить сессию
    const sign = await anon.auth.signInWithPassword({ email, password });
    if (sign.error || !sign.data.session) throw sign.error ?? new Error("No session");

    // 3) Обновить профиль (на всякий случай) — id = uuid пользователя
    const uid = sign.data.user.id;
    await admin.from("profiles").upsert({
      id: uid,
      name,
      email,
      telegram_id: Number(tgId),
      from_login: "telegram",
    });

    // 4) Отдать access/refresh токены
    const s = sign.data.session;
    return new Response(
      JSON.stringify({
        access_token: s.access_token,
        refresh_token: s.refresh_token,
        expires_in: s.expires_in,
        token_type: s.token_type,
        user: sign.data.user,
      }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
});