'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';
import type { FormState } from './auth';

const STATUSES = ['todo', 'in_progress', 'done', 'blocked'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function createTask(_prevState: FormState, formData: FormData): Promise<FormState> {
  const circleId = String(formData.get('circleId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const dueDateRaw = String(formData.get('dueDate') ?? '').trim();
  const ownerRaw = String(formData.get('ownerId') ?? '').trim();
  const recipientRaw = String(formData.get('recipientId') ?? '').trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'Sign in first.' };
  }

  if (!circleId) {
    return { message: 'Missing circle.' };
  }
  if (title.length < 1 || title.length > 120) {
    return { message: 'Task title must be 1 to 120 characters.' };
  }
  if (dueDateRaw && !DATE_PATTERN.test(dueDateRaw)) {
    return { message: 'Due date must be a valid date.' };
  }

  const { error } = await supabase.from('tasks').insert({
    circle_id: circleId,
    title,
    due_date: dueDateRaw || null,
    owner_id: ownerRaw || null,
    recipient_id: recipientRaw || null,
    created_by: user.id,
    status: 'todo',
  });
  if (error) {
    return { message: error.message };
  }

  revalidatePath(`/circles/${circleId}`);
  return { message: 'Task added.', ok: true };
}

export async function setTaskStatus(_prevState: FormState, formData: FormData): Promise<FormState> {
  const taskId = String(formData.get('taskId') ?? '');
  const circleId = String(formData.get('circleId') ?? '');
  const status = String(formData.get('status') ?? '');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'Sign in first.' };
  }

  if (!taskId || !circleId) {
    return { message: 'Missing task or circle.' };
  }
  if (!STATUSES.includes(status)) {
    return { message: 'Choose a valid status.' };
  }

  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)
    .eq('circle_id', circleId);
  if (error) {
    return { message: error.message };
  }

  revalidatePath(`/circles/${circleId}`);
  return { message: 'Status updated.', ok: true };
}
