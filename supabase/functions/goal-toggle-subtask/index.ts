import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false }});

function json(b:any,s=200){return new Response(JSON.stringify(b),{status:s,headers:{
  'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,OPTIONS'}})}

Deno.serve(async (req)=>{
  if(req.method==='OPTIONS') return json(null as any);
  const rid = crypto.randomUUID();
  try{
    const auth = req.headers.get('authorization')||'';
    const supa = createClient(SUPABASE_URL, ANON_KEY,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});

    const {data:u} = await supa.auth.getUser();
    if(!u?.user) return json({error:'UNAUTHORIZED', rid},401);
    const uid = u.user.id;

    const body = await req.json().catch(()=>({}));
    const subtaskId = Number(body?.subtask_id);
    const is_complete = body?.is_complete as boolean | undefined;
    if(!subtaskId) return json({error:'BAD_REQUEST', rid},400);

    // принадлежность
    const chk = await admin
      .from('target_target')
      .select('id, is_complete, target_id, user_targets:target_id ( id, user_id, user: user_id ( id, auth_uid ) )')
      .eq('id', subtaskId)
      .maybeSingle();
    if(chk.error || !chk.data?.user_targets?.user?.auth_uid) return json({error:'NOT_FOUND', rid},404);
    if(chk.data.user_targets.user.auth_uid !== uid) return json({error:'FORBIDDEN', rid},403);

    const next = typeof is_complete === 'boolean' ? is_complete : !chk.data.is_complete;

    const upd = await admin
      .from('target_target')
      .update({ is_complete: next })
      .eq('id', subtaskId)
      .select('id, name, is_complete, target_id')
      .single();
    if (upd.error || !upd.data) return json({error:'UPDATE_FAILED', rid},400);

    // обновим последнюю активность у цели
    await admin.from('user_targets').update({ last_activity_at: new Date().toISOString() }).eq('id', upd.data.target_id);

    // пересчёт прогресса
    const totalQ = await admin.from('target_target').select('id, is_complete', { head: false }).eq('target_id', upd.data.target_id);
    const list = totalQ.data ?? [];
    const total = list.length;
    const done = list.filter(r=>r.is_complete).length;
    const progress = total>0 ? Math.round(done/total*100) : 0;

    return json({ subtask: upd.data, progress, rid }, 200);
  }catch(e:any){
    console.error('[goal-toggle-subtask] fatal', rid, e?.message ?? e);
    return json({error:String(e?.message ?? e), rid},500);
  }
});