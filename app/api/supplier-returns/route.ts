import { apiData, apiError, statusFromError } from '@/lib/api-response';
import { postgrestJson } from '@/lib/postgrest';
import { requireOwner } from '@/lib/route-auth';

export async function POST(request: Request) {
  const auth = await requireOwner();
  if ('error' in auth) return auth.error;
  try {
    const payload = await request.json();
    const result = await postgrestJson('/rpc/record_supplier_return', { method: 'POST', body: JSON.stringify({ p_payload: payload }) }, auth.token);
    return apiData(result, 201);
  } catch (error) {
    const detail = statusFromError(error);
    return apiError(detail.message, detail.status, 'SUPPLIER_RETURN_FAILED');
  }
}
