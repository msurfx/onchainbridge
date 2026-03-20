const { TwitterApi } = require("twitter-api-v2");

let lastTweetTime = 0;
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  
  const now = Date.now();
  if (now - lastTweetTime < COOLDOWN_MS) {
    return res.status(200).json({ skipped: true, reason: "rate limited" });
  }

  const { company, potential, savings, sectors, mode } = req.body;
  if (!company) return res.status(400).json({ error: "No company" });

  const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
  });

  const sectorLine = sectors?.length ? sectors.map(s => `#${s}`).join(" ") : "";
  const tweet = mode === "onchain"
    ? `🔗 Onchain gap analysis: ${company}\n\n📊 Coverage: ${potential}%\n💰 Top opportunity: ${savinn${sectorLine}\n\napp.onchainbridge.xyz #OnChainBridge #Solana`
    : `🌉 Web2→Onchain: ${company}\n\n⚡ Onchain fit: ${potential}%\n💰 Projected savings: ${savings}\n\n${sectorLine}\n\napp.onchainbridge.xyz #OnChainBridge #Solana`;

  try {
    const result = await client.v2.tweet(tweet);
    lastTweetTime = now;
    res.status(200).json({ success: true, id: result.data.id });
  } catch (e) {
    console.error("Tweet error:", e);
    res.status(500).json({ error: e.m);
  }
};
