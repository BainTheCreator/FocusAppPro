import { supabase, FUNCTIONS_BASE } from '@/lib/supabase';

export async function aiDecomposeGoal(input: { title: string; description?: string | null; deadline?: string | null }) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  // if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${FUNCTIONS_BASE}/ai-complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ task: 'decompose_goal', input }),
  });
  const text = await res.text();
  console.log(text);
  if (!res.ok) throw new Error(text || 'ai-complete failed');
  const json = JSON.parse(text);
  return (json.steps as Array<{ name: string; is_complete: boolean }>) || [];
}

export async function aiInsights(summary: string) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  // if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${FUNCTIONS_BASE}/ai-complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ task: 'insights', input: { summary } }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'ai-complete failed');
  return JSON.parse(text).text as string;
}