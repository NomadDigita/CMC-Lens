Deno.serve(async (req: Request) => {
  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "BUDGET_SERVICE_UNAVAILABLE" }, 503);

  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "AUTH_REQUIRED" }, 401);

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!authResponse?.ok) return json({ error: "AUTH_REQUIRED" }, 401);
  const user = await authResponse.json().catch(() => null);
  if (typeof user?.id !== "string") return json({ error: "AUTH_REQUIRED" }, 401);

  let body: { credits?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400);
  }
  const credits = Number(body?.credits);
  if (!Number.isInteger(credits) || credits < 1 || credits > 30) {
    return json({ error: "INVALID_CREDIT_ESTIMATE" }, 400);
  }

  const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/reserve_cmc_history_budget`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ p_user_id: user.id, p_credits: credits }),
  }).catch(() => null);
  if (!rpcResponse?.ok) return json({ error: "BUDGET_SERVICE_UNAVAILABLE" }, 503);
  const result = await rpcResponse.json().catch(() => null);
  const row = Array.isArray(result) ? result[0] : result;
  if (!row || typeof row.allowed !== "boolean") return json({ error: "BUDGET_SERVICE_UNAVAILABLE" }, 503);
  return json({ allowed: row.allowed, retryAfterSeconds: Number(row.retry_after_seconds) || 0, remainingCredits: Number(row.remaining_credits) || 0 });
});