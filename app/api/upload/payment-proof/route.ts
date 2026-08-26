import { apiData, apiError } from '@/lib/api-response';
import { requireSession } from '@/lib/route-auth';
import { randomUUID } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const MAX_SIZE = 5 * 1024 * 1024;
const TYPES: Record<string, { ext: string; contentType: string }> = {
  'image/jpeg': { ext: 'jpg', contentType: 'image/jpeg' },
  'image/png': { ext: 'png', contentType: 'image/png' },
  'image/webp': { ext: 'webp', contentType: 'image/webp' },
  'application/pdf': { ext: 'pdf', contentType: 'application/pdf' },
};

function proofDir(businessId: string) {
  return join(process.cwd(), '.uploads', 'payment-proofs', businessId);
}

function isExpectedBytes(buffer: Buffer, type: string) {
  if (type === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (type === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (type === 'application/pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  return false;
}

export async function GET(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  try {
    const filename = new URL(request.url).searchParams.get('file') || '';
    const match = /^proof-[0-9a-f-]+\.(jpg|png|webp|pdf)$/.exec(filename);
    if (!match) return apiError('File bukti tidak valid.', 422, 'INVALID_FILE');

    const buffer = await readFile(join(proofDir(auth.session.business_id), filename));
    const type = Object.values(TYPES).find((item) => item.ext === match[1])?.contentType || 'application/octet-stream';
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, max-age=300',
        'Content-Disposition': `inline; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return apiError('File bukti tidak ditemukan.', 404, 'NOT_FOUND');
  }
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) return apiError('File wajib diunggah', 422);
    if (file.size > MAX_SIZE) return apiError('Ukuran file maksimal 5MB', 413);

    const type = TYPES[file.type];
    if (!type) return apiError('Format bukti harus JPG, PNG, WebP, atau PDF.', 422, 'INVALID_FILE_TYPE');

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isExpectedBytes(buffer, file.type)) return apiError('Isi file tidak sesuai format bukti.', 422, 'INVALID_FILE_CONTENT');

    const filename = `proof-${randomUUID()}.${type.ext}`;
    const uploadDir = proofDir(auth.session.business_id);
    const { mkdir } = await import('fs/promises');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);
    const url = `/api/upload/payment-proof?file=${encodeURIComponent(filename)}`;
    return apiData({ url });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Upload gagal', 500, 'UPLOAD_FAILED');
  }
}
