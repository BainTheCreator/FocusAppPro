// lib/api/teams.ts
import { supabase, FUNCTIONS_BASE } from '@/lib/supabase';

export type TeamListItem = {
  id: number;
  name: string;
  emoji: string | null;
  description: string | null;
  status: 'active'|'paused'|'archived';
  created_at: string;
  membersCount: number;
  membersInitials: string[];
  goalsTotal: number;
  goalsDone: number;
  progress: number;
  isOwner: boolean;
};

export async function createTeam(input: { name: string; emoji?: string; description?: string }) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  // if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${FUNCTIONS_BASE}/teams-create`, {
    method: 'POST',
    headers: { 'content-type':'application/json', authorization:`Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'teams-create failed');
  return JSON.parse(text).team as { id: number; name: string; status: string };
}

export async function fetchTeams(): Promise<TeamListItem[]> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  // if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${FUNCTIONS_BASE}/teams-list`, {
    method: 'POST',
    headers: { 'content-type':'application/json', authorization:`Bearer ${token}` },
    body: '{}',
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'teams-list failed');
  const json = JSON.parse(text);
  return (json.teams ?? []) as TeamListItem[];
}

export async function createInvite(team_id: number, opts?: { ttl_minutes?: number; max_uses?: number|null }) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  // if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${FUNCTIONS_BASE}/teams-invite-create`, {
    method: 'POST',
    headers: { 'content-type':'application/json', authorization:`Bearer ${token}` },
    body: JSON.stringify({ team_id, ...opts }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'teams-invite-create failed');
  return JSON.parse(text).invite as { id:number; code:string; expires_at:string; max_uses:number|null; used_count:number };
}

export async function joinTeam(code: string) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  // if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${FUNCTIONS_BASE}/teams-join`, {
    method: 'POST',
    headers: { 'content-type':'application/json', authorization:`Bearer ${token}` },
    body: JSON.stringify({ code }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'teams-join failed');
  return JSON.parse(text) as { ok: true; team_id: number };
}

export async function setTeamStatus(team_id: number, status: 'active'|'paused'|'archived') {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  //if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${FUNCTIONS_BASE}/team-set-status`, {
    method: 'POST',
    headers: { 'content-type':'application/json', authorization:`Bearer ${token}` },
    body: JSON.stringify({ team_id, status }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'team-set-status failed');
  return JSON.parse(text).team as { id:number; status:string };
}

export async function leaveTeam(team_id: number) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  //if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${FUNCTIONS_BASE}/team-leave`, {
    method: 'POST',
    headers: { 'content-type':'application/json', authorization:`Bearer ${token}` },
    body: JSON.stringify({ team_id }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'team-leave failed');
  return JSON.parse(text) as { ok: true };
}