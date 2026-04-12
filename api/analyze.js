module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "no prompt" });

  const cleanJSON = (str) => {
    str = str.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
    const first = str.indexOf('{');
    const last = str.lastIndexOf('}');
    if (first >= 0 && last > first) str = str.substring(first, last + 1);
    return str;
  };

  // Try Groq first
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
          max_tokens: 10000,
          temperature: 0.7
        })
      });
      const data = await r.json();
      if (data.choices?.[0]?.message?.content) {
        console.log('Groq success');
        return res.json({ text: cleanJSON(data.choices[0].message.content) });
      }
      console.log('Groq failed, falling back to Gemini:', JSON.stringify(data).slice(0,200));
    } catch(err) {
      console.log('Groq error, falling back to Gemini:', err.message);
    }
  }

  // Fallback to Gemini (free)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.status(500).json({ error: "no fallback key" });
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8000, temperature: 0.7 }
      })
    });
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      console.log('Gemini fallback success');
      return res.json({ text: cleanJSON(text) });
    }
    return res.status(500).json({ error: "both models failed", raw: JSON.stringify(data).slice(0,200) });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
};
