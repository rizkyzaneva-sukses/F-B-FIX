import { apiData, apiError } from '@/lib/api-response';
import { requireSession } from '@/lib/route-auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) return apiError('File wajib diunggah', 422);
    if (file.size > 5 * 1024 * 1024) return apiError('Ukuran file maksimal 5MB', 413);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = 'proof-' + Date.now() + '.' + ext;
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    const { mkdir } = await import('fs/promises');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);
    const url = '/uploads/' + filename;
    return apiData({ url });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Upload gagal', 500, 'UPLOAD_FAILED');
  }
}
