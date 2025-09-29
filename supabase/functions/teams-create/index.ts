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
    const name=String(body?.name||'').trim();
    const emoji=body?.emoji?String(body.emoji):null;
    const description=body?.description?String(body.description):null;
    if(!name) return json({error:'NAME_REQUIRED'},400);

    const prof=await admin.from('user').select('id').eq('auth_uid',uid).maybeSingle();
    if(prof.error||!prof.data?.id) return json({error:'PROFILE_NOT_FOUND'},400);
    const user_id=prof.data.id as number;

    const insTeam=await admin.from('teams').insert({name,emoji,description,status:'active',owner_user_id:user_id})
      .select('id,name,emoji,description,status,created_at,owner_user_id').single();
    if(insTeam.error) return json({error:insTeam.error.message},400);
    const team=insTeam.data;

    const insMember=await admin.from('team_members').insert({team_id:team.id,user_id,role:'owner'}).select('id').single();
    if(insMember.error) return json({error:insMember.error.message},400);

    return json({team},201);
  }catch(e:any){ return json({error:String(e?.message??e)},500); }
});