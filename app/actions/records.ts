'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';

type FormState = { message: string; ok?: boolean };

const VISIBILITIES = ['standard', 'restricted'];
const FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_FILE_BYTES = 10485760;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Empty input becomes null; otherwise the trimmed text is returned.
function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? '').trim();
  return value === '' ? null : value;
}

// Empty input becomes null; otherwise it must be a YYYY-MM-DD date.
function optionalDate(formData: FormData, key: string): { value: string | null; valid: boolean } {
  const value = String(formData.get(key) ?? '').trim();
  if (value === '') {
    return { value: null, valid: true };
  }
  return { value, valid: DATE_PATTERN.test(value) };
}

export async function addRecipient(_prevState: FormState, formData: FormData): Promise<FormState> {
  const circleId = String(formData.get('circleId') ?? '');
  const fullName = String(formData.get('fullName') ?? '').trim();
  const dob = optionalDate(formData, 'dateOfBirth');

  if (!circleId) {
    return { message: 'Missing circle.' };
  }
  if (fullName.length < 1 || fullName.length > 80) {
    return { message: 'Name must be 1 to 80 characters.' };
  }
  if (!dob.valid) {
    return { message: 'Date of birth must be a valid date.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'Sign in first.' };
  }

  const { error } = await supabase.from('care_recipients').insert({
    circle_id: circleId,
    full_name: fullName,
    date_of_birth: dob.value,
    created_by: user.id,
  });
  if (error) {
    return { message: error.message };
  }

  revalidatePath(`/circles/${circleId}`);
  return { message: 'Saved.', ok: true };
}

export async function addAppointment(_prevState: FormState, formData: FormData): Promise<FormState> {
  const circleId = String(formData.get('circleId') ?? '');
  const recipientId = String(formData.get('recipientId') ?? '');
  const startsAtRaw = String(formData.get('startsAt') ?? '').trim();
  const startsAt = startsAtRaw === '' ? null : startsAtRaw;
  const providerName = optionalText(formData, 'providerName');
  const locationOrLink = optionalText(formData, 'locationOrLink');
  const purpose = String(formData.get('purpose') ?? '').trim();
  const notes = optionalText(formData, 'notes');
  const transportArranged = formData.get('transportArranged') === 'on';

  if (!circleId || !recipientId) {
    return { message: 'Missing circle or recipient.' };
  }
  if (purpose.length < 1 || purpose.length > 200) {
    return { message: 'Purpose must be 1 to 200 characters.' };
  }
  if (notes !== null && notes.length > 1000) {
    return { message: 'Notes must be at most 1000 characters.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'Sign in first.' };
  }

  const { error } = await supabase.from('appointments').insert({
    circle_id: circleId,
    recipient_id: recipientId,
    starts_at: startsAt,
    provider_name: providerName,
    location_or_link: locationOrLink,
    purpose,
    notes,
    transport_arranged: transportArranged,
    created_by: user.id,
  });
  if (error) {
    return { message: error.message };
  }

  revalidatePath(`/circles/${circleId}`);
  return { message: 'Saved.', ok: true };
}

export async function addPrescription(_prevState: FormState, formData: FormData): Promise<FormState> {
  const circleId = String(formData.get('circleId') ?? '');
  const recipientId = String(formData.get('recipientId') ?? '');
  const medicationName = String(formData.get('medicationName') ?? '').trim();
  // Dose and schedule are stored exactly as typed (outer whitespace trimmed only).
  // No parsing, normalising or dosing logic is applied to them.
  const doseText = optionalText(formData, 'doseText');
  const scheduleText = optionalText(formData, 'scheduleText');
  const pharmacyName = optionalText(formData, 'pharmacyName');
  const prescriberName = optionalText(formData, 'prescriberName');
  const refill = optionalDate(formData, 'refillDate');

  if (!circleId || !recipientId) {
    return { message: 'Missing circle or recipient.' };
  }
  if (medicationName.length < 1 || medicationName.length > 120) {
    return { message: 'Medication name must be 1 to 120 characters.' };
  }
  if (doseText !== null && doseText.length > 200) {
    return { message: 'Dose must be at most 200 characters.' };
  }
  if (scheduleText !== null && scheduleText.length > 200) {
    return { message: 'Schedule must be at most 200 characters.' };
  }
  if (pharmacyName !== null && pharmacyName.length > 120) {
    return { message: 'Pharmacy name must be at most 120 characters.' };
  }
  if (prescriberName !== null && prescriberName.length > 120) {
    return { message: 'Prescriber name must be at most 120 characters.' };
  }
  if (!refill.valid) {
    return { message: 'Refill date must be a valid date.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'Sign in first.' };
  }

  const { error } = await supabase.from('prescriptions').insert({
    circle_id: circleId,
    recipient_id: recipientId,
    medication_name: medicationName,
    dose_text: doseText,
    schedule_text: scheduleText,
    pharmacy_name: pharmacyName,
    prescriber_name: prescriberName,
    refill_date: refill.value,
    created_by: user.id,
  });
  if (error) {
    return { message: error.message };
  }

  revalidatePath(`/circles/${circleId}`);
  return { message: 'Saved.', ok: true };
}

export async function addReport(_prevState: FormState, formData: FormData): Promise<FormState> {
  const circleId = String(formData.get('circleId') ?? '');
  const recipientId = String(formData.get('recipientId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const reportDate = optionalDate(formData, 'reportDate');
  const source = optionalText(formData, 'source');
  const visibility = String(formData.get('visibility') ?? '');
  const file = formData.get('file');

  if (!circleId || !recipientId) {
    return { message: 'Missing circle or recipient.' };
  }
  if (title.length < 1 || title.length > 120) {
    return { message: 'Title must be 1 to 120 characters.' };
  }
  if (!reportDate.valid) {
    return { message: 'Report date must be a valid date.' };
  }
  if (source !== null && source.length > 120) {
    return { message: 'Source must be at most 120 characters.' };
  }
  if (!VISIBILITIES.includes(visibility)) {
    return { message: 'Choose a valid visibility.' };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { message: 'Choose a file to upload.' };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { message: 'File must be 10 MB or smaller.' };
  }
  if (!FILE_TYPES.includes(file.type)) {
    return { message: 'File must be a PDF, PNG or JPEG.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'Sign in first.' };
  }

  const reportId = crypto.randomUUID();
  const safeName = (file.name || 'document').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100);
  const storagePath = `${circleId}/${reportId}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('care-documents')
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return { message: uploadError.message };
  }

  const { error: insertError } = await supabase.from('reports').insert({
    id: reportId,
    circle_id: circleId,
    recipient_id: recipientId,
    title,
    report_date: reportDate.value,
    source,
    visibility,
    storage_path: storagePath,
    mime_type: file.type,
    created_by: user.id,
  });
  if (insertError) {
    await supabase.storage.from('care-documents').remove([storagePath]);
    return { message: insertError.message };
  }

  revalidatePath(`/circles/${circleId}`);
  return { message: 'Saved.', ok: true };
}
