import 'server-only';

import { NextResponse } from 'next/server';
import { DEPARTMENT_IMAGE_MAX_BYTES, DEPARTMENT_IMAGE_TYPES } from '../schemas/department';

/** The uploaded image from a multipart `file` field, or the 400 response to return. */
export async function readImageUpload(request: Request): Promise<File | NextResponse> {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing image' }, { status: 400 });
  }
  if (!DEPARTMENT_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
  }
  if (file.size > DEPARTMENT_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: 'Image is larger than 5 MB' }, { status: 400 });
  }
  return file;
}
