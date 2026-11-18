module.exports = function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    status: "ok",
    dataMode: process.env.CMC_PRO_API_KEY ? "live-configured" : "demo",
    checkedAt: new Date().toISOString()
  });
};
