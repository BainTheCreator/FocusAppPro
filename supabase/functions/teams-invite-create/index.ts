import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false}});
function json(b:any,s=200){return new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,OPTIONS'}})}
function code(){return crypto.randomUUID().replace(/-/g,'').slice(0,16);}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return json(null as any);
  try{
    const auth=req.headers.get('authorization')||'';
    const supa=createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
    const {data:u}=await supa.auth.getUser(); if(!u?.user) return json({error:'UNAUTHORIZED'},401);
    const uid=u.user.id;

    const body=await req.json().catch(()=>({}));
    const team_id=Number(body?.team_id);
    const ttlMinutes=Number(body?.ttl_minutes||1440); // 24h
    const max_uses=body?.max_uses==null?null:Number(body.max_uses);

    if(!team_id) return json({error:'BAD_REQUEST'},400);
    const prof=await admin.from('user').select('id').eq('auth_uid',uid).maybeSingle();
    if(prof.error||!prof.data?.id) return json({error:'PROFILE_NOT_FOUND'},400);
    const user_id=prof.data.id as number;

    const member=await admin.from('team_members').select('role').eq('team_id',team_id).eq('user_id',user_id).maybeSingle();
    if(member.error||!member.data||!['owner','admin'].includes(member.data.role)) return json({error:'FORBIDDEN'},403);

    const expires_at=new Date(Date.now()+ttlMinutes*60*1000).toISOString();
    const c=code();

    const ins=await admin.from('team_invites').insert({
      team_id, code:c, created_by:user_id, expires_at, max_uses
    }).select('id,code,expires_at,max_uses,used_count').single();
    if(ins.error) return json({error:ins.error.message},400);

    return json({invite: ins.data},201);
  }catch(e:any){ return json({error:String(e?.message??e)},500); }
});