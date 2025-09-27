import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession:false, autoRefreshToken:false }});

function json(b:any,s=200){return new Response(JSON.stringify(b),{status:s,headers:{
  'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,OPTIONS'}})}

Deno.serve(async (req)=>{
  if(req.method==='OPTIONS') return json(null as any);
  const auth = req.headers.get('authorization')||'';
  const supa = createClient(SUPABASE_URL, ANON_KEY,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data:u} = await supa.auth.getUser(); if(!u?.user) return json({error:'UNAUTHORIZED'},401);
  const uid = u.user.id;

  // берём числовой user_id из public.user
  const prof = await admin.from('user').select('id').eq('auth_uid', uid).maybeSingle();
  if (prof.error || !prof.data?.id) return json({ goals: [] }, 200);

  const q = await admin
    .from('user_targets')
    .select('id,created_at,name,description,icon,date_end,status,target_target ( id,is_complete,target_id )')
    .eq('user_id', prof.data.id)
    .order('created_at', { ascending: false });

  if (q.error) return json({ error:q.error.message }, 400);

  // опционально можно сюда же посчитать progress, но клиент и сам считает
  return json({ goals: q.data }, 200);
});