import { createServerSupabase } from '@/src/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getUser() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function getOrgId(): Promise<string> {
  const user = await requireUser();
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('organisation_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!data) {
    redirect('/login');
  }

  return data.org_id;
}

export async function requireAuth(): Promise<{ userId: string; orgId: string }> {
  const user = await requireUser();
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('organisation_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!data) {
    redirect('/login');
  }

  return { userId: user.id, orgId: data.org_id };
}
