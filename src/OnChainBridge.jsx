import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   OnChainBridge v4
   - Web2 mode: full 16-sector migration analysis
   - Onchain mode: existing activity + gap analysis
   - Policy/Regulatory sector (always loaded)
   - Wallet Connect (Phantom/Solflare)
   - Gap activation with fee capture
   - Shareable X card
   ═══════════════════════════════════════════════════════════════════════ */

const C = {
  bg: "#06090F", bg2: "#0A0F18", surface: "#0E1420", card: "#121A28",
  border: "#1B2640", green: "#14F195", purple: "#9945FF",
  cyan: "#00D1FF", orange: "#FF7A3D", red: "#FF4D6A", yellow: "#FFD93D",
  pink: "#FF6B9D", text: "#E4E9F0", dim: "#6B7D99", muted: "#3D4F6A",
};

const FIXED_SECTORS = ["financial", "payments", "collaborations", "openclaw", "policy"];
const SELECTABLE_SECTORS = ["yield", "depin", "rwa", "employee", "treasury", "supplychain", "governance", "data", "identity", "insurance", "carbon", "loyalty", "impact"];

const SECTOR_META = {
  overview: { icon: "◆", label: "Overview" },
  financial: { icon: "📊", label: "Financial" },
  payments: { icon: "💸", label: "Payments" },
  collaborations: { icon: "🤝", label: "Collabs" },
  openclaw: { icon: "🦞", label: "OpenClaw" },
  policy: { icon: "⚖️", label: "Policy" },
  yield: { icon: "💰", label: "Yield" },
  depin: { icon: "📡", label: "DePIN" },
  rwa: { icon: "🏛️", label: "RWA" },
  employee: { icon: "👥", label: "People" },
  treasury: { icon: "🏦", label: "Treasury" },
  supplychain: { icon: "📦", label: "Supply Chain" },
  governance: { icon: "⚖️", label: "Governance" },
  data: { icon: "🔮", label: "Data Oracles" },
  identity: { icon: "🆔", label: "Identity" },
  insurance: { icon: "🛡️", label: "Insurance" },
  carbon: { icon: "🌱", label: "Carbon/ESG" },
  loyalty: { icon: "⭐", label: "Loyalty" },
  impact: { icon: "🌍", label: "Impact" },
  rails: { icon: "🛤️", label: "Rails" },
  gaps: { icon: "🎯", label: "Gaps" },
};

const buildTabs = (recommendedSectors = [], mode = "web2") => {
  if (mode === "onchain") {
    return [
      { id: "overview", ...SECTOR_META.overview, lazy: false },
      { id: "gaps", ...SECTOR_META.gaps, lazy: false },
      { id: "financial", ...SECTOR_META.financial, lazy: false },
      { id: "payments", ...SECTOR_META.payments, lazy: false },
      { id: "collaborations", ...SECTOR_META.collaborations, lazy: false },
      { id: "policy", ...SECTOR_META.policy, lazy: false },
      { id: "openclaw", ...SECTOR_META.openclaw, lazy: false },
      { id: "rails", ...SECTOR_META.rails, lazy: false },
    ];
  }
  const core = ["overview", "financial", "payments", ...recommendedSectors, "collaborations", "openclaw", "policy"];
  const lazy = SELECTABLE_SECTORS.filter(s => !recommendedSectors.includes(s));
  return [
    ...core.map(id => ({ id, ...SECTOR_META[id], lazy: false })),
    ...lazy.map(id => ({ id, ...SECTOR_META[id], lazy: true })),
    { id: "rails", ...SECTOR_META.rails, lazy: false },
  ];
};

const BRIDGE_STEPS = [
  { label: "Deploy Bridge Contract", icon: "⚡", detail: "Initializing Solana program" },
  { label: "Lock Liquidity Pool", icon: "🔒", detail: "Securing escrow vault" },
  { label: "Activate Bridge", icon: "🌉", detail: "Cross-protocol bridge live" },
  { label: "Commission Captured", icon: "💎", detail: "2.5% fee onchain" },
];

const EXAMPLES_WEB2 = ["Shopify", "Nike", "HSBC", "Uber", "Maersk", "Starbucks", "DHL", "Spotify", "BP Energy", "Vodafone"];
const EXAMPLES_ONCHAIN = ["Uniswap", "Aave", "Jupiter", "Marinade", "Helium", "Tensor", "Orca", "Drift Protocol"];

// ─── JSON Repair ──────────────────────────────────────────────────────
const repairJSON = (str) => {
  let s = str.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  const start = s.indexOf("{");
  if (start < 0) throw new Error("No JSON found");
  s = s.substring(start);
  try { return JSON.parse(s); } catch (_) {}
  s = s.replace(/,\s*$/, "");
  let braces = 0, brackets = 0, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") braces++; else if (c === "}") braces--;
    if (c === "[") brackets++; else if (c === "]") brackets--;
  }
  if (inStr) s += '"';
  s = s.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/, "");
  for (let i = 0; i < brackets; i++) s += "]";
  for (let i = 0; i < braces; i++) s += "}";
  try { return JSON.parse(s); } catch (_) {
    s = s.replace(/,[^}\]]*$/, "");
    let b2 = 0, k2 = 0, iS = false, es = false;
    for (let i = 0; i < s.length; i++) { const c = s[i]; if(es){es=false;continue}if(c==="\\"){es=true;continue}if(c==='"'){iS=!iS;continue}if(iS)continue;if(c==="{")b2++;else if(c==="}")b2--;if(c==="[")k2++;else if(c==="]")k2--; }
    if (iS) s += '"';
    for (let i = 0; i < k2; i++) s += "]";
    for (let i = 0; i < b2; i++) s += "}";
    return JSON.parse(s);
  }
};

const apiCall = async (prompt, tokens = 4000) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: tokens, messages: [{ role: "user", content: prompt }] }),
  });
  const result = await res.json();
  return result.content?.map(b => b.text || "").join("") || "";
};

const apiCallWithSearch = async (prompt, tokens = 1000) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: tokens,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const result = await res.json();
  return result.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
};

// ─── Prompts ──────────────────────────────────────────────────────────

const corePrompt = (company, address) => `Analyze "${company}" (${address}) for Web2→Onchain migration.

STEP 1: Pick 3 MOST RELEVANT sectors from: yield, depin, rwa, employee, treasury, supplychain, governance, data, identity, insurance, carbon, loyalty, impact. Put in "recommendedSectors".

STEP 2: Generate data for financial, payments, collaborations, openclaw, policy + your 3 picks.

IMPORTANT: For loyalty, always include full data. For impact, analyse how onchain migration benefits the company's wider stakeholder ecosystem — artists, creators, gig workers, communities, suppliers — with specific redistribution mechanisms and estimated beneficiary value.

Return ONLY valid JSON. No markdown. Descriptions max 20 words.

{
  "company":"${company}","sector":"str","description":"1 line","location":"str","employees":number,"revenue":"str","website":"str",
  "ticker":{"marketCap":"str","currentEfficiency":0-100,"onchainPotential":0-100},
  "recommendedSectors":["pick1","pick2","pick3"],
  "financial":{
    "web2":{"settlementCost":number,"transactionFees":number,"complianceCost":"str","auditCost":"str","revenueLeak":"str"},
    "onchain":{"settlementCost":number,"transactionFees":number,"complianceSaving":"str","auditSaving":"str","newRevenueStreams":"str"},
    "projectedSavings":"str","revenueGrowth":"str","sparkData":[8 numbers]
  },
  "payments":{
    "crossBorderVolume":"str","currentFees":"str","onchainFees":"str",
    "savingAnnual":"str","settlementTime":{"current":"str","onchain":"str"},
    "protocols":[max 2:{"name":"str","description":"str"}]
  },
  "collaborations":{
    "active":[max 3:{"name":"str","type":"str","value":"str","commission":"str","status":"live","description":"str"}],
    "possible":[max 3:{"name":"str","type":"str","value":"str","commission":"str","fit":0-100,"description":"str"}]
  },
  "openclaw":{
    "totalAgentSaving":"str","securityIntegration":"str",
    "agents":[max 5:{"name":"str","role":"str","skills":["max 3 str"],"monthlyCost":"str","monthlySaving":"str","description":"str"}]
  },
  "policy":{
    "jurisdiction":"str",
    "overallReadiness":"Low/Med/High",
    "summary":"1-2 sentences on regulatory landscape for this company going onchain",
    "permitted":[max 3:{"activity":"str","notes":"str"}],
    "restricted":[max 3:{"activity":"str","barrier":"str","timeline":"6-12 months/12-24 months/2+ years/unclear"}],
    "recommended":[max 3:{"action":"str","priority":"High/Med/Low","description":"str"}],
    "complianceProtocols":[max 2:{"name":"str","description":"str"}]
  }
}

THEN for each of your 3 recommended sectors add its schema:
- yield: "yield":[max 4:{"name":"str","type":"DeFi/LP/Staking/Bridge","apy":number,"risk":"Low/Med/High","protocol":"str","description":"str"}]
- depin: "depin":{"summary":"str","totalMonthlyRevenue":"str","physicalAssets":"str","opportunities":[max 3:{"network":"str","type":"str","locations":number,"revenueMonthly":"str","setupCost":"str","description":"str","railPartner":"str"}]}
- rwa: "rwa":{"totalTokenisable":"str","primaryProtocol":"str","tokenisableAssets":[max 3:{"asset":"str","estimatedValue":"str","protocol":"str","liquidityUnlock":"str","description":"str"}]}
- employee: "employee":{"benefits":[max 4:{"name":"str","impact":"High/Med","yieldTag":true/false,"description":"str"}],"reputationWeb2":0-100,"reputationOnchain":0-100,"sustainableGrowth":"str","reputationYield":[max 3:{"stream":"str","value":"str"}]}
- treasury: "treasury":{"idleCapital":"str","currentYield":"str","onchainYield":"str","annualGain":"str","protocols":[max 3:{"name":"str","apy":"str","risk":"str","description":"str"}]}
- supplychain: "supplychain":{"complexity":"Low/Med/High","nodes":number,"fraudReduction":"str","benefits":[max 3:{"area":"str","saving":"str","protocol":"str","description":"str"}]}
- governance: "governance":{"currentCost":"str","onchainSaving":"str","transparencyGain":"str","tools":[max 3:{"name":"str","function":"str","description":"str"}]}
- data: "dataOracles":{"totalAnnualValue":"str","monetisableData":[max 3:{"dataType":"str","value":"str","oracleNetwork":"str","description":"str"}]}
- identity: "identity":{"currentKycCost":"str","onchainSaving":"str","protocols":[max 2:{"name":"str","type":"str","description":"str"}],"credentialTypes":["max 3 str"]}
- insurance: "insurance":{"currentPremiums":"str","onchainSaving":"str","parametricOptions":[max 2:{"type":"str","protocol":"str","saving":"str","description":"str"}]}
- carbon: "carbon":{"estimatedFootprint":"str","offsetCostTraditional":"str","offsetCostOnchain":"str","saving":"str","esgScoreImpact":"str","protocols":[max 2:{"name":"str","description":"str"}]}
- loyalty: "loyalty":{"programSize":"str","currentRedemption":"str","onchainRedemption":"str","interoperability":"str","engagementLift":"str","protocols":[max 2:{"name":"str","description":"str"}]}
- impact: "impact":{"headline":"str — one powerful sentence on societal benefit","totalBeneficiaryValue":"str","stakeholderGroup":"str e.g. artists/drivers/farmers","currentProblem":"str","onchainSolution":"str","redistributionMechanism":"str","beneficiaries":[max 4:{"group":"str","currentShare":"str","onchainShare":"str","annualGain":"str","description":"str"}],"protocols":[max 2:{"name":"str","role":"str","description":"str"}],"sdgAlignment":["max 3 UN SDG goals relevant"]}

SOLANA PRIORITY: Prefer Solana-native protocols (Jupiter, Marinade, Jito, Kamino, marginfi, Tensor, Helio, Sphere, Squads, Realms, Ondo on Solana, Helium, Hivemapper, Render, Solana Pay). Only suggest other chains when genuinely stronger.

X MONEY INTEGRATION: Include X Money as active or possible collaboration for consumer-facing companies.

OpenClaw agents MUST include Treasury, DePIN Ops, Bridge Execution, Compliance.`;

