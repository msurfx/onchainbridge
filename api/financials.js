module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { name } = req.query;
  if (!name) return res.status(400).json({ source: null });

  const apiKey = process.env.REACT_APP_ANTHROPIC_KEY || process.env.ANTHROPIC_KEY;
  if (!apiKey) return res.json({ source: null, error: "no api key" });

  const schema = '{"marketCap":"str","revenue":"str","grossProfit":"str","operatingExpenses":"str","cashAndEquivalents":"str","fixedAssets":"str","inventory":"str","cogs":"str","employees":"str","ticker":"str","price":"str","industry":"str","crossBorderRevenueEstimate":"str","physicalLocations":"str"}';

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: "Find the most recent financial data for " + name + ". Return ONLY valid JSON no markdown: " + schema }]
      })
    });
    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const s = text.indexOf("{"), e = text.lastIndexOf("}");
    if (s >= 0 && e > s) {
      const fin = JSON.parse(text.substring(s, e + 1));
      if (fin.revenue) return res.json({ ...fin, source: "web_search" });
    }
    return res.json({ source: null, raw: text.slice(0, 200) });
  } catch(err) {
    return res.json({ source: null, error: err.message });
  }
};
