import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  // RLS hides restricted reports from viewers, so they come back with no row.
  const { data, error } = await supabase
    .from('reports')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) {
    return new Response('Not found', { status: 404 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('care-documents')
    .createSignedUrl(data.storage_path, 60);
  if (signError || !signed?.signedUrl) {
    return new Response('Not available', { status: 404 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