const onchainCorePrompt = (company, address) => `Analyze "${company}" (${address}) as an EXISTING onchain protocol/company. Find what they are already doing onchain and identify gaps.

CRITICAL: First identify which blockchain this protocol operates on using real data. Tensor.trade is Solana. Jupiter is Solana. Uniswap is Ethereum. Use accurate chain data — do NOT default to Ethereum unless the protocol genuinely runs on Ethereum. Set "primaryChain" correctly.

Use web search to find their actual onchain activity, TVL, protocols used, wallet addresses if public.

Return ONLY valid JSON. No markdown. Descriptions under 12 words.

{
  "company":"${company}","sector":"str","description":"1 line","location":"str","website":"str","revenue":"str",
  "onchainProfile":{
    "coverageScore":0-100,
    "activeSectors":["list of sectors they actively use"],
    "totalTVL":"str or null",
    "primaryChain":"str",
    "walletsKnown":["up to 2 public wallet addresses if known, else empty array"],
    "summary":"2 sentences describing their current onchain presence"
  },
  "existingActivity":[max 6:{
    "protocol":"str","sector":"str","role":"str",
    "estimatedValue":"str","status":"Active/Partial/Inactive","description":"str"
  }],
  "gaps":[max 6:{
    "sector":"str","protocol":"str","opportunity":"str",
    "estimatedAnnualValue":"str","activationCost":"str",
    "difficulty":"Easy/Medium/Hard","description":"str",
    "bridgeFee":"str"
  }],
  "financial":{
    "web2":{"settlementCost":number,"transactionFees":number,"complianceCost":"str","auditCost":"str","revenueLeak":"str"},
    "onchain":{"settlementCost":number,"transactionFees":number,"complianceSaving":"str","auditSaving":"str","newRevenueStreams":"str"},
    "projectedSavings":"str","revenueGrowth":"str","sparkData":[8 numbers]
  },
  "payments":{
    "crossBorderVolume":"str","currentFees":"str","onchainFees":"str",
    "savingAnnual":"str","settlementTime":{"current":"str","onchain":"str"},
    "protocols":[max 2:{"name":"str","description":"str"}]
  },
  "collaborations":{
    "active":[max 3:{"name":"str","type":"str","value":"str","commission":"str","status":"live","description":"str"}],
    "possible":[max 3:{"name":"str","type":"str","value":"str","commission":"str","fit":0-100,"description":"str"}]
  },
  "openclaw":{
    "totalAgentSaving":"str","securityIntegration":"str",
    "agents":[max 4:{"name":"str","role":"str","skills":["max 3 str"],"monthlyCost":"str","monthlySaving":"str","description":"str"}]
  },
  "policy":{
    "jurisdiction":"str","overallReadiness":"Low/Med/High",
    "summary":"regulatory context for this onchain company",
    "permitted":[max 3:{"activity":"str","notes":"str"}],
    "restricted":[max 2:{"activity":"str","barrier":"str","timeline":"str"}],
    "recommended":[max 2:{"action":"str","priority":"High/Med/Low","description":"str"}],
    "complianceProtocols":[max 2:{"name":"str","description":"str"}]
  }
}`;

const lazyPrompt = (company, sector) => {
  const schemas = {
    treasury: `"treasury":{"idleCapital":"str","currentYield":"str","onchainYield":"str","annualGain":"str","protocols":[max 3:{"name":"str","apy":"str","risk":"str","description":"str"}]}`,
    supplychain: `"supplychain":{"complexity":"Low/Med/High","nodes":number,"fraudReduction":"str","benefits":[max 3:{"area":"str","saving":"str","protocol":"str","description":"str"}]}`,
    governance: `"governance":{"currentCost":"str","onchainSaving":"str","transparencyGain":"str","tools":[max 3:{"name":"str","function":"str","description":"str"}]}`,
    payments: `"payments":{"crossBorderVolume":"str","currentFees":"str","onchainFees":"str","savingAnnual":"str","settlementTime":{"current":"str","onchain":"str"},"protocols":[max 2:{"name":"str","description":"str"}]}`,
    data: `"dataOracles":{"totalAnnualValue":"str","monetisableData":[max 3:{"dataType":"str","value":"str","oracleNetwork":"str","description":"str"}]}`,
    identity: `"identity":{"currentKycCost":"str","onchainSaving":"str","protocols":[max 2:{"name":"str","type":"str","description":"str"}],"credentialTypes":["max 3 str"]}`,
    insurance: `"insurance":{"currentPremiums":"str","onchainSaving":"str","parametricOptions":[max 2:{"type":"str","protocol":"str","saving":"str","description":"str"}]}`,
    carbon: `"carbon":{"estimatedFootprint":"str","offsetCostTraditional":"str","offsetCostOnchain":"str","saving":"str","esgScoreImpact":"str","protocols":[max 2:{"name":"str","description":"str"}]}`,
    loyalty: `"loyalty":{"programSize":"str","currentRedemption":"str","onchainRedemption":"str","interoperability":"str","engagementLift":"str","protocols":[max 2:{"name":"str","description":"str"}]}`,
    impact: `"impact":{"headline":"str","totalBeneficiaryValue":"str","stakeholderGroup":"str","currentProblem":"str","onchainSolution":"str","redistributionMechanism":"str","beneficiaries":[max 4:{"group":"str","currentShare":"str","onchainShare":"str","annualGain":"str","description":"str"}],"protocols":[max 2:{"name":"str","role":"str","description":"str"}],"sdgAlignment":["max 3 str"]}`,
  };
  return `Analyze "${company}" for the ${sector} sector only. Return ONLY valid JSON: {${schemas[sector] || `"${sector}":{}`}}. Descriptions max 20 words. Specific to ${company}. PREFER Solana-native protocols.`;
};

// ─── UI Primitives ────────────────────────────────────────────────────
const Pulse = ({ color = C.green }) => <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, display: "inline-block", animation: "pulse 2s infinite" }} />;
const Badge = ({ children, color = C.green, s = {} }) => <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 14, background: `${color}12`, border: `1px solid ${color}25`, color, fontSize: 10, fontWeight: 600, letterSpacing: 0.3, fontFamily: "var(--mono)", ...s }}>{children}</span>;
const Spark = ({ data = [], color = C.green, w = 80, h = 24 }) => {
  if (!data.length) return null;
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / r) * (h - 4) - 2}`).join(" ");
  return <svg width={w} height={h} style={{ overflow: "visible" }}><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" /></svg>;
};
const PBar = ({ v = 0, color = C.green, h = 4 }) => <div style={{ width: "100%", height: h, borderRadius: h, background: `${color}10`, overflow: "hidden" }}><div style={{ width: `${Math.min(100, v)}%`, height: "100%", borderRadius: h, background: color, transition: "width 1s ease" }} /></div>;
const Metric = ({ label, value, sub, color = C.green, spark = [] }) => (
  <div style={{ padding: "10px 12px", background: `${color}06`, borderRadius: 9, border: `1px solid ${color}10`, flex: 1, minWidth: 130 }}>
    <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontFamily: "var(--mono)" }}>{label}</div>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
      <div><div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "var(--mono)" }}>{value || "—"}</div>
        {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>{sub}</div>}</div>
      {spark.length > 0 && <Spark data={spark} color={color} />}
    </div>
  </div>
);
const Card = ({ children, glow, style = {} }) => (
  <div style={{ borderRadius: 12, padding: 1, background: glow ? `linear-gradient(135deg,${C.green}35,${C.purple}25,${C.cyan}25)` : C.border, ...style }}>
    <div style={{ background: C.card, borderRadius: 11, height: "100%" }}>{children}</div>
  </div>
);
const STitle = ({ icon, title, badge, bc }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
    <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}><span>{icon}</span>{title}</div>
    {badge && <Badge color={bc}>{badge}</Badge>}
  </div>
);
const MiniLoader = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "50px 0" }}>
    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${C.green}10`, border: `1px solid ${C.green}20`, display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 1.5s infinite", marginBottom: 12 }}>◆</div>
    <div style={{ fontSize: 11, color: C.dim, fontFamily: "var(--mono)" }}>Loading sector data...</div>
  </div>
);

