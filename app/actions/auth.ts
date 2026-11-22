'use server';

import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

export type FormState = { message: string; ok?: boolean };

export async function signUp(_prevState: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!name || !email || !password) {
    return { message: 'Name, email and password are required.' };
  }
  if (password.length < 8) {
    return { message: 'Password must be at least 8 characters.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    return { message: error.message };
  }
  if (!data.session) {
    return { message: 'Check your email to confirm, then sign in.', ok: true };
  }

  redirect('/');
}

export async function signIn(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { message: 'Email and password are required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { message: error.message };
  }

  redirect('/');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/sign-in');
}
