const { TwitterApi } = require("twitter-api-v2");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const { company, potential, savings, sectors, mode } = req.body;
  if (!company) return res.status(400).json({ error: "No company" });

  const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
  });

  const sectorLine = sectors?.length
    ? sectors.map(s => `#${s}`).join(" ")
    : "";

  const tweet = mode === "onchain"
    ? `🔗 Onchain gap analysis: ${company}\n\n📊 Coverage: ${potential}%\n💰 Top opportunity: ${savings}\n\n${sectorLine}\n\napp.onchainbridge.xyz #OnChainBridge #Solana`
    : `🌉 Web2→Onchain: ${company}\n\n⚡ Onchain potential: ${potential}%\n💰 Projected savings: ${savings}\n\n${sectorLine}\n\napp.onchainbridge.xyz #OnChainBridg try {
    const result = await client.v2.tweet(tweet);
    res.status(200).json({ success: true, id: result.data.id });
  } catch (e) {
    console.error("Tweet error:", e);
    res.status(500).json({ error: e.message });
  }
};
