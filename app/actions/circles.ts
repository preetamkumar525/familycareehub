'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import type { FormState } from './auth';

const ROLES = ['coordinator', 'caregiver', 'viewer'];

function isRole(value: string): boolean {
  return ROLES.includes(value);
}

export async function createCircle(_prevState: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 1 || name.length > 80) {
    return { message: 'Circle name must be 1 to 80 characters.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'Sign in first.' };
  }

  const { data, error } = await supabase.rpc('create_care_circle', { circle_name: name });
  if (error) {
    return { message: error.message };
  }

  revalidatePath('/');
  redirect(`/circles/${data}`);
}

export async function inviteMember(_prevState: FormState, formData: FormData): Promise<FormState> {
  const circleId = String(formData.get('circleId') ?? '');
  const email = String(formData.get('email') ?? '').trim();
  const role = String(formData.get('role') ?? '');

  if (!circleId) {
    return { message: 'Missing circle.' };
  }
  if (!email) {
    return { message: 'Email is required.' };
  }
  if (!isRole(role)) {
    return { message: 'Choose a valid role.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'Sign in first.' };
  }

  const { error } = await supabase.rpc('add_member_by_email', {
    p_circle: circleId,
    p_email: email,
    p_role: role,
  });
  if (error) {
    return { message: error.message };
  }

  revalidatePath(`/circles/${circleId}`);
  return { message: 'Invitation saved.', ok: true };
}

export async function changeRole(_prevState: FormState, formData: FormData): Promise<FormState> {
  const circleId = String(formData.get('circleId') ?? '');
  const userId = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '');

  if (!circleId || !userId) {
    return { message: 'Missing circle or member.' };
  }
  if (!isRole(role)) {
    return { message: 'Choose a valid role.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'Sign in first.' };
  }

  if (user.id === userId) {
    return { message: 'You cannot change your own role. Ask another coordinator.' };
  }

  const { error } = await supabase
    .from('care_circle_members')
    .update({ role })
    .eq('circle_id', circleId)
    .eq('user_id', userId);
  if (error) {
    return { message: error.message };
  }

  revalidatePath(`/circles/${circleId}`);
  return { message: 'Role updated.', ok: true };
}