// ─── Share Card Component ─────────────────────────────────────────────
const ShareCard = ({ d, mode, onClose }) => {
  const cardRef = useRef(null);
  const top3 = mode === "onchain"
    ? (d.gaps || []).slice(0, 3).map(g => ({ label: g.sector, value: g.estimatedAnnualValue, color: C.cyan }))
    : [
        { label: "Savings/yr", value: d.financial?.projectedSavings, color: C.green },
        { label: "Payment Save", value: d.payments?.savingAnnual, color: C.cyan },
        { label: "Agent Save", value: d.openclaw?.totalAgentSaving, color: C.pink },
      ];

  const download = async () => {
    const card = cardRef.current;
    if (!card) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(card, { backgroundColor: "#06090F", scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `${d.company}-onchainbridge.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (_) {
      alert("Install html2canvas: npm install html2canvas — then try again");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, flexDirection: "column", gap: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        {/* The actual shareable card */}
        <div ref={cardRef} style={{ width: 540, borderRadius: 20, background: "linear-gradient(135deg,#06090F 0%,#0A0F18 100%)", border: `1px solid ${C.border}`, overflow: "hidden", padding: 28, fontFamily: "'Outfit',sans-serif" }}>
          {/* Top glow */}
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle,${C.purple}15,transparent 70%)`, pointerEvents: "none" }} />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.green},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900 }}>◆</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>OnChainBridge<span style={{ color: C.green }}>.io</span></div>
                <div style={{ fontSize: 11, color: C.dim, letterSpacing: 0.6 }}>WEB2 → ONCHAIN PROTOCOL</div>
              </div>
            </div>
            <Badge color={mode === "onchain" ? C.cyan : C.green}>{mode === "onchain" ? "🔗 ONCHAIN" : "🌉 WEB2"}</Badge>
          </div>

          {/* Company */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>{d.company}</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{d.description}</div>
          </div>

          {/* Score bar */}
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: `${C.green}06`, border: `1px solid ${C.green}12` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: C.dim, fontFamily: "var(--mono)" }}>ONCHAIN {mode === "onchain" ? "COVERAGE" : "POTENTIAL"}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.green, fontFamily: "var(--mono)" }}>
                {mode === "onchain" ? d.onchainProfile?.coverageScore : d.ticker?.onchainPotential}%
              </span>
            </div>
            <PBar v={mode === "onchain" ? d.onchainProfile?.coverageScore : d.ticker?.onchainPotential} color={C.green} h={6} />
          </div>

          {/* Top 3 stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
            {top3.map((item, i) => (
              <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: `${item.color}06`, border: `1px solid ${item.color}15`, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: item.color, fontFamily: "var(--mono)" }}>{item.value || "—"}</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Sector badges */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 20 }}>
            {(mode === "onchain" ? d.onchainProfile?.activeSectors : d.recommendedSectors)?.map((s, i) => (
              <Badge key={i} color={i === 0 ? C.green : i === 1 ? C.cyan : C.purple} s={{ fontSize: 9 }}>
                {SECTOR_META[s]?.icon} {SECTOR_META[s]?.label || s}
              </Badge>
            ))}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.dim }}>onchainbridge.io · Powered by Solana</div>
            <div style={{ display: "flex", gap: 5 }}>
              <Badge color={C.green} s={{ fontSize: 8 }}><Pulse color={C.green} /> SOLANA</Badge>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={download} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.green},${C.cyan})`, color: C.bg, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            ⬇ Download PNG
          </button>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 12, cursor: "pointer" }}>
            Close
          </button>
        </div>
        <div style={{ fontSize: 10, color: C.muted }}>Share on X with #OnChainBridge</div>
      </div>
    </div>
  );
};

/* ═══ MAIN ═══ */
export default function OnChainBridge() {
  const [mode, setMode] = useState("web2"); // "web2" | "onchain"
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("search");
  const [verifyOpts, setVerifyOpts] = useState([]);
  const [verified, setVerified] = useState(null);
  const [d, setD] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [coreSectors, setCoreSectors] = useState([]);
  const [lazyData, setLazyData] = useState({});
  const [lazyLoading, setLazyLoading] = useState({});
  const [error, setError] = useState(null);
  const [loadMsg, setLoadMsg] = useState("");
  const [tab, setTab] = useState("overview");
  const [bridgeModal, setBridgeModal] = useState(null);
  const [bridgeStep, setBridgeStep] = useState(0);
  const [authModal, setAuthModal] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pendingBridge, setPendingBridge] = useState(null);
  const [tick, setTick] = useState(0);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [shareModal, setShareModal] = useState(false);
  const [gapActivating, setGapActivating] = useState({});

  useEffect(() => { const i = setInterval(() => setTick(t => t - 0.4), 30); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (bridgeModal && bridgeStep < BRIDGE_STEPS.length - 1) {
      const t = setTimeout(() => setBridgeStep(s => s + 1), 1600);
      return () => clearTimeout(t);
    }
  }, [bridgeModal, bridgeStep]);

  // ─── Wallet Connect ────────────────────────────────────────────────
  const connectWallet = async () => {
    try {
      if (window.solana?.isPhantom) {
        const resp = await window.solana.connect();
        setWalletAddress(resp.publicKey.toString());
        setWalletConnected(true);
      } else if (window.solflare?.isSolflare) {
        await window.solflare.connect();
        setWalletAddress(window.solflare.publicKey.toString());
        setWalletConnected(true);
      } else if (window.backpack) {
        const resp = await window.backpack.connect();
        setWalletAddress(resp.publicKey.toString());
        setWalletConnected(true);
      } else {
        window.open("https://phantom.app", "_blank");
      }
    } catch (e) { console.error("Wallet connect error:", e); }
  };

  const disconnectWallet = async () => {
    try {
      if (window.solana?.isPhantom) await window.solana.disconnect();
      setWalletConnected(false);
      setWalletAddress(null);
    } catch (e) { console.error(e); }
  };

  // ─── Gap Activation ───────────────────────────────────────────────
  const activateGap = async (gap, idx) => {
    if (!walletConnected) { await connectWallet(); return; }
    setGapActivating(p => ({ ...p, [idx]: true }));
    // Simulate activation — in production this would call a Solana program
    await new Promise(r => setTimeout(r, 800));
    setBridgeModal({ name: gap.protocol, value: gap.estimatedAnnualValue, commission: gap.bridgeFee || "2.5%" });
    setBridgeStep(0);
    setGapActivating(p => ({ ...p, [idx]: false }));
  };

  // ─── Search & Analysis ────────────────────────────────────────────
  const searchCompany = useCallback(async (name) => {
    const target = name || input;
    if (!target.trim()) return;
    setPhase("loading"); setError(null); setLoadMsg("Verifying company...");
    try {
      const text = await apiCallWithSearch(
        `Find "${target}" company. Return ONLY a JSON array (no markdown). Each: {"name":"legal name","address":"HQ address","website":"url","sector":"industry","revenue":"if known"}. Max 3 results.`
      );
      const clean = text.replace(/```json|```/g, "").trim();
      const s = clean.indexOf("["), e = clean.lastIndexOf("]");
      if (s >= 0 && e > s) {
        try {
          const parsed = JSON.parse(clean.substring(s, e + 1));
          if (Array.isArray(parsed) && parsed.length > 0) { setVerifyOpts(parsed); setPhase("verify"); return; }
        } catch (_) {}
      }
      setVerified({ name: target, address: "Unverified" });
      runAnalysis(target, "Unverified");
    } catch (_) {
      setVerified({ name: target, address: "Unverified" });
      runAnalysis(target, "Unverified");
    }
  }, [input]); // eslint-disable-line

  const confirmCompany = (opt) => { setVerified(opt); runAnalysis(opt.name, opt.address); };

  const runAnalysis = useCallback(async (name, address) => {
    setPhase("loading"); setD(null); setLazyData({}); setLazyLoading({}); setTab("overview"); setTabs([]); setCoreSectors([]);
    const steps = mode === "onchain"
      ? ["Scanning onchain activity...", "Mapping protocols...", "Identifying gaps...", "Calculating opportunities...", "Generating report..."]
      : ["Selecting best sectors...", "Scanning public filings...", "Analyzing payment flows...", "Mapping collaborations...", "Generating report..."];
    let si = 0; setLoadMsg(steps[0]);
    const iv = setInterval(() => { si = (si + 1) % steps.length; setLoadMsg(steps[si]); }, 2000);
    try {
      const prompt = mode === "onchain" ? onchainCorePrompt(name, address) : corePrompt(name, address);
      const text = await apiCall(prompt, 8000);
      const parsed = repairJSON(text);
      const recommended = parsed.recommendedSectors || [];
      const validRec = recommended.filter(s => SELECTABLE_SECTORS.includes(s)).slice(0, 3);
      const allCore = mode === "onchain"
        ? ["financial", "payments", "collaborations", "openclaw", "policy", "gaps"]
        : [...FIXED_SECTORS, ...validRec];
      setCoreSectors(allCore);
      setTabs(buildTabs(validRec, mode));
      setD(parsed);
      setPhase("dashboard");
    } catch (e) { console.error(e); setError("Analysis failed: " + e.message); setPhase("search"); }
    finally { clearInterval(iv); }
  }, [mode]);

  // ─── Lazy Load ────────────────────────────────────────────────────
  const loadLazySector = useCallback(async (sector) => {
    if (lazyData[sector] || lazyLoading[sector]) return;
    setLazyLoading(p => ({ ...p, [sector]: true }));
    try {
      const text = await apiCall(lazyPrompt(d?.company || input, sector), 2000);
      const parsed = repairJSON(text);
      const key = sector === "data" ? "dataOracles" : sector;
      setLazyData(p => ({ ...p, [sector]: parsed[key] || parsed[sector] || parsed }));
    } catch (e) { console.error(`Lazy load ${sector}:`, e); }
    finally { setLazyLoading(p => ({ ...p, [sector]: false })); }
  }, [d, lazyData, lazyLoading, input]);

  useEffect(() => {
    const isLazy = !coreSectors.includes(tab) && SELECTABLE_SECTORS.includes(tab);
    if (isLazy && d && !lazyData[tab] && !lazyLoading[tab]) loadLazySector(tab);
  }, [tab, d, coreSectors, lazyData, lazyLoading, loadLazySector]);

  const tryBridge = (c) => { if (authed) { setBridgeModal(c); setBridgeStep(0); } else { setPendingBridge(c); setAuthModal(true); } };
  const completeAuth = () => { setAuthed(true); setAuthModal(false); if (pendingBridge) { setBridgeModal(pendingBridge); setBridgeStep(0); setPendingBridge(null); } };

  // ─── Sector Renderers ─────────────────────────────────────────────
  const renderPayments = (sd) => sd ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Metric label="Volume" value={sd.crossBorderVolume} color={C.cyan} /><Metric label="Current Fees" value={sd.currentFees} color={C.red} /><Metric label="Onchain Fees" value={sd.onchainFees} color={C.green} /><Metric label="Saving/yr" value={sd.savingAnnual} color={C.green} /></div>
    <Card><div style={{ padding: 16, display: "flex", justifyContent: "center", gap: 32 }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: C.red, fontFamily: "var(--mono)" }}>{sd.settlementTime?.current}</div><div style={{ fontSize: 11, color: C.dim }}>Current</div></div>
      <div style={{ fontSize: 20, color: C.green }}>→</div>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: C.green, fontFamily: "var(--mono)" }}>{sd.settlementTime?.onchain}</div><div style={{ fontSize: 11, color: C.dim }}>Onchain</div></div>
    </div></Card>
    {sd.protocols?.map((p, i) => (<Card key={i}><div style={{ padding: 12 }}><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{p.name}</div><div style={{ fontSize: 10, color: C.dim }}>{p.description}</div></div></Card>))}
  </div>) : null;

  const renderPolicy = (pd) => pd ? (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ padding: 18, borderRadius: 12, background: `${C.yellow}06`, border: `1px solid ${C.yellow}15` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>⚖️ Regulatory Landscape</div>
        <div style={{ display: "flex", gap: 6 }}>
          <Badge color={C.dim}>{pd.jurisdiction}</Badge>
          <Badge color={pd.overallReadiness === "High" ? C.green : pd.overallReadiness === "Med" ? C.yellow : C.red}>{pd.overallReadiness} Readiness</Badge>
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>{pd.summary}</div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Card><div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 10 }}>✅ CURRENTLY PERMITTED</div>
        {pd.permitted?.map((p, i) => (<div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{p.activity}</div>
          <div style={{ fontSize: 11, color: C.dim }}>{p.notes}</div>
        </div>))}
      </div></Card>
      <Card><div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 10 }}>🚧 RESTRICTED / BARRIERS</div>
        {pd.restricted?.map((r, i) => (<div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{r.activity}</div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 2 }}>{r.barrier}</div>
          <Badge color={C.orange} s={{ fontSize: 8 }}>{r.timeline}</Badge>
        </div>))}
      </div></Card>
    </div>

    <Card><div style={{ padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.cyan, marginBottom: 10 }}>📋 RECOMMENDED ACTIONS</div>
      {pd.recommended?.map((r, i) => (<div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}`, alignItems: "flex-start" }}>
        <Badge color={r.priority === "High" ? C.red : r.priority === "Med" ? C.yellow : C.dim}>{r.priority}</Badge>
        <div><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{r.action}</div><div style={{ fontSize: 11, color: C.dim }}>{r.description}</div></div>
      </div>))}
    </div></Card>

    {pd.complianceProtocols?.length > 0 && <Card><div style={{ padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, marginBottom: 10 }}>🛡️ COMPLIANCE PROTOCOLS</div>
      {pd.complianceProtocols.map((p, i) => (<div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
        <div style={{ fontSize: 11, color: C.dim }}>{p.description}</div>
      </div>))}
    </div></Card>}
  </div>) : null;

  const renderGaps = () => {
    if (!d?.gaps) return <MiniLoader />;
    return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ padding: 16, borderRadius: 12, background: `${C.cyan}06`, border: `1px solid ${C.cyan}15` }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>🎯 Identified Gaps for <span style={{ color: C.cyan }}>{d.company}</span></div>
        <div style={{ fontSize: 11, color: C.dim }}>Opportunities not currently active — activate instantly via wallet.</div>
        {!walletConnected && <button onClick={connectWallet} style={{ marginTop: 10, padding: "8px 20px", borderRadius: 8, border: "none", background: `linear-gradient(135deg,${C.purple},${C.cyan})`, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          🔗 Connect Wallet to Activate
        </button>}
        {walletConnected && <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}><Pulse color={C.green} /><span style={{ fontSize: 10, color: C.green, fontFamily: "var(--mono)" }}>{walletAddress?.slice(0,8)}...{walletAddress?.slice(-4)}</span></div>}
      </div>
      {d.gaps?.map((gap, i) => (
        <Card key={i} glow={i === 0}><div style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{gap.protocol}</span>
                <Badge color={C.purple}>{gap.sector}</Badge>
                <Badge color={gap.difficulty === "Easy" ? C.green : gap.difficulty === "Medium" ? C.yellow : C.red}>{gap.difficulty}</Badge>
              </div>
              <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.6, maxWidth: 480 }}>{gap.description}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.green, fontFamily: "var(--mono)" }}>{gap.estimatedAnnualValue}</div>
              <div style={{ fontSize: 11, color: C.dim }}>annual value</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div style={{ padding: "8px 10px", borderRadius: 8, background: `${C.yellow}06`, border: `1px solid ${C.yellow}10` }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>SETUP COST</div><div style={{ fontSize: 13, fontWeight: 700, color: C.yellow, fontFamily: "var(--mono)" }}>{gap.activationCost}</div></div>
            <div style={{ padding: "8px 10px", borderRadius: 8, background: `${C.orange}06`, border: `1px solid ${C.orange}10` }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>BRIDGE FEE</div><div style={{ fontSize: 13, fontWeight: 700, color: C.orange, fontFamily: "var(--mono)" }}>{gap.bridgeFee}</div></div>
            <div style={{ padding: "8px 10px", borderRadius: 8, background: `${gap.difficulty === "Easy" ? C.green : gap.difficulty === "Medium" ? C.yellow : C.red}06`, border: `1px solid ${gap.difficulty === "Easy" ? C.green : gap.difficulty === "Medium" ? C.yellow : C.red}10` }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>DIFFICULTY</div><div style={{ fontSize: 13, fontWeight: 700, color: gap.difficulty === "Easy" ? C.green : gap.difficulty === "Medium" ? C.yellow : C.red }}>{gap.difficulty}</div></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: C.dim }}>{gap.opportunity}</div>
            <button onClick={() => activateGap(gap, i)} disabled={gapActivating[i]}
              style={{ padding: "9px 22px", borderRadius: 8, border: "none", cursor: gapActivating[i] ? "wait" : "pointer", background: walletConnected ? `linear-gradient(135deg,${C.green},${C.cyan})` : `linear-gradient(135deg,${C.purple},${C.cyan})`, color: walletConnected ? C.bg : "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {gapActivating[i] ? "..." : walletConnected ? "Activate →" : "Connect & Activate →"}
            </button>
          </div>
        </div></Card>
      ))}
    </div>);
  };

  const renderCoreSector = (id) => {
    if (id === "policy") return renderPolicy(d?.policy);
    if (id === "gaps") return renderGaps();
    switch (id) {
      case "financial": return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: 18, borderRadius: 12, background: `${C.red}06`, border: `1px solid ${C.red}12` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 12, fontFamily: "var(--mono)" }}>WEB2 COSTS</div>
            {[["Settlement", `${d.financial?.web2?.settlementCost}%`], ["Tx Fees", `${d.financial?.web2?.transactionFees}%`], ["Compliance", d.financial?.web2?.complianceCost], ["Audit", d.financial?.web2?.auditCost]].map(([l, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.red}06`, fontSize: 11 }}><span style={{ color: C.dim }}>{l}</span><span style={{ color: C.red, fontFamily: "var(--mono)", fontWeight: 600 }}>{v}</span></div>))}
            <div style={{ marginTop: 8, padding: 8, borderRadius: 7, background: `${C.red}06`, fontSize: 10, color: C.dim }}><span style={{ color: C.red, fontWeight: 700 }}>Leak:</span> {d.financial?.web2?.revenueLeak}</div>
          </div>
          <div style={{ padding: 18, borderRadius: 12, background: `${C.green}06`, border: `1px solid ${C.green}12` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 12, fontFamily: "var(--mono)" }}>ONCHAIN</div>
            {[["Settlement", `${d.financial?.onchain?.settlementCost}%`], ["Tx Fees", `${d.financial?.onchain?.transactionFees}%`], ["Compliance", d.financial?.onchain?.complianceSaving], ["Audit", d.financial?.onchain?.auditSaving]].map(([l, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.green}06`, fontSize: 11 }}><span style={{ color: C.dim }}>{l}</span><span style={{ color: C.green, fontFamily: "var(--mono)", fontWeight: 600 }}>{v}</span></div>))}
            <div style={{ marginTop: 8, padding: 8, borderRadius: 7, background: `${C.green}06`, fontSize: 10, color: C.dim }}><span style={{ color: C.green, fontWeight: 700 }}>New:</span> {d.financial?.onchain?.newRevenueStreams}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}><Metric label="Savings/yr" value={d.financial?.projectedSavings} color={C.green} spark={d.financial?.sparkData} /><Metric label="3yr Growth" value={d.financial?.revenueGrowth} color={C.cyan} spark={[20, 35, 48, 60, 72, 82, 90, 100]} /></div>
      </div>);

      case "yield": return (<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {d.yield?.map((y, i) => (<Card key={i}><div style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${C.green}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: C.green, fontFamily: "var(--mono)" }}>{y.apy}%</div>
          <div style={{ flex: 1 }}><div style={{ display: "flex", gap: 6, marginBottom: 2 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{y.name}</span><Badge color={C.cyan}>{y.type}</Badge><Badge color={y.risk === "Low" ? C.green : y.risk === "Med" ? C.yellow : C.red}>{y.risk}</Badge></div>
            <div style={{ fontSize: 10, color: C.dim }}>{y.description}</div><div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>via {y.protocol}</div></div>
          <Spark data={[y.apy*.6, y.apy*.7, y.apy*.85, y.apy*.8, y.apy*.9, y.apy]} color={C.green} />
        </div></Card>))}
      </div>);

      case "collaborations": return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}><Pulse /> ACTIVE COLLABORATIONS</div>
          {d.collaborations?.active?.map((c, i) => (<Card key={i} glow style={{ marginBottom: 10 }}><div style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</span><div style={{ display: "flex", gap: 6 }}><Badge color={C.cyan}>{c.type}</Badge><Badge color={C.green}>LIVE</Badge></div></div>
            <div style={{ fontSize: 12, color: C.dim, marginBottom: 10, lineHeight: 1.6 }}>{c.description}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={{ padding: "8px 10px", borderRadius: 8, background: `${C.green}06`, border: `1px solid ${C.green}10` }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>ANNUAL VALUE</div><div style={{ fontSize: 13, fontWeight: 700, color: C.green, fontFamily: "var(--mono)" }}>{c.value}</div></div>
              <div style={{ padding: "8px 10px", borderRadius: 8, background: `${C.yellow}06`, border: `1px solid ${C.yellow}10` }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>COMMISSION</div><div style={{ fontSize: 13, fontWeight: 700, color: C.yellow, fontFamily: "var(--mono)" }}>{c.commission}</div></div>
              <div style={{ padding: "8px 10px", borderRadius: 8, background: `${C.cyan}06`, border: `1px solid ${C.cyan}10` }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>STATUS</div><div style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>Active</div></div>
            </div>
          </div></Card>))}</div>
        <div><div style={{ fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 10 }}>⚡ POSSIBLE COLLABORATIONS</div>
          {d.collaborations?.possible?.map((c, i) => (<Card key={i} style={{ marginBottom: 10 }}><div style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}><Badge color={C.purple}>{c.fit}% fit</Badge><Badge color={C.cyan}>{c.type}</Badge></div></div>
            <div style={{ fontSize: 12, color: C.dim, marginBottom: 10, lineHeight: 1.6 }}>{c.description}</div>
            <PBar v={c.fit} color={C.purple} h={4} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              <div style={{ padding: "8px 10px", borderRadius: 8, background: `${C.purple}06`, border: `1px solid ${C.purple}10` }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>POTENTIAL VALUE</div><div style={{ fontSize: 13, fontWeight: 700, color: C.purple, fontFamily: "var(--mono)" }}>{c.value}</div></div>
              <div style={{ padding: "8px 10px", borderRadius: 8, background: `${C.yellow}06`, border: `1px solid ${C.yellow}10` }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>BRIDGE FEE</div><div style={{ fontSize: 13, fontWeight: 700, color: C.yellow, fontFamily: "var(--mono)" }}>{c.commission}</div></div>
            </div>
            <button onClick={() => tryBridge(c)} style={{ marginTop: 12, width: "100%", padding: "10px", borderRadius: 8, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.green},${C.cyan})`, color: C.bg, fontSize: 12, fontWeight: 700 }}>Activate Bridge →</button>
          </div></Card>))}</div>
      </div>);

      case "depin": return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ padding: 18, borderRadius: 12, background: `linear-gradient(135deg,${C.purple}08,${C.cyan}06)`, border: `1px solid ${C.purple}18` }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📡 DePIN for <span style={{ color: C.cyan }}>{d.company}</span></div>
          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>{d.depin?.summary}</div>
        </div>
        {d.depin?.opportunities?.map((o, i) => (<Card key={i} glow={i === 0}><div style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div><div style={{ fontSize: 15, fontWeight: 700, color: C.cyan }}>{o.network}</div><div style={{ display: "flex", gap: 5, marginTop: 3 }}><Badge color={C.purple}>{o.type}</Badge><Badge color={C.dim}>{o.railPartner}</Badge></div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 18, fontWeight: 800, color: C.green, fontFamily: "var(--mono)" }}>{o.revenueMonthly}</div><div style={{ fontSize: 11, color: C.dim }}>per month</div></div>
          </div>
          <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.5, marginBottom: 8 }}>{o.description}</div>
          <button onClick={() => tryBridge({ name: o.network, value: o.revenueMonthly, commission: "10-15%" })} style={{ padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.purple},${C.cyan})`, color: "#fff", fontSize: 10, fontWeight: 700 }}>Deploy Bridge →</button>
        </div></Card>))}
      </div>);

      case "rwa": return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Metric label="Total Tokenisable" value={d.rwa?.totalTokenisable} sub={d.rwa?.primaryProtocol} color={C.orange} />
        {d.rwa?.tokenisableAssets?.map((a, i) => (<Card key={i}><div style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{a.asset}</span><Badge color={C.orange}>{a.estimatedValue}</Badge></div><div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>{a.description}</div><div style={{ fontSize: 11, color: C.cyan }}>Protocol: {a.protocol} · Unlock: {a.liquidityUnlock}</div></div></Card>))}
      </div>);

      case "openclaw": return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ padding: 20, borderRadius: 12, background: `linear-gradient(135deg,${C.pink}08,${C.purple}06)`, border: `1px solid ${C.pink}18` }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 5 }}>🦞 OpenClaw Agents for <span style={{ color: C.pink }}>{d.company}</span></div>
          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>Autonomous agents via WhatsApp/Telegram/Slack. No crypto team needed.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}><Metric label="Total Saving" value={d.openclaw?.totalAgentSaving} color={C.pink} /><Metric label="Agents" value={d.openclaw?.agents?.length || 0} color={C.purple} /></div>
        </div>
        {d.openclaw?.agents?.map((a, i) => (<Card key={i} glow={i === 0}><div style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>🦞 {a.name}</div><div style={{ fontSize: 11, color: C.cyan }}>{a.role}</div></div>
            <div style={{ textAlign: "right" }}><Badge color={C.green}>{a.monthlySaving}/mo</Badge><div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>Cost: {a.monthlyCost}/mo</div></div>
          </div>
          <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.5, marginBottom: 8 }}>{a.description}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{a.skills?.map((sk, j) => <Badge key={j} color={C.purple} s={{ fontSize: 8 }}>{sk}</Badge>)}</div>
        </div></Card>))}
      </div>);

      case "employee": return (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card><div style={{ padding: 16 }}><STitle icon="👥" title="Benefits" />
          {d.employee?.benefits?.map((b, i) => (<div key={i} style={{ padding: 10, borderRadius: 8, background: `${b.impact === "High" ? C.green : C.cyan}05`, border: `1px solid ${b.impact === "High" ? C.green : C.cyan}10`, marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 11, fontWeight: 600 }}>{b.name}</span><div style={{ display: "flex", gap: 3 }}><Badge color={b.impact === "High" ? C.green : C.cyan}>{b.impact}</Badge>{b.yieldTag && <Badge color={C.yellow}>YIELD</Badge>}</div></div>
            <div style={{ fontSize: 11, color: C.dim }}>{b.description}</div></div>))}</div></Card>
        <Card><div style={{ padding: 16 }}><STitle icon="⭐" title="Reputation" />
          <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
            {[["Web2", d.employee?.reputationWeb2, C.orange], ["Onchain", d.employee?.reputationOnchain, C.green]].map(([l, s, c], i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 800, color: c, fontFamily: "var(--mono)" }}>{s}</div><div style={{ fontSize: 11, color: C.dim, marginBottom: 3 }}>{l}</div><PBar v={s} color={c} /></div>))}
          </div>
          {d.employee?.reputationYield?.map((r, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}`, fontSize: 10 }}><span style={{ color: C.dim }}>{r.stream}</span><span style={{ color: C.green, fontFamily: "var(--mono)", fontWeight: 600 }}>{r.value}</span></div>))}
        </div></Card>
      </div>);

      case "payments": return renderPayments(d.payments);

      default: {
        const sKey = id === "data" ? "dataOracles" : id;
        const sData = d[sKey];
        if (!sData) return null;
        return renderLazySector(id, sData);
      }
    }
  };

  const renderLazySector = (id, sd) => {
    switch (id) {
      case "treasury": return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Metric label="Idle Capital" value={sd.idleCapital} color={C.orange} /><Metric label="Current" value={sd.currentYield} color={C.red} /><Metric label="Onchain" value={sd.onchainYield} color={C.green} /><Metric label="Annual Gain" value={sd.annualGain} color={C.green} /></div>
        {sd.protocols?.map((p, i) => (<Card key={i}><div style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</span><Badge color={C.green}>{p.apy}</Badge></div><div style={{ fontSize: 10, color: C.dim }}>{p.description}</div></div></Card>))}</div>);
      case "supplychain": return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Metric label="Complexity" value={sd.complexity} color={C.orange} /><Metric label="Nodes" value={sd.nodes} color={C.cyan} /><Metric label="Fraud Cut" value={sd.fraudReduction} color={C.green} /></div>
        {sd.benefits?.map((b, i) => (<Card key={i}><div style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{b.area}</span><Badge color={C.green}>{b.saving}</Badge></div><div style={{ fontSize: 10, color: C.dim }}>{b.description}</div><div style={{ fontSize: 11, color: C.cyan, marginTop: 3 }}>{b.protocol}</div></div></Card>))}</div>);
      case "governance": return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Metric label="Current Cost" value={sd.currentCost} color={C.red} /><Metric label="Saving" value={sd.onchainSaving} color={C.green} /><Metric label="Transparency" value={sd.transparencyGain} color={C.cyan} /></div>
        {sd.tools?.map((t, i) => (<Card key={i}><div style={{ padding: 14 }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{t.name}</div><div style={{ fontSize: 10, color: C.cyan, marginBottom: 2 }}>{t.function}</div><div style={{ fontSize: 10, color: C.dim }}>{t.description}</div></div></Card>))}</div>);
      case "payments": return renderPayments(sd);
      case "data": return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Metric label="Total Annual" value={sd.totalAnnualValue} color={C.purple} />
        {sd.monetisableData?.map((dd, i) => (<Card key={i}><div style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{dd.dataType}</span><Badge color={C.purple}>{dd.value}</Badge></div><div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>{dd.description}</div><div style={{ fontSize: 11, color: C.cyan }}>Oracle: {dd.oracleNetwork}</div></div></Card>))}</div>);
      case "identity": return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}><Metric label="KYC Cost" value={sd.currentKycCost} color={C.red} /><Metric label="Saving" value={sd.onchainSaving} color={C.green} /></div>
        {sd.protocols?.map((p, i) => (<Card key={i}><div style={{ padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</span><Badge color={C.cyan}>{p.type}</Badge></div><div style={{ fontSize: 10, color: C.dim }}>{p.description}</div></div></Card>))}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{sd.credentialTypes?.map((c, i) => <Badge key={i} color={C.purple}>{c}</Badge>)}</div></div>);
      case "insurance": return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}><Metric label="Premiums" value={sd.currentPremiums} color={C.red} /><Metric label="Saving" value={sd.onchainSaving} color={C.green} /></div>
        {sd.parametricOptions?.map((p, i) => (<Card key={i}><div style={{ padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{p.type}</span><Badge color={C.green}>{p.saving}</Badge></div><div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>{p.description}</div><div style={{ fontSize: 11, color: C.purple }}>{p.protocol}</div></div></Card>))}</div>);
      case "carbon": return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Metric label="Footprint" value={sd.estimatedFootprint} color={C.orange} /><Metric label="Trad." value={sd.offsetCostTraditional} color={C.red} /><Metric label="Onchain" value={sd.offsetCostOnchain} color={C.green} /><Metric label="Saving" value={sd.saving} color={C.green} /></div>
        <div style={{ padding: 12, borderRadius: 10, background: `${C.green}06`, border: `1px solid ${C.green}12`, fontSize: 11, color: C.dim }}>ESG: <span style={{ color: C.green, fontWeight: 700 }}>{sd.esgScoreImpact}</span></div>
        {sd.protocols?.map((p, i) => (<Card key={i}><div style={{ padding: 12 }}><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{p.name}</div><div style={{ fontSize: 10, color: C.dim }}>{p.description}</div></div></Card>))}</div>);
      case "loyalty": return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Metric label="Program" value={sd.programSize} color={C.yellow} /><Metric label="Current" value={sd.currentRedemption} color={C.red} /><Metric label="Onchain" value={sd.onchainRedemption} color={C.green} /><Metric label="Lift" value={sd.engagementLift} color={C.green} /></div>
        <div style={{ padding: 12, borderRadius: 10, background: `${C.yellow}06`, border: `1px solid ${C.yellow}12`, fontSize: 11, color: C.dim }}>{sd.interoperability}</div>
        {sd.protocols?.map((p, i) => (<Card key={i}><div style={{ padding: 12 }}><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{p.name}</div><div style={{ fontSize: 11, color: C.dim }}>{p.description}</div></div></Card>))}</div>);
      case "impact": return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ padding: 20, borderRadius: 12, background: `linear-gradient(135deg,${C.green}08,${C.cyan}06)`, border: `1px solid ${C.green}18` }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>🌍 Social Impact — <span style={{ color: C.green }}>{sd.stakeholderGroup}</span></div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, marginBottom: 12, fontStyle: "italic" }}>{sd.headline}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Metric label="Total Beneficiary Value" value={sd.totalBeneficiaryValue} color={C.green} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card><div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 8 }}>⚠️ Current Problem</div>
            <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.6 }}>{sd.currentProblem}</div>
          </div></Card>
          <Card><div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 8 }}>✅ Onchain Solution</div>
            <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.6 }}>{sd.onchainSolution}</div>
          </div></Card>
        </div>
        <Card glow><div style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, marginBottom: 12 }}>💸 Redistribution Mechanism</div>
          <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.6, marginBottom: 14 }}>{sd.redistributionMechanism}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sd.beneficiaries?.map((b, i) => (
              <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: C.bg2, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{b.group}</span>
                  <Badge color={C.green}>{b.annualGain}/yr gain</Badge>
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 6, fontSize: 11, fontFamily: "var(--mono)" }}>
                  <span><span style={{ color: C.muted }}>NOW </span><span style={{ color: C.red }}>{b.currentShare}</span></span>
                  <span>→</span>
                  <span><span style={{ color: C.muted }}>ONCHAIN </span><span style={{ color: C.green }}>{b.onchainShare}</span></span>
                </div>
                <div style={{ fontSize: 11, color: C.dim }}>{b.description}</div>
              </div>
            ))}
          </div>
        </div></Card>
        {sd.protocols?.length > 0 && <Card><div style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 10 }}>🔗 Enabling Protocols</div>
          {sd.protocols.map((p, i) => (<div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</span><Badge color={C.purple}>{p.role}</Badge></div>
            <div style={{ fontSize: 11, color: C.dim }}>{p.description}</div>
          </div>))}
        </div></Card>}
        {sd.sdgAlignment?.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "10px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 11, color: C.dim, alignSelf: "center" }}>UN SDG:</span>
          {sd.sdgAlignment.map((g, i) => <Badge key={i} color={C.green} s={{ fontSize: 10 }}>{g}</Badge>)}
        </div>}
      </div>);
      default: return null;
    }
  };

  const renderSector = (id) => {
    if (coreSectors.includes(id)) return renderCoreSector(id);
    const sd = lazyData[id];
    if (lazyLoading[id] || !sd) return <MiniLoader />;
    return renderLazySector(id, sd);
  };

  const examples = mode === "onchain" ? EXAMPLES_ONCHAIN : EXAMPLES_WEB2;

  // ─── RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--display)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        :root{--display:'Outfit',sans-serif;--mono:'Azeret Mono',monospace}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:${C.border} transparent;font-size:inherit}
        *::-webkit-scrollbar{width:4px}*::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        input::placeholder{color:${C.muted}}button{font-family:var(--display)}
        body{font-size:13px;min-font-size:12px}
        span,div,p,label{min-font-size:11px}
      `}</style>

      <div style={{ position: "fixed", top: -300, right: -200, width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle,${C.purple}06 0%,transparent 70%)`, pointerEvents: "none" }} />

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: `${C.bg}DD`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${C.green},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900 }}>◆</div>
            <div><div style={{ fontSize: 14, fontWeight: 800 }}>OnChainBridge<span style={{ color: C.green }}>.io</span></div><div style={{ fontSize: 10, color: C.dim, fontFamily: "var(--mono)", letterSpacing: 0.6 }}>WEB2 → ONCHAIN · 16 SECTORS · OPENCLAW</div></div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {walletConnected
              ? <button onClick={disconnectWallet} style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${C.green}30`, background: `${C.green}08`, color: C.green, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "var(--mono)" }}>
                  <Pulse /> {walletAddress?.slice(0,4)}...{walletAddress?.slice(-4)}
                </button>
              : <button onClick={connectWallet} style={{ padding: "5px 14px", borderRadius: 8, border: `1px solid ${C.purple}40`, background: `${C.purple}08`, color: C.purple, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                  🔗 Connect Wallet
                </button>
            }
            {d && <button onClick={() => setShareModal(true)} style={{ padding: "5px 14px", borderRadius: 8, border: `1px solid ${C.cyan}30`, background: `${C.cyan}08`, color: C.cyan, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
              𝕏 Share
            </button>}
            <Badge color={C.green}><Pulse /> SOLANA</Badge>
            <Badge color={C.purple}>v4</Badge>
          </div>
        </div>
        {d && <div style={{ borderTop: `1px solid ${C.border}`, padding: "4px 0", overflow: "hidden", background: `${C.surface}50` }}>
          <div style={{ display: "flex", gap: 30, whiteSpace: "nowrap", fontFamily: "var(--mono)", fontSize: 11, transform: `translateX(${tick}px)` }}>
            {[0, 1, 2].map(r => <div key={r} style={{ display: "flex", gap: 30 }}>
              <span><span style={{ color: C.muted }}>CO</span> <span style={{ color: C.green }}>{d.company}</span></span>
              <span><span style={{ color: C.muted }}>REV</span> <span style={{ color: C.yellow }}>{d.revenue}</span></span>
              {mode === "onchain"
                ? <><span><span style={{ color: C.muted }}>COVERAGE</span> <span style={{ color: C.cyan }}>{d.onchainProfile?.coverageScore}%</span></span><span><span style={{ color: C.muted }}>GAPS</span> <span style={{ color: C.red }}>{d.gaps?.length}</span></span></>
                : <><span><span style={{ color: C.muted }}>FIT</span> <span style={{ color: C.green }}>{d.ticker?.onchainPotential}%</span></span><span><span style={{ color: C.muted }}>SAVE</span> <span style={{ color: C.green }}>{d.financial?.projectedSavings}</span></span></>
              }
              <span><span style={{ color: C.muted }}>POLICY</span> <span style={{ color: d.policy?.overallReadiness === "High" ? C.green : d.policy?.overallReadiness === "Med" ? C.yellow : C.red }}>{d.policy?.overallReadiness}</span></span>
              <span><span style={{ color: C.muted }}>AGENTS</span> <span style={{ color: C.pink }}>{d.openclaw?.agents?.length}</span></span>
            </div>)}
          </div>
        </div>}
      </header>

      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "20px 20px 60px", position: "relative", zIndex: 1 }}>

        {/* Mode Toggle */}
        <div style={{ display: "flex", gap: 0, marginBottom: 12, background: C.surface, borderRadius: 10, padding: 3, border: `1px solid ${C.border}`, width: "fit-content" }}>
          {[
            { id: "web2", label: "🌉 Web2 Company", desc: "Migration analysis" },
            { id: "onchain", label: "🔗 Already Onchain", desc: "Gap analysis" },
          ].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setPhase("search"); setD(null); setInput(""); }}
              style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: mode === m.id ? `linear-gradient(135deg,${C.green}15,${C.cyan}10)` : "transparent", color: mode === m.id ? C.text : C.dim, fontWeight: mode === m.id ? 700 : 400, fontSize: 12, transition: "all .2s" }}>
              {m.label} <span style={{ fontSize: 11, color: mode === m.id ? C.dim : C.muted, marginLeft: 4 }}>{m.desc}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 8, background: C.surface, borderRadius: 12, border: `1px solid ${mode === "onchain" ? C.cyan + "40" : C.border}`, padding: "4px 4px 4px 16px", alignItems: "center" }}>
            <span style={{ fontSize: 16, opacity: 0.4 }}>{mode === "onchain" ? "🔗" : "⌘"}</span>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && searchCompany()}
              placeholder={mode === "onchain" ? "Enter protocol or onchain company name..." : "Enter any Web2 company — verified before analysis..."}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 14, padding: "9px 0" }} />
            <button onClick={() => searchCompany()} disabled={phase === "loading"}
              style={{ padding: "9px 24px", borderRadius: 9, border: "none", background: phase === "loading" ? C.muted : mode === "onchain" ? `linear-gradient(135deg,${C.purple},${C.cyan})` : `linear-gradient(135deg,${C.green},${C.cyan})`, color: phase === "loading" ? C.bg : mode === "onchain" ? "#fff" : C.bg, fontWeight: 700, fontSize: 12, cursor: phase === "loading" ? "wait" : "pointer" }}>
              {phase === "loading" ? "..." : mode === "onchain" ? "Scan →" : "Verify →"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: C.muted, fontFamily: "var(--mono)", alignSelf: "center" }}>TRY:</span>
            {examples.map(c => <button key={c} onClick={() => { setInput(c); searchCompany(c); }}
              style={{ padding: "3px 10px", borderRadius: 14, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 10, cursor: "pointer", fontFamily: "var(--mono)" }}
              onMouseEnter={e => { e.target.style.borderColor = mode === "onchain" ? C.cyan : C.green; e.target.style.color = mode === "onchain" ? C.cyan : C.green; }}
              onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.dim; }}>{c}</button>)}
          </div>
        </div>

        {/* Verify */}
        {phase === "verify" && <div style={{ animation: "fadeUp .3s ease-out", marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Confirm <span style={{ color: C.green }}>{input}</span>:</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 10 }}>
            {verifyOpts.map((opt, i) => <button key={i} onClick={() => confirmCompany(opt)}
              style={{ padding: 18, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", textAlign: "left", color: C.text, transition: "all .2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.green} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 5 }}>{opt.name}</div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 3 }}>📍 {opt.address}</div>
              {opt.website && <div style={{ fontSize: 10, color: C.cyan, marginBottom: 3 }}>🌐 {opt.website}</div>}
              <div style={{ display: "flex", gap: 5, marginTop: 6 }}>{opt.sector && <Badge color={C.purple}>{opt.sector}</Badge>}{opt.revenue && <Badge color={C.yellow}>{opt.revenue}</Badge>}</div>
              <div style={{ marginTop: 8, fontSize: 10, color: C.green, fontWeight: 600 }}>Confirm & Analyze →</div>
            </button>)}
          </div>
        </div>}

        {/* Loading */}
        {phase === "loading" && <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", animation: "fadeUp .3s" }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, marginBottom: 20, background: `linear-gradient(135deg,${C.green}12,${C.purple}12)`, border: `2px solid ${C.green}20`, display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 1.5s infinite" }}>
            <span style={{ fontSize: 24 }}>◆</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 5 }}>Analyzing <span style={{ color: mode === "onchain" ? C.cyan : C.green }}>{verified?.name || input}</span></div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: "var(--mono)" }}>{loadMsg}</div>
          <div style={{ width: 160, marginTop: 16, height: 2, borderRadius: 2, overflow: "hidden", background: `${C.green}10` }}>
            <div style={{ height: "100%", background: `linear-gradient(90deg,${C.green},${C.purple},${C.green})`, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite linear" }} />
          </div>
        </div>}

        {error && <div style={{ padding: 14, borderRadius: 10, background: `${C.red}08`, border: `1px solid ${C.red}20`, color: C.red, fontSize: 11, fontFamily: "var(--mono)" }}>{error}</div>}

        {/* Empty state */}
        {phase === "search" && !error && <div style={{ textAlign: "center", padding: "50px 20px", animation: "fadeUp .4s" }}>
          <div style={{ fontSize: 44, marginBottom: 16, opacity: 0.7 }}>◆</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
            {mode === "onchain" ? <>Already Onchain? <span style={{ color: C.cyan }}>Find Your Gaps</span></> : <>Web2 → <span style={{ color: C.green }}>Onchain</span> · 16 Sectors</>}
          </div>
          <div style={{ fontSize: 13, color: C.dim, maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
            {mode === "onchain"
              ? "Enter any protocol or onchain company. We'll map your existing activity across all sectors and surface the gaps — with instant wallet-based activation."
              : "Enter any company. 7 core sectors load instantly. 9 more on demand. Policy analysis included. OpenClaw agents automate everything."}
          </div>
        </div>}

        {/* Dashboard */}
        {phase === "dashboard" && d && <div style={{ animation: "fadeUp .3s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>{d.company} <span style={{ color: mode === "onchain" ? C.cyan : C.green }}>→ {mode === "onchain" ? "Gaps Found" : "Onchain"}</span></div>
                {mode === "onchain" && d.onchainProfile?.primaryChain && <Badge color={C.purple}>{d.onchainProfile.primaryChain}</Badge>}
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{d.description} · {verified?.address || d.location}{verified?.website && <> · <span style={{ color: C.cyan }}>{verified.website}</span></>}</div>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <Badge color={C.green}>✓ {mode === "onchain" ? "Scanned" : "Verified"}</Badge>
              {mode === "onchain"
                ? <><Badge color={C.cyan}>{d.onchainProfile?.coverageScore}% Coverage</Badge><Badge color={C.red}>{d.gaps?.length} Gaps</Badge></>
                : <><Badge color={C.cyan}>{d.revenue}</Badge><Badge color={C.purple}>{d.ticker?.onchainPotential}% Fit</Badge></>
              }
              <Badge color={d.policy?.overallReadiness === "High" ? C.green : d.policy?.overallReadiness === "Med" ? C.yellow : C.red}>
                ⚖️ {d.policy?.overallReadiness} Policy
              </Badge>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, marginBottom: 18, overflowX: "auto", background: C.surface, borderRadius: 9, padding: 3, border: `1px solid ${C.border}` }}>
            {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "7px 12px", borderRadius: 7, border: "none", fontSize: 10, cursor: "pointer", fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? (mode === "onchain" ? C.cyan : C.green) : C.dim, background: tab === t.id ? `${mode === "onchain" ? C.cyan : C.green}10` : "transparent", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 3 }}>
              {t.icon} {t.label}
              {t.lazy && !lazyData[t.id] && <span style={{ fontSize: 7, color: C.muted }}>⬇</span>}
              {t.id === "gaps" && d.gaps?.length > 0 && <span style={{ background: C.red, color: "#fff", borderRadius: 8, padding: "0 5px", fontSize: 10, fontWeight: 700 }}>{d.gaps.length}</span>}
            </button>)}
          </div>

          {/* Overview */}
          {tab === "overview" && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Onchain mode — profile summary */}
            {mode === "onchain" && d.onchainProfile && <div style={{ padding: 18, borderRadius: 12, background: `linear-gradient(135deg,${C.cyan}08,${C.purple}06)`, border: `1px solid ${C.cyan}18` }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>🔗 Onchain Profile — <span style={{ color: C.cyan }}>{d.company}</span></div>
              <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6, marginBottom: 12 }}>{d.onchainProfile.summary}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <Metric label="Coverage Score" value={`${d.onchainProfile.coverageScore}%`} color={C.cyan} />
                <Metric label="Active Sectors" value={d.onchainProfile.activeSectors?.length} color={C.green} />
                {d.onchainProfile.totalTVL && <Metric label="Total TVL" value={d.onchainProfile.totalTVL} color={C.purple} />}
                <Metric label="Gaps Found" value={d.gaps?.length} color={C.red} />
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {d.onchainProfile.activeSectors?.map((s, i) => <Badge key={i} color={C.green} s={{ fontSize: 9 }}>✓ {SECTOR_META[s]?.label || s}</Badge>)}
              </div>
            </div>}

            {/* Web2 mode — recommendation banner */}
            {mode === "web2" && d.recommendedSectors && <div style={{ padding: "10px 16px", borderRadius: 10, background: `linear-gradient(135deg,${C.green}08,${C.purple}06)`, border: `1px solid ${C.green}18`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>Recommended for {d.company}:</span>
              {d.recommendedSectors.map((s, i) => <Badge key={i} color={i === 0 ? C.green : i === 1 ? C.cyan : C.purple}>{SECTOR_META[s]?.icon} {SECTOR_META[s]?.label}</Badge>)}
            </div>}

            {/* Policy alert */}
            {d.policy && <div style={{ padding: "10px 16px", borderRadius: 10, background: `${d.policy.overallReadiness === "High" ? C.green : d.policy.overallReadiness === "Med" ? C.yellow : C.red}06`, border: `1px solid ${d.policy.overallReadiness === "High" ? C.green : d.policy.overallReadiness === "Med" ? C.yellow : C.red}20`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>⚖️</span>
                <div><span style={{ fontSize: 11, fontWeight: 700 }}>{d.policy.jurisdiction} — {d.policy.overallReadiness} Readiness</span>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 1 }}>{d.policy.summary?.slice(0, 100)}...</div>
                </div>
              </div>
              <button onClick={() => setTab("policy")} style={{ padding: "4px 12px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 10, cursor: "pointer" }}>View Policy →</button>
            </div>}

            {/* Top metrics */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Metric label="Savings/yr" value={d.financial?.projectedSavings} color={C.green} spark={d.financial?.sparkData} />
              <Metric label="Payment Save" value={d.payments?.savingAnnual} sub={`${d.payments?.settlementTime?.current} → ${d.payments?.settlementTime?.onchain}`} color={C.cyan} />
              <Metric label="Growth 3yr" value={d.financial?.revenueGrowth} color={C.cyan} spark={[30,42,55,65,75,85,92,100]} />
              <Metric label="Agent Save" value={d.openclaw?.totalAgentSaving} color={C.pink} />
              {mode === "onchain" && d.gaps?.length > 0 && <Metric label="Gap Value" value={d.gaps[0]?.estimatedAnnualValue} sub="top gap" color={C.red} />}
              {mode === "web2" && d.depin && <Metric label="DePIN/mo" value={d.depin.totalMonthlyRevenue} color={C.purple} />}
              {mode === "web2" && d.rwa && <Metric label="RWA" value={d.rwa.totalTokenisable} color={C.orange} />}
            </div>

            {/* Onchain mode — top gaps preview */}
            {mode === "onchain" && d.gaps && <Card glow><div style={{ padding: 16 }}>
              <STitle icon="🎯" title="Top Gaps" badge={`${d.gaps.length} found`} bc={C.red} />
              {d.gaps.slice(0, 3).map((gap, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div><div style={{ fontSize: 12, fontWeight: 700 }}>{gap.protocol}</div><div style={{ fontSize: 11, color: C.dim }}>{gap.sector} · {gap.difficulty}</div></div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.green, fontFamily: "var(--mono)" }}>{gap.estimatedAnnualValue}</span>
                    <button onClick={() => setTab("gaps")} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: `linear-gradient(135deg,${C.purple},${C.cyan})`, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Activate</button>
                  </div>
                </div>
              ))}
              <button onClick={() => setTab("gaps")} style={{ marginTop: 10, width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 11, cursor: "pointer" }}>View All Gaps →</button>
            </div></Card>}

            {/* Web2 mode — financial + payments */}
            {mode === "web2" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Card><div style={{ padding: 16 }}><STitle icon="📊" title="Financial" />
                {[["Settlement", `${d.financial?.web2?.settlementCost}%`, `${d.financial?.onchain?.settlementCost}%`], ["Tx Fees", `${d.financial?.web2?.transactionFees}%`, `${d.financial?.onchain?.transactionFees}%`]].map(([l, w, o], i) => (
                  <div key={i} style={{ marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.dim, marginBottom: 3, fontFamily: "var(--mono)" }}><span>{l}</span><span><span style={{ color: C.red }}>{w}</span> → <span style={{ color: C.green }}>{o}</span></span></div><PBar v={80} color={C.green} /></div>))}
              </div></Card>
              <Card><div style={{ padding: 16 }}><STitle icon="💸" title="Payments" />
                <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 10 }}>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800, color: C.red, fontFamily: "var(--mono)" }}>{d.payments?.currentFees}</div><div style={{ fontSize: 10, color: C.dim }}>Current</div></div>
                  <div style={{ fontSize: 16, color: C.green }}>→</div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800, color: C.green, fontFamily: "var(--mono)" }}>{d.payments?.onchainFees}</div><div style={{ fontSize: 10, color: C.dim }}>Onchain</div></div>
                </div>
                <div style={{ padding: 8, borderRadius: 7, background: `${C.green}05`, fontSize: 10, textAlign: "center" }}><span style={{ color: C.green, fontWeight: 700 }}>{d.payments?.savingAnnual}</span> <span style={{ color: C.dim }}>saved annually</span></div>
              </div></Card>
            </div>}

            {/* Collaborations + OpenClaw */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Card><div style={{ padding: 16 }}><STitle icon="🤝" title="Collaborations" />
                {d.collaborations?.active?.slice(0, 2).map((c, i) => <div key={i} style={{ padding: 8, borderRadius: 7, background: `${C.green}05`, marginBottom: 5, display: "flex", justifyContent: "space-between" }}><div><div style={{ fontSize: 11, fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 10, color: C.dim }}>{c.value}</div></div><Badge color={C.green}>LIVE</Badge></div>)}
                {d.collaborations?.possible?.slice(0, 2).map((c, i) => <div key={i} style={{ padding: 8, borderRadius: 7, background: `${C.purple}05`, marginBottom: 5, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: 11, fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 10, color: C.dim }}>{c.fit}% fit</div></div><button onClick={() => tryBridge(c)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.purple},${C.cyan})`, color: "#fff", fontSize: 11, fontWeight: 700 }}>Bridge</button></div>)}
              </div></Card>
              <Card glow><div style={{ padding: 16 }}><STitle icon="🦞" title="OpenClaw" badge={d.openclaw?.totalAgentSaving} bc={C.pink} />
                {d.openclaw?.agents?.slice(0, 4).map((a, i) => <div key={i} style={{ padding: 8, background: C.bg2, borderRadius: 7, marginBottom: 5 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, fontWeight: 700 }}>{a.name}</span><Badge color={C.pink} s={{ fontSize: 8 }}>{a.monthlySaving}/mo</Badge></div><div style={{ fontSize: 11, color: C.dim }}>{a.role}</div></div>)}
              </div></Card>
            </div>

            {/* Existing activity (onchain mode) */}
            {mode === "onchain" && d.existingActivity && <Card><div style={{ padding: 16 }}>
              <STitle icon="✅" title="Existing Onchain Activity" badge={`${d.existingActivity.length} protocols`} bc={C.green} />
              {d.existingActivity.map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div><div style={{ fontSize: 12, fontWeight: 700 }}>{a.protocol}</div><div style={{ fontSize: 11, color: C.dim }}>{a.role} · {a.sector}</div></div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: C.green, fontFamily: "var(--mono)" }}>{a.estimatedValue}</span>
                    <Badge color={a.status === "Active" ? C.green : a.status === "Partial" ? C.yellow : C.muted}>{a.status}</Badge>
                  </div>
                </div>
              ))}
            </div></Card>}

            {/* Web2 — AI-recommended sectors */}
            {mode === "web2" && d.recommendedSectors?.map((secId, idx) => {
              const meta = SECTOR_META[secId];
              const sKey = secId === "data" ? "dataOracles" : secId;
              const sData = d[sKey];
              if (!meta || !sData) return null;
              return <Card key={secId} glow={idx === 0}><div style={{ padding: 16 }}>
                <STitle icon={meta.icon} title={meta.label} badge={
                  secId === "depin" ? sData.totalMonthlyRevenue + "/mo" :
                  secId === "rwa" ? sData.totalTokenisable :
                  secId === "yield" ? `${Math.max(...(sData.map?.(y => y.apy) || [0]))}% peak` :
                  secId === "treasury" ? sData.annualGain :
                  secId === "carbon" ? sData.saving :
                  secId === "loyalty" ? sData.engagementLift :
                  secId === "employee" ? `${sData.reputationOnchain} trust` :
                  secId === "supplychain" ? sData.fraudReduction :
                  secId === "insurance" ? sData.onchainSaving :
                  secId === "identity" ? sData.onchainSaving :
                  secId === "governance" ? sData.onchainSaving : null
                } bc={idx === 0 ? C.green : idx === 1 ? C.cyan : C.purple} />
                {secId === "depin" && sData.opportunities?.slice(0,3).map((o, i) => <div key={i} style={{ padding: 8, background: C.bg2, borderRadius: 7, marginBottom: 5 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, fontWeight: 700, color: C.cyan }}>{o.network}</span><span style={{ fontSize: 10, color: C.green, fontFamily: "var(--mono)" }}>{o.revenueMonthly}/mo</span></div></div>)}
                {secId === "rwa" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>{sData.tokenisableAssets?.map((a, i) => <div key={i} style={{ padding: 10, background: C.bg2, borderRadius: 8 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 11, fontWeight: 700 }}>{a.asset}</span><Badge color={C.orange} s={{ fontSize: 8 }}>{a.estimatedValue}</Badge></div><div style={{ fontSize: 11, color: C.dim }}>{a.protocol}</div></div>)}</div>}
                {secId === "yield" && sData.slice?.(0,3).map?.((y, i) => <div key={i} style={{ padding: 8, background: C.bg2, borderRadius: 7, marginBottom: 5, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><span style={{ fontSize: 11, fontWeight: 700 }}>{y.name}</span><span style={{ fontSize: 11, color: C.dim, marginLeft: 6 }}>{y.protocol}</span></div><Badge color={C.green}>{y.apy}%</Badge></div>)}
                {secId === "treasury" && <div style={{ display: "flex", gap: 8 }}><Metric label="Idle" value={sData.idleCapital} color={C.orange} /><Metric label="Current" value={sData.currentYield} color={C.red} /><Metric label="Onchain" value={sData.onchainYield} color={C.green} /></div>}
                {["supplychain","governance","identity","insurance","carbon","loyalty"].includes(secId) && <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
                  {secId === "supplychain" && `${sData.complexity} complexity · ${sData.nodes} nodes · ${sData.fraudReduction} fraud reduction`}
                  {secId === "governance" && `${sData.currentCost} current → ${sData.onchainSaving} saving`}
                  {secId === "identity" && `${sData.currentKycCost} KYC cost → ${sData.onchainSaving} saved`}
                  {secId === "insurance" && `${sData.currentPremiums} premiums → ${sData.onchainSaving} saved`}
                  {secId === "carbon" && `${sData.estimatedFootprint} footprint · ${sData.saving} saved`}
                  {secId === "loyalty" && `${sData.programSize} program · ${sData.engagementLift} engagement lift`}
                </div>}
              </div></Card>;
            })}

            {mode === "web2" && <div style={{ padding: 14, borderRadius: 10, background: C.surface, border: `1px dashed ${C.border}`, textAlign: "center", fontSize: 11, color: C.dim }}>
              {SELECTABLE_SECTORS.filter(s => !d.recommendedSectors?.includes(s)).length} more sectors available — click any ⬇ tab to load on demand
            </div>}
          </div>}

          {/* Individual sector tabs */}
          {tab !== "overview" && tab !== "rails" && renderSector(tab)}

          {/* Rails */}
          {tab === "rails" && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: 18, borderRadius: 12, background: `linear-gradient(135deg,${C.green}06,${C.purple}04)`, border: `1px solid ${C.green}15` }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>🛤️ Web2 → Onchain Onboarding</div>
              <div style={{ fontSize: 11, color: C.dim }}>No keys. No wallets needed on your side. ChainBridge + OpenClaw handles everything.</div>
            </div>
            {[
              { s: 1, t: "Company Verified", dd: "KYB/KYC. Address + website confirmed.", c: C.green },
              { s: 2, t: "Managed Wallet", dd: "Solana via MPC (Fireblocks/Turnkey).", c: C.cyan },
              { s: 3, t: "Fiat Rails", dd: "Helio/Sphere/Stripe. Fiat → USDC/SOL.", c: C.purple },
              { s: 4, t: "OpenClaw Agents", dd: "Treasury, DePIN, Bridge, Compliance deployed.", c: C.pink },
              { s: 5, t: "Operations Live", dd: "Smart contracts. Dashboard view.", c: C.yellow },
              { s: 6, t: "Commission Active", dd: "2.5% bridges + DePIN + rails + SaaS.", c: C.green },
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${step.c}12`, border: `2px solid ${step.c}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: step.c, fontFamily: "var(--mono)", flexShrink: 0 }}>{step.s}</div>
                <div style={{ flex: 1, padding: 14, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{step.t}</div><div style={{ fontSize: 10, color: C.dim }}>{step.dd}</div></div>
              </div>))}
          </div>}
        </div>}
      </main>

      {/* Auth Modal */}
      {authModal && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setAuthModal(false)}>
        <div style={{ width: "90%", maxWidth: 400, borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`, padding: 24 }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 5 }}>🔐 Sign In to Bridge</div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 16, lineHeight: 1.5 }}>Bridge execution requires verification. A specialist completes KYB within 24h.</div>
          <input placeholder="company@email.com" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, marginBottom: 8, outline: "none" }} />
          <input placeholder="Company name" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, marginBottom: 14, outline: "none" }} />
          <button onClick={completeAuth} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: `linear-gradient(135deg,${C.green},${C.cyan})`, color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Sign In & Bridge →</button>
        </div>
      </div>}

      {/* Bridge Modal */}
      {bridgeModal && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => { setBridgeModal(null); setBridgeStep(0); }}>
        <div style={{ width: "90%", maxWidth: 460, borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.border}`, background: `linear-gradient(135deg,${C.green}06,${C.purple}04)` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontSize: 15, fontWeight: 800 }}>🌉 {bridgeModal.name}</div><div style={{ fontSize: 10, color: C.dim }}>Solana Program · OnChainBridge</div></div>
              <button onClick={() => { setBridgeModal(null); setBridgeStep(0); }} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {BRIDGE_STEPS.map((step, i) => {
              const done = i < bridgeStep, active = i === bridgeStep, pending = i > bridgeStep;
              return (<div key={i} style={{ display: "flex", gap: 12, opacity: pending ? .3 : 1, transition: "all .5s" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: done ? C.green : active ? `${C.green}20` : C.card, border: `2px solid ${done ? C.green : active ? C.green : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, transition: "all .5s", boxShadow: active ? `0 0 12px ${C.green}25` : "none" }}>{done ? "✓" : step.icon}</div>
                  {i < 3 && <div style={{ width: 2, height: 24, background: done ? C.green : C.border }} />}
                </div>
                <div style={{ paddingBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 700, color: done ? C.green : active ? C.text : C.muted }}>{step.label}</div><div style={{ fontSize: 11, color: C.dim }}>{step.detail}</div></div>
              </div>);
            })}
            {bridgeStep === 3 && <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: `${C.green}06`, border: `1px solid ${C.green}20`, animation: "fadeUp .3s" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 5 }}>✅ Bridge Complete</div>
              {[["Protocol", bridgeModal.name], ["Value", bridgeModal.value], ["Commission", bridgeModal.commission], ["Network", "Solana Mainnet"]].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}><span style={{ color: C.dim }}>{k}</span><span style={{ color: C.green, fontFamily: "var(--mono)", fontWeight: 600 }}>{v}</span></div>))}
            </div>}
          </div>
        </div>
      </div>}

      {/* Share Card Modal */}
      {shareModal && d && <ShareCard d={d} mode={mode} onClose={() => setShareModal(false)} />}
    </div>
  );
}
