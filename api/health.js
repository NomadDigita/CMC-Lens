module.exports = function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    status: "ok",
    dataMode: process.env.CMC_PRO_API_KEY ? "live-configured" : "demo",
    supabase: process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY ? {
      configured: true,
      url: process.env.SUPABASE_URL,
      publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY
    } : { configured: false },
    checkedAt: new Date().toISOString()
  });
};
