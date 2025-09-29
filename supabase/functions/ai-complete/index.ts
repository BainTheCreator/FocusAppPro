import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

type Task = 'decompose_goal' | 'insights' | 'team_help';

type Body =
  | { task: 'decompose_goal'; input: { title: string; description?: string | null; deadline?: string | null } }
  | { task: 'insights'; input: { summary: string } }
  | { task: 'team_help'; input: { context: string } };

// Env
const OPENROUTER_KEY = Deno.env.get('OPENROUTER_API_KEY') || '';
const OPENROUTER_MODEL = Deno.env.get('OPENROUTER_MODEL') || ''; // глобальный оверрайд, если задан
const DEEPSEEK_KEY = Deno.env.get('DEEPSEEK_API_KEY') || '';
const DEEPSEEK_MODEL = Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-reasoner';
// безопасный referer (опционально)
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') || Deno.env.get('SUPABASE_URL') || '';

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'POST,OPTIONS',
    },
  });
}

function sysPromptFor(task: Task) {
  if (task === 'decompose_goal') {
    return `
Ты — ассистент по декомпозиции целей. Отвечай ТОЛЬКО валидным JSON без пояснений:
{ "steps": [ { "name": string, "is_complete": false }... ] }
Правила:
- 5–10 шагов, каждый конкретный и измеримый.
- Без нумерации и без лишнего текста в полях.
- Не нарушай JSON-формат.`;
  }
  if (task === 'insights') {
    return `Ты — коуч по целям. Дай 3–5 идей, как ускорить прогресс.
Формат: только чистый текст (plain text), без Markdown/разметки/эмодзи, без списков/нумерации, без кода и без LaTeX/формул.
Пиши 3–5 коротких предложений, каждое на новой строке.`;
  }
  return `Ты — ассистент команды. Дай предложения и короткий план по запросу. Ответ — простой текст (markdown разрешён).`;
}

function userPrompt(task: Task, input: any) {
  if (task === 'decompose_goal') {
    const { title, description, deadline } = input || {};
    return `Цель: ${title}
Описание: ${description || '—'}
Дедлайн: ${deadline || '—'}
Сформируй JSON с шагами.`;
  }
  if (task === 'insights') {
    return `Краткое описание целей/прогресса: ${input?.summary || '—'}
Дай 3–5 практических идей/наблюдений. Помни: только plain text, по одному предложению на строку.`;
  }
  return `Контекст команды / запрос: ${input?.context || '—'}
Дай сжатые предложения и план.`;
}

function modelFor(task: Task) {
  // если задан глобальный оверрайд — используем его
  if (OPENROUTER_MODEL) return OPENROUTER_MODEL;
  // по умолчанию: инсайты — чат-модель, декомпозиция — reasoning
  if (task === 'insights') return 'deepseek/deepseek-chat';
  if (task === 'decompose_goal') return 'deepseek/deepseek-r1';
  return 'deepseek/deepseek-chat';
}

async function callOpenRouter(messages: any[], task: Task) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${OPENROUTER_KEY}`,
    'content-type': 'application/json',
    'X-Title': 'FocusAppPro',
  };
  if (APP_ORIGIN) headers['HTTP-Referer'] = APP_ORIGIN; // только если задан валидный URL

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelFor(task),
      messages,
      temperature: 0.3,
      max_tokens: 1200,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`OpenRouter error ${res.status}: ${t}`);
  }
  return res.json();
}

async function callDeepSeek(messages: any[]) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 1200,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`DeepSeek error ${res.status}: ${t}`);
  }
  return res.json();
}

function extractContent(resp: any): { content: string; reasoning?: string } {
  try {
    const ch = resp?.choices?.[0] ?? {};
    const msg = ch?.message ?? {};
    const content = msg?.content ?? ch?.content ?? '';
    const reasoning = msg?.reasoning_content ?? ch?.reasoning ?? undefined;
    return { content: typeof content === 'string' ? content : JSON.stringify(content), reasoning };
  } catch {
    return { content: '' };
  }
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    const m = s.match(/\{[\s\S]*\}$/m);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
    return null;
  }
}

// Вырезает блоки, ограждённые тремя бэктиками, без использования явного "```" в исходнике
function stripBacktickFences(text: string): string {
  const tick = String.fromCharCode(96); // `
  const fence = tick + tick + tick;
  if (text.indexOf(tick) === -1) return text;

  let out = '';
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf(fence, i);
    if (start === -1) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, start);
    const end = text.indexOf(fence, start + fence.length);
    if (end === -1) {
      // если нет закрывающей — удаляем открывающую и выходим
      i = start + fence.length;
      out += text.slice(i);
      break;
    }
    i = end + fence.length; // пропускаем содержимое блока
  }
  return out;
}

