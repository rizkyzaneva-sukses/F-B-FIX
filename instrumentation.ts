export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.POSTGREST_URL) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { bootstrapSingleTenant } = await import("@/lib/bootstrap-single-tenant");
  await bootstrapSingleTenant();
}
