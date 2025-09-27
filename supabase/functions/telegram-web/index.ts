import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve((req) => {
  const url = new URL(req.url);
  const redirectUri = url.searchParams.get('redirect_uri') ?? 'goalsapp://tg-auth';
  const botUserName = Deno.env.get('TELEGRAM_BOT_USERNAME')!;

  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login with Telegram</title>
<style>body{background:#0B0F14;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,system-ui,sans-serif}.wrap{text-align:center}.hint{opacity:.6;margin-top:14px;font-size:14px}</style>
</head>
<body>
  <div class="wrap">
    <script async src="https://telegram.org/js/telegram-widget.js?22"
      data-telegram-login="${botUserName}"
      data-size="large"
      data-userpic="false"
      data-request-access="write"
      data-lang="ru"
      data-radius="8"
      data-on-auth="onTelegramAuth">
    </script>
    <div class="hint">Войдите через Telegram</div>
  </div>
  <script>
    function onTelegramAuth(user){
      const q = new URLSearchParams(); for (const k in user) q.append(k, user[k]);
      try {
        if (window.opener && typeof window.opener.postMessage === 'function') {
          var payload = {}; q.forEach((v,k)=>payload[k]=v);
          window.opener.postMessage({ __tgAuth: true, payload }, '*');
          window.close(); return;
        }
      } catch (e) {}
      // Native/Web fallback: редирект
      window.location.replace('${redirectUri}?'+q.toString());
    }
  </script>
</body>
</html>`;

  const csp = [
    "default-src 'self' https://telegram.org https://*.telegram.org https://t.me",
    "script-src 'self' https://telegram.org https://*.telegram.org 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src * data: blob:",
    "connect-src *",
    "frame-src https://telegram.org https://*.telegram.org",
    "frame-ancestors 'none'"
  ].join('; ');

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'content-security-policy': csp,
      'cache-control': 'no-store, max-age=0',
      'referrer-policy': 'no-referrer'
    }
  });
});