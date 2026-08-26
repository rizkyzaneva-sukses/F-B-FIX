import { apiData, apiError, statusFromError } from '@/lib/api-response';
import { isIsoDate } from '@/lib/query';
import { postgrestJson } from '@/lib/postgrest';
import { requireOwner } from '@/lib/route-auth';

export async function GET(request: Request) {
  const auth = await requireOwner();
  if ('error' in auth) return auth.error;
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
    if (!isIsoDate(date)) return apiError('Tanggal rekonsiliasi tidak valid.', 422, 'VALIDATION_ERROR');
    const rows = await postgrestJson('/cash_reconciliations?reconciliation_date=eq.' + date + '&select=*', {}, auth.token);
    return apiData(rows);
  } catch (error) {
    const detail = statusFromError(error);
    return apiError(detail.message, detail.status);
  }
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if ('error' in auth) return auth.error;
  try {
    const payload = await request.json();
    delete payload.system_cash;
    const result = await postgrestJson('/rpc/upsert_cash_reconciliation', { method: 'POST', body: JSON.stringify({ p_payload: payload }) }, auth.token);
    return apiData(result, 201);
  } catch (error) {
    const detail = statusFromError(error);
    return apiError(detail.message, detail.status, 'RECONCILIATION_FAILED');
  }
}
