import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false}});
function json(b:any,s=200){return new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,OPTIONS'}})}
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return json(null as any);
  try{
    const auth=req.headers.get('authorization')||'';
    const supa=createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
    const {data:u}=await supa.auth.getUser(); if(!u?.user) return json({error:'UNAUTHORIZED'},401);
    const uid=u.user.id;
    const body=await req.json().catch(()=>({}));
    const team_id=Number(body?.team_id);
    const status=String(body?.status||'').trim();
    if(!team_id || !['active','paused','archived'].includes(status)) return json({error:'BAD_REQUEST'},400);

    const prof=await admin.from('user').select('id').eq('auth_uid',uid).maybeSingle();
    if(prof.error||!prof.data?.id) return json({error:'PROFILE_NOT_FOUND'},400);
    const user_id=prof.data.id as number;

    const mem=await admin.from('team_members').select('role').eq('team_id',team_id).eq('user_id',user_id).maybeSingle();
    if(mem.error||!mem.data||!['owner','admin'].includes(mem.data.role)) return json({error:'FORBIDDEN'},403);

    const upd=await admin.from('teams').update({status}).eq('id',team_id).select('id,name,status').single();
    if(upd.error) return json({error:upd.error.message},400);

    return json({team: upd.data},200);
  }catch(e:any){ return json({error:String(e?.message??e)},500); }
});