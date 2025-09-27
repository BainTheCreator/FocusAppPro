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
    const target_id = Number(body?.target_id);
    const status = String(body?.status || '').trim();
    if(!target_id || !['active','paused','completed'].includes(status)) return json({error:'BAD_REQUEST', rid},400);

    const chk = await admin
      .from('user_targets')
      .select('id, user_id, status, completed_at, user:user_id ( id, auth_uid )')
      .eq('id', target_id)
      .maybeSingle();
    if(chk.error || !chk.data?.user?.auth_uid) return json({error:'NOT_FOUND', rid},404);
    if(chk.data.user.auth_uid !== uid) return json({error:'FORBIDDEN', rid},403);

    const now = new Date().toISOString();
    const patch: any = { status, last_activity_at: now };

    // completed_at: ставим при первом переходе в completed, не затираем при возвратах
    if (status === 'completed' && !chk.data.completed_at) {
      patch.completed_at = now;
    }

    const upd = await admin
      .from('user_targets')
      .update(patch)
      .eq('id', target_id)
      .select('id, name, status, icon, date_end, description, created_at, last_activity_at, completed_at')
      .single();

    if (upd.error || !upd.data) return json({error:'UPDATE_FAILED', rid},400);

    return json({ target: upd.data, rid }, 200);
  }catch(e:any){
    console.error('[goal-set-status] fatal', rid, e?.message ?? e);
    return json({error:String(e?.message ?? e), rid},500);
  }
});