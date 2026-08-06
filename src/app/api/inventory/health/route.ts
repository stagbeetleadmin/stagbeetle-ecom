import { verifyInventoryRequest } from '@/lib/inventoryAuth';

// Lets the inventory/POS integration confirm connectivity and that its
// configured secret (and, if enabled, its source IP) is correct before
// running a full sync job. Signs an empty body the same way /api/inventory/sync
// signs its JSON body.
export async function GET(request: Request) {
  const auth = await verifyInventoryRequest(request, '');
  if (!auth.ok) {
    return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  return Response.json({ ok: true, time: new Date().toISOString() });
}
