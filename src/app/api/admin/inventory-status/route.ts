// Reports which pieces of the Galla integration are actually configured on
// this deployment — booleans only, never the secret values themselves.
// Backs the live status checklist on /admin/integration.
export async function GET() {
  return Response.json({
    inboundSecretConfigured: !!process.env.INVENTORY_SYNC_SECRET,
    inboundApiKeyConfigured: !!process.env.INVENTORY_SYNC_API_KEY?.trim(),
    ipAllowlistConfigured: !!process.env.INVENTORY_SYNC_ALLOWED_IPS?.trim(),
    gallaOutboundUrlConfigured: !!process.env.GALLA_ORDERS_SYNC_URL?.trim(),
    gallaApiKeyConfigured: !!process.env.GALLA_API_KEY?.trim(),
    gallaStoreCodeConfigured: !!process.env.GALLA_STORE_CODE?.trim(),
    gallaLocCodeConfigured: !!process.env.GALLA_LOC_CODE?.trim(),
  });
}