// Удаление блоков, ограждённых тройными бэктиками (без использования самих бэктиков в коде)
function stripTripleBackticks(text: string): string {
  const tick = String.fromCharCode(96); // `
  const fence = tick + tick + tick;
  let s = text;
  while (true) {
    const start = s.indexOf(fence);
    if (start === -1) break;
    const end = s.indexOf(fence, start + fence.length);
    if (end === -1) {
      // нет закрывающего — удаляем открывающую последовательность и выходим
      s = s.slice(0, start) + s.slice(start + fence.length);
      break;
    }
    s = s.slice(0, start) + s.slice(end + fence.length);
  }
  return s;
}

// Очень простой и безопасный стриппер форматирования → plain text
function toPlainText(input: string): string {
  if (!input) return '';

  let s = input;

  // 1) Срезаем блоки кода по тройным бэктикам
  s = stripTripleBackticks(s);

  // 2) Убираем одиночные бэктики (inline code)
  s = s.split('`').join('');

  // 4) Простое форматирование: жирный/курсив/зачёркнутый
  s = s.replace(/\*\*/g, '')
       .replace(/__/g, '')
       .replace(/~~/g, '');
  // если где-то остались одиночные * или _, тоже уберём
  s = s.replace(/\*/g, '').replace(/_/g, '');

  // 5) Заголовки и цитаты
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, '') // #
       .replace(/^\s*>\s?/gm, '');         // >

  // 6) Буллеты/нумерация в начале строк
  s = s.replace(/^\s*[-*+•–—]\s+/gm, '')
       .replace(/^\s*\d{1,3}[.)]\s+/gm, '');

  // 7) Подчистка пробелов/переносов
  s = s.replace(/\r/g, '')
       .replace(/[ \t]+\n/g, '\n')
       .replace(/\n{3,}/g, '\n\n')
       .trim();

  return s;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json(null);
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const task = body?.task as Task;
    if (!task) return json({ error: 'TASK_REQUIRED' }, 400);

    const system = sysPromptFor(task);
    const user = userPrompt(task, (body as any)?.input || {});
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];

    let resp: any;
    if (OPENROUTER_KEY) resp = await callOpenRouter(messages, task);
    else if (DEEPSEEK_KEY) resp = await callDeepSeek(messages);
    else throw new Error('No provider key. Set OPENROUTER_API_KEY or DEEPSEEK_API_KEY');

    const { content, reasoning } = extractContent(resp);

    if (task === 'decompose_goal') {
      const data = safeJsonParse(content);
      if (!data?.steps || !Array.isArray(data.steps)) {
        return json({ error: 'BAD_JSON', raw: content }, 400);
      }
      const steps = data.steps
        .map((s: any) => ({
          name: String(s?.name || '').trim(),
          is_complete: !!s?.is_complete,
        }))
        .filter((x: any) => x.name.length > 0);
      return json({ steps, reasoning });
    }

    if (task === 'insights') {
      // Возвращаем только plain text без Markdown/LaTeX/буллетов
      return json({ text: toPlainText(content), reasoning });
    }

    return json({ text: content, reasoning });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});