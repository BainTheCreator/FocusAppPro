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
    const code=String(body?.code||'').trim();
    if(!code) return json({error:'BAD_REQUEST'},400);

    const prof=await admin.from('user').select('id').eq('auth_uid',uid).maybeSingle();
    if(prof.error||!prof.data?.id) return json({error:'PROFILE_NOT_FOUND'},400);
    const user_id=prof.data.id as number;

    const inv=await admin.from('team_invites').select('id,team_id,expires_at,max_uses,used_count,is_revoked').eq('code',code).maybeSingle();
    if(inv.error||!inv.data) return json({error:'INVALID_CODE'},400);
    if(inv.data.is_revoked) return json({error:'REVOKED'},400);
    if(inv.data.expires_at && new Date(inv.data.expires_at).getTime()<Date.now()) return json({error:'EXPIRED'},400);
    if(inv.data.max_uses!=null && inv.data.used_count>=inv.data.max_uses) return json({error:'NO_SLOTS'},400);

    // уже член?
    const mem=await admin.from('team_members').select('id').eq('team_id',inv.data.team_id).eq('user_id',user_id).maybeSingle();
    if(!mem.data){
      const ins=await admin.from('team_members').insert({team_id:inv.data.team_id,user_id,role:'member'}).select('id').single();
      if(ins.error) return json({error:ins.error.message},400);
      await admin.from('team_invites').update({used_count:(inv.data.used_count||0)+1}).eq('id',inv.data.id);
    }

    return json({ok:true, team_id: inv.data.team_id},200);
  }catch(e:any){ return json({error:String(e?.message??e)},500); }
});