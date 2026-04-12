module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "no prompt" });

  const cleanJSON = (str) => {
    const first = str.indexOf('{');
    const last = str.lastIndexOf('}');
    if (first >= 0 && last > first) return str.substring(first, last + 1);
    return str;
  };

  const groqKey = process.env.REACT_APP_GROQ_API_KEY;
  if (groqKey) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + groqKey
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 8000,
          temperature: 0.7
        })
      });
      const data = await r.json();
      if (data.choices?.[0]?.message?.content) {
        console.log('Groq success');
        return res.json({ text: cleanJSON(data.choices[0].message.content) });
      }
      console.log('Groq failed, falling back to Haiku:', JSON.stringify(data).slice(0,200));
    } catch(err) {
      console.log('Groq error, falling back to Haiku:', err.message);
    }
  }

  const anthropicKey = process.env.ANTHROPIC_KEY;
  if (!anthropicKey) return res.status(500).json({ error: "no fallback key" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10000,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await r.json();
    if (data.content?.[0]?.text) {
      console.log('Haiku fallback success');
      return res.json({ text: cleanJSON(data.content[0].text) });
    }
    return res.status(500).json({ error: "both models failed", raw: JSON.stringify(data).slice(0,200) });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
};
