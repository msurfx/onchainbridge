const { execSync } = require("child_process");
const http = require("http");
const url = require("url");

const OPENCLAW = "/Users/jamscosmo/.nvm/versions/node/v24.1.0/bin/openclaw";

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { query } = url.parse(req.url, true);
  const name = (query.name || "").replace(/"/g, "");
  if (!name) return res.end(JSON.stringify({ source: null }));

  try {
    const prompt = `Find real current market cap, annual revenue, employee count for ${name}. Return ONLY valid JSON no markdown: {"marketCap":"str","revenue":"str","employees":"str","ticker":"str","price":"str"}`;
    const output = execSync(`${OPENCLAW} "${prompt}"`, { timeout: 20000, encoding: "utf8" });
    const s = output.indexOf("{"), e = output.lastIndexOf("}");
    if (s >= 0 && e > s) {
      const data = JSON.parse(output.substring(s, e + 1));
      return res.end(JSON.stringify({ ...data, source: "openclaw" }));
    }
    res.end(JSON.stringify({ source: null, raw: output.slice(0, 200) }));
  } catch (err) {
    res.end(JSON.stringify({ source: null, error: err.message.slice(0, 150) }));
  }
});

server.listen(3333, () => console.log("OpenClaw server running on http://localhost:3333"));
