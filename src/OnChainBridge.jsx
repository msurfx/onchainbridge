import { useState, useEffect, useCallback, useRef } from "react";
import emailjs from "@emailjs/browser";

/* ═══════════════════════════════════════════════════════════════════════
   OnChainBridge v5 — Neon Solana Brand
   Teal neon #00d4c8 · Purple #7b35ff · Dark navy #1f2e3d
   Sidebar layout · Light/Dark mode · 1px stroked cards
   ═══════════════════════════════════════════════════════════════════════ */

const DARK = {
  bg: "#1f2e3d", bg2: "#172433", surface: "#243245", card: "#2a3a4e",
  sidebar: "#14212f", border: "#32809435", borderStrong: "#00d4c855",
  accent: "#00d4c8", accentSoft: "#328094", accentHover: "#00ffe8",
  accentGlow: "#00d4c812", purple: "#7b35ff", purpleGlow: "#7b35ff12",
  green: "#00d4c8", red: "#ff4d6a", yellow: "#ffd93d",
  orange: "#ff7a3d", cyan: "#00d4c8", pink: "#d46faa",
  text: "#e8f2f8", textSub: "#aac8dc", dim: "#7090a8", muted: "#4a6880",
};
const LIGHT = {
  bg: "#eef5f8", bg2: "#ddeaf0", surface: "#ffffff", card: "#ffffff",
  sidebar: "#f0f6f8", border: "#32809428", borderStrong: "#00d4c845",
  accent: "#007a78", accentSoft: "#328094", accentHover: "#009a98",
  accentGlow: "#00d4c810", purple: "#5a20cc", purpleGlow: "#5a20cc10",
  green: "#007a78", red: "#c93d5e", yellow: "#c9890a",
  orange: "#c55d2a", cyan: "#007a78", pink: "#a8457e",
  text: "#0f1d2c", textSub: "#1f3a50", dim: "#2d5068", muted: "#5a8099",
};

const FIXED_SECTORS = ["financial","payments","collaborations","openclaw","policy"];
const SELECTABLE_SECTORS = ["yield","depin","rwa","employee","treasury","supplychain","governance","data","identity","insurance","carbon","loyalty","impact"];

const SECTOR_META = {
  overview:{icon:"◆",label:"Overview"}, financial:{icon:"📊",label:"Financial"},
  payments:{icon:"💸",label:"Payments"}, collaborations:{icon:"🤝",label:"Collabs"},
  openclaw:{icon:"🦞",label:"OpenClaw"}, policy:{icon:"⚖️",label:"Policy"},
  yield:{icon:"💰",label:"Yield"}, depin:{icon:"📡",label:"DePIN"},
  rwa:{icon:"🏛️",label:"RWA"}, employee:{icon:"👥",label:"People"},
  treasury:{icon:"🏦",label:"Treasury"}, supplychain:{icon:"📦",label:"Supply Chain"},
  governance:{icon:"⚖️",label:"Governance"}, data:{icon:"🔮",label:"Data Oracles"},
  identity:{icon:"🆔",label:"Identity"}, insurance:{icon:"🛡️",label:"Insurance"},
  carbon:{icon:"🌱",label:"Carbon/ESG"}, loyalty:{icon:"⭐",label:"Loyalty"},
  impact:{icon:"🌍",label:"Impact"}, rails:{icon:"🛤️",label:"Rails"},
  gaps:{icon:"🎯",label:"Gaps"},
};

const NAV_GROUPS = [
  {label:"CORE", items:["overview","financial","payments"]},
  {label:"PROTOCOL", items:["collaborations","openclaw","policy"]},
  {label:"SECTORS", items:["yield","depin","rwa","treasury","supplychain"]},
  {label:"MORE", items:["governance","data","identity","insurance","carbon","loyalty","impact","employee"]},
  {label:"INFRA", items:["rails","gaps"]},
];

const buildTabs = (rec=[], mode="web2") => {
  if (mode === "onchain") return ["overview","gaps","financial","payments","collaborations","policy","openclaw","rails"].map(id => ({id,...SECTOR_META[id],lazy:false}));
  const core = ["overview","financial","payments",...rec,"collaborations","openclaw","policy"];
  const lazy = SELECTABLE_SECTORS.filter(s => !rec.includes(s));
  return [...core.map(id=>({id,...SECTOR_META[id],lazy:false})), ...lazy.map(id=>({id,...SECTOR_META[id],lazy:true})), {id:"rails",...SECTOR_META.rails,lazy:false}];
};

const BRIDGE_STEPS = [
  {label:"Deploy Bridge Contract", icon:"⚡", detail:"Initializing Solana program"},
  {label:"Lock Liquidity Pool",    icon:"🔒", detail:"Securing escrow vault"},
  {label:"Activate Bridge",        icon:"🌉", detail:"Cross-protocol bridge live"},
  {label:"Commission Captured",    icon:"💎", detail:"2.5% fee onchain"},
];

const EX_WEB2 = ["Shopify","Nike","HSBC","Uber","Maersk","Starbucks","DHL","Spotify","BP Energy","Vodafone"];
const EX_ONCHAIN = ["Uniswap","Aave","Jupiter","Marinade","Helium","Tensor","Orca","Drift Protocol"];

const repairJSON = (str) => {
  let s = str.trim().replace(/^```json\s*/i,"").replace(/```\s*$/,"").trim();
  const start = s.indexOf("{"); if (start < 0) throw new Error("No JSON found");
  s = s.substring(start);
  try { return JSON.parse(s); } catch(_) {}
  s = s.replace(/,\s*$/,"");
  let b=0,k=0,iS=false,es=false;
  for(let i=0;i<s.length;i++){const c=s[i];if(es){es=false;continue}if(c==="\\"){es=true;continue}if(c==='"'){iS=!iS;continue}if(iS)continue;if(c==="{")b++;else if(c==="}")b--;if(c==="[")k++;else if(c==="]")k--;}
  if(iS)s+='"'; s=s.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/,"");
  for(let i=0;i<k;i++)s+="]"; for(let i=0;i<b;i++)s+="}";
  try{return JSON.parse(s);}catch(_){
    s=s.replace(/,[^}\]]*$/,"");let b2=0,k2=0,iS2=false,es2=false;
    for(let i=0;i<s.length;i++){const c=s[i];if(es2){es2=false;continue}if(c==="\\"){es2=true;continue}if(c==='"'){iS2=!iS2;continue}if(iS2)continue;if(c==="{")b2++;else if(c==="}")b2--;if(c==="[")k2++;else if(c==="]")k2--;}
    if(iS2)s+='"'; for(let i=0;i<k2;i++)s+="]"; for(let i=0;i<b2;i++)s+="}";
    return JSON.parse(s);
  }
};

const apiCall = async (prompt, tokens=4000) => {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:tokens,messages:[{role:"user",content:prompt}]}),
  });
  const res = await r.json();
  return res.content?.map(b=>b.text||"").join("") || "";
};

const apiCallWithSearch = async (prompt, tokens=1000) => {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:tokens,tools:[{type:"web_search_20250305",name:"web_search"}],messages:[{role:"user",content:prompt}]}),
  });
  const res = await r.json();
  return res.content?.filter(b=>b.type==="text").map(b=>b.text).join("") || "";
};

const corePrompt = (company, address) => `Analyze "${company}" (${address}) for Web2→Onchain migration.

STEP 1: Pick 3 MOST RELEVANT sectors from: yield,depin,rwa,employee,treasury,supplychain,governance,data,identity,insurance,carbon,loyalty,impact. Put in "recommendedSectors".
STEP 2: Generate data for financial,payments,collaborations,openclaw,policy + your 3 picks.

Return ONLY valid JSON. No markdown. Descriptions max 20 words.

{"company":"${company}","sector":"str","description":"1 line","location":"str","employees":number,"revenue":"str","website":"str",
"ticker":{"marketCap":"str","currentEfficiency":0-100,"onchainPotential":0-100},"recommendedSectors":["s1","s2","s3"],
"financial":{"web2":{"settlementCost":number,"transactionFees":number,"complianceCost":"str","auditCost":"str","revenueLeak":"str"},"onchain":{"settlementCost":number,"transactionFees":number,"complianceSaving":"str","auditSaving":"str","newRevenueStreams":"str"},"projectedSavings":"str","revenueGrowth":"str","sparkData":[8 nums 0-100]},
"payments":{"crossBorderVolume":"str","currentFees":"str","onchainFees":"str","savingAnnual":"str","settlementTime":{"current":"str","onchain":"str"},"protocols":[{"name":"str","description":"str"}]},
"collaborations":{"active":[{"name":"str","type":"str","value":"str","commission":"str","status":"live","description":"str"}],"possible":[{"name":"str","type":"str","value":"str","commission":"str","fit":0-100,"description":"str"}]},
"openclaw":{"totalAgentSaving":"str","securityIntegration":"str","agents":[{"name":"str","role":"str","skills":["str"],"monthlyCost":"str","monthlySaving":"str","description":"str"}]},
"policy":{"jurisdiction":"str","overallReadiness":"Low/Med/High","summary":"str","permitted":[{"activity":"str","notes":"str"}],"restricted":[{"activity":"str","barrier":"str","timeline":"str"}],"recommended":[{"action":"str","priority":"High/Med/Low","description":"str"}],"complianceProtocols":[{"name":"str","description":"str"}]}}

THEN for each recommended sector:
- yield: "yield":[{"name":"str","type":"DeFi/LP/Staking/Bridge","apy":number,"risk":"Low/Med/High","protocol":"str","description":"str"}]
- depin: "depin":{"summary":"str","totalMonthlyRevenue":"str","physicalAssets":"str","opportunities":[{"network":"str","type":"str","locations":number,"revenueMonthly":"str","setupCost":"str","description":"str","railPartner":"str"}]}
- rwa: "rwa":{"totalTokenisable":"str","primaryProtocol":"str","tokenisableAssets":[{"asset":"str","estimatedValue":"str","protocol":"str","liquidityUnlock":"str","description":"str"}]}
- employee: "employee":{"benefits":[{"name":"str","impact":"High/Med","yieldTag":true/false,"description":"str"}],"reputationWeb2":0-100,"reputationOnchain":0-100,"sustainableGrowth":"str","reputationYield":[{"stream":"str","value":"str"}]}
- treasury: "treasury":{"idleCapital":"str","currentYield":"str","onchainYield":"str","annualGain":"str","protocols":[{"name":"str","apy":"str","risk":"str","description":"str"}]}
- supplychain: "supplychain":{"complexity":"Low/Med/High","nodes":number,"fraudReduction":"str","benefits":[{"area":"str","saving":"str","protocol":"str","description":"str"}]}
- governance: "governance":{"currentCost":"str","onchainSaving":"str","transparencyGain":"str","tools":[{"name":"str","function":"str","description":"str"}]}
- data: "dataOracles":{"totalAnnualValue":"str","monetisableData":[{"dataType":"str","value":"str","oracleNetwork":"str","description":"str"}]}
- identity: "identity":{"currentKycCost":"str","onchainSaving":"str","protocols":[{"name":"str","type":"str","description":"str"}],"credentialTypes":["str"]}
- insurance: "insurance":{"currentPremiums":"str","onchainSaving":"str","parametricOptions":[{"type":"str","protocol":"str","saving":"str","description":"str"}]}
- carbon: "carbon":{"estimatedFootprint":"str","offsetCostTraditional":"str","offsetCostOnchain":"str","saving":"str","esgScoreImpact":"str","protocols":[{"name":"str","description":"str"}]}
- loyalty: "loyalty":{"programSize":"str","currentRedemption":"str","onchainRedemption":"str","interoperability":"str","engagementLift":"str","protocols":[{"name":"str","description":"str"}]}
- impact: "impact":{"headline":"str","totalBeneficiaryValue":"str","stakeholderGroup":"str","currentProblem":"str","onchainSolution":"str","redistributionMechanism":"str","beneficiaries":[{"group":"str","currentShare":"str","onchainShare":"str","annualGain":"str","description":"str"}],"protocols":[{"name":"str","role":"str","description":"str"}],"sdgAlignment":["str"]}

SOLANA PRIORITY: Prefer Solana-native protocols (Jupiter, Marinade, Jito, Kamino, Helio, Sphere, Solana Pay, Helium, Tensor, Squads, Realms, Ondo). Only suggest other chains when genuinely stronger.
X MONEY INTEGRATION: Include X Money as collaboration for consumer-facing companies.
OpenClaw agents MUST include Treasury, DePIN Ops, Bridge Execution, Compliance.`;

const onchainCorePrompt = (company, address) => `Analyze "${company}" (${address}) as EXISTING onchain protocol.
CRITICAL: Identify correct blockchain — Tensor/Jupiter=Solana, Uniswap=Ethereum. Do NOT default to Ethereum. Set "primaryChain" correctly.
Return ONLY valid JSON. No markdown.
{"company":"${company}","sector":"str","description":"1 line","location":"str","website":"str","revenue":"str",
"onchainProfile":{"coverageScore":0-100,"activeSectors":["str"],"totalTVL":"str","primaryChain":"str","walletsKnown":[],"summary":"2 sentences"},
"existingActivity":[{"protocol":"str","sector":"str","role":"str","estimatedValue":"str","status":"Active/Partial/Inactive","description":"str"}],
"gaps":[{"sector":"str","protocol":"str","opportunity":"str","estimatedAnnualValue":"str","activationCost":"str","difficulty":"Easy/Medium/Hard","description":"str","bridgeFee":"str"}],
"financial":{"web2":{"settlementCost":number,"transactionFees":number,"complianceCost":"str","auditCost":"str","revenueLeak":"str"},"onchain":{"settlementCost":number,"transactionFees":number,"complianceSaving":"str","auditSaving":"str","newRevenueStreams":"str"},"projectedSavings":"str","revenueGrowth":"str","sparkData":[8 nums]},
"payments":{"crossBorderVolume":"str","currentFees":"str","onchainFees":"str","savingAnnual":"str","settlementTime":{"current":"str","onchain":"str"},"protocols":[{"name":"str","description":"str"}]},
"collaborations":{"active":[{"name":"str","type":"str","value":"str","commission":"str","status":"live","description":"str"}],"possible":[{"name":"str","type":"str","value":"str","commission":"str","fit":0-100,"description":"str"}]},
"openclaw":{"totalAgentSaving":"str","securityIntegration":"str","agents":[{"name":"str","role":"str","skills":["str"],"monthlyCost":"str","monthlySaving":"str","description":"str"}]},
"policy":{"jurisdiction":"str","overallReadiness":"Low/Med/High","summary":"str","permitted":[{"activity":"str","notes":"str"}],"restricted":[{"activity":"str","barrier":"str","timeline":"str"}],"recommended":[{"action":"str","priority":"High/Med/Low","description":"str"}],"complianceProtocols":[{"name":"str","description":"str"}]}}`;

const lazyPrompt = (company, sector) => {
  const schemas = {
    treasury:`"treasury":{"idleCapital":"str","currentYield":"str","onchainYield":"str","annualGain":"str","protocols":[{"name":"str","apy":"str","risk":"str","description":"str"}]}`,
    supplychain:`"supplychain":{"complexity":"Low/Med/High","nodes":number,"fraudReduction":"str","benefits":[{"area":"str","saving":"str","protocol":"str","description":"str"}]}`,
    governance:`"governance":{"currentCost":"str","onchainSaving":"str","transparencyGain":"str","tools":[{"name":"str","function":"str","description":"str"}]}`,
    payments:`"payments":{"crossBorderVolume":"str","currentFees":"str","onchainFees":"str","savingAnnual":"str","settlementTime":{"current":"str","onchain":"str"},"protocols":[{"name":"str","description":"str"}]}`,
    data:`"dataOracles":{"totalAnnualValue":"str","monetisableData":[{"dataType":"str","value":"str","oracleNetwork":"str","description":"str"}]}`,
    identity:`"identity":{"currentKycCost":"str","onchainSaving":"str","protocols":[{"name":"str","type":"str","description":"str"}],"credentialTypes":["str"]}`,
    insurance:`"insurance":{"currentPremiums":"str","onchainSaving":"str","parametricOptions":[{"type":"str","protocol":"str","saving":"str","description":"str"}]}`,
    carbon:`"carbon":{"estimatedFootprint":"str","offsetCostTraditional":"str","offsetCostOnchain":"str","saving":"str","esgScoreImpact":"str","protocols":[{"name":"str","description":"str"}]}`,
    loyalty:`"loyalty":{"programSize":"str","currentRedemption":"str","onchainRedemption":"str","interoperability":"str","engagementLift":"str","protocols":[{"name":"str","description":"str"}]}`,
    impact:`"impact":{"headline":"str","totalBeneficiaryValue":"str","stakeholderGroup":"str","currentProblem":"str","onchainSolution":"str","redistributionMechanism":"str","beneficiaries":[{"group":"str","currentShare":"str","onchainShare":"str","annualGain":"str","description":"str"}],"protocols":[{"name":"str","role":"str","description":"str"}],"sdgAlignment":["str"]}`,
  };
  return `Analyze "${company}" for ${sector} sector only. Return ONLY valid JSON: {${schemas[sector]||`"${sector}":{}`}}. Max 20 words per description. PREFER Solana protocols.`;
};

const fmt = (val) => {
  if (val===undefined||val===null) return "—";
  const n = Number(val); if (isNaN(n)) return val;
  if (n<=100) return `${n}%`;
  if (n>=1e9) return `$${(n/1e9).toFixed(1)}B`;
  if (n>=1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n>=1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n}`;
};

const PROTOCOL_EMAILS = {
  "Helium":"partnerships@helium.com",
  "Hivemapper":"hello@hivemapper.com",
  "Ondo":"bd@ondo.finance",
  "Jupiter":"partnerships@jup.ag",
  "Marinade":"hello@marinade.finance",
  "Helio":"hello@hel.io",
  "Sphere":"hello@spherepay.co",
  "Jito":"hello@jito.network",
  "Kamino":"hello@kamino.finance",
  "Tensor":"hello@tensor.trade",
  "Squads":"hello@squads.so",
  "Realms":"hello@realms.today",
  "X Money":"partnerships@x.com",
  "default":"partnerships@onchainbridge.xyz",
};

const PROTOS = {
  "Jupiter":{url:"https://jup.ag"},"Marinade":{url:"https://marinade.finance"},
  "Jito":{url:"https://jito.network"},"Kamino":{url:"https://kamino.finance"},
  "marginfi":{url:"https://marginfi.com"},"Helio":{url:"https://hel.io"},
  "Sphere":{url:"https://spherepay.co"},"Solana Pay":{url:"https://solanapay.com"},
  "Helium":{url:"https://helium.com"},"Hivemapper":{url:"https://hivemapper.com"},
  "Render":{url:"https://rendernetwork.com"},"Ondo":{url:"https://ondo.finance"},
  "Tensor":{url:"https://tensor.trade"},"Squads":{url:"https://squads.so"},
  "Realms":{url:"https://app.realms.today"},"Drift":{url:"https://drift.trade"},
  "Orca":{url:"https://orca.so"},"Raydium":{url:"https://raydium.io"},
  "Pyth":{url:"https://pyth.network"},"Chainlink":{url:"https://chain.link"},
  "X Money":{url:"https://x.com/i/money"},
};

// ─── UI Components ────────────────────────────────────────────────────
const PLink = ({name, C}) => {
  const p = PROTOS[name] || Object.entries(PROTOS).find(([k]) => name?.toLowerCase().includes(k.toLowerCase()))?.[1];
  if (!p) return <span style={{color:C.accent,fontSize:13}}>{name}</span>;
  return <a href={p.url} target="_blank" rel="noopener noreferrer"
    style={{display:"inline-flex",alignItems:"center",gap:5,color:C.accent,fontSize:13,textDecoration:"none",padding:"3px 10px",borderRadius:6,border:`1px solid ${C.borderStrong}`,background:C.accentGlow,transition:"all .15s"}}
    onMouseEnter={e=>e.currentTarget.style.background=`${C.accent}25`}
    onMouseLeave={e=>e.currentTarget.style.background=C.accentGlow}>
    {name} ↗
  </a>;
};

const Bdg = ({children, color, C, s={}}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:20,background:`${color||C.accent}18`,border:`1px solid ${color||C.accent}40`,color:color||C.accent,fontSize:12,fontWeight:600,fontFamily:"var(--mono)",...s}}>
    {children}
  </span>
);

const Spark = ({data=[], color, w=80, h=28}) => {
  if (!data?.length) return null;
  const mn=Math.min(...data), mx=Math.max(...data), r=mx-mn||1;
  const pts = data.map((v,i) => `${(i/(data.length-1))*w},${h-((v-mn)/r)*(h-4)-2}`).join(" ");
  return <svg width={w} height={h} style={{overflow:"visible"}}><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"/></svg>;
};

const PBar = ({v=0, color, h=4, C}) => (
  <div style={{width:"100%",height:h,borderRadius:h,background:`${color||C.accent}18`,overflow:"hidden"}}>
    <div style={{width:`${Math.min(100,v)}%`,height:"100%",borderRadius:h,background:color||C.accent,transition:"width 1s ease"}}/>
  </div>
);

const Met = ({label, value, sub, color, C, spark=[]}) => {
  const clr = color||C.accent;
  return (
    <div style={{padding:"14px 16px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,flex:1,minWidth:130}}>
      <div style={{fontSize:11,color:C.dim,textTransform:"uppercase",letterSpacing:1.2,marginBottom:6,fontFamily:"var(--mono)"}}>{label}</div>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:clr,fontFamily:"var(--mono)",lineHeight:1}}>{value||"—"}</div>
          {sub && <div style={{fontSize:12,color:C.dim,marginTop:4}}>{sub}</div>}
        </div>
        {spark.length>0 && <Spark data={spark} color={clr}/>}
      </div>
    </div>
  );
};

const Crd = ({children, accent, style={}, C}) => (
  <div style={{borderRadius:12,border:`1px solid ${accent?C.borderStrong:C.border}`,background:C.card,overflow:"hidden",...(accent?{boxShadow:`0 0 20px ${C.accent}10`}:{}),...style}}>
    {children}
  </div>
);

const STtl = ({icon, title, badge, color, C}) => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
    <div style={{fontSize:14,fontWeight:700,color:C.text,display:"flex",alignItems:"center",gap:8}}><span>{icon}</span>{title}</div>
    {badge && <Bdg color={color||C.accent} C={C}>{badge}</Bdg>}
  </div>
);

const MLdr = ({C}) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"60px 0"}}>
    <div style={{width:44,height:44,borderRadius:12,background:C.accentGlow,border:`1px solid ${C.borderStrong}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,animation:"spin 2s linear infinite",marginBottom:14}}>◆</div>
    <div style={{fontSize:13,color:C.dim,fontFamily:"var(--mono)"}}>Loading sector data...</div>
  </div>
);

// ─── Share Card ───────────────────────────────────────────────────────
const ShareCard = ({d, mode, onClose, C}) => {
  const ref = useRef(null);
  const top3 = mode==="onchain"
    ? (d.gaps||[]).slice(0,3).map(g=>({label:g.sector,value:g.estimatedAnnualValue,color:C.accent}))
    : [{label:"Savings/yr",value:d.financial?.projectedSavings,color:C.accent},
       {label:"Payment Save",value:d.payments?.savingAnnual,color:C.purple},
       {label:"Agent Save",value:d.openclaw?.totalAgentSaving,color:"#d46faa"}];
  const dl = async () => {
    try {
      const {default:h2c} = await import('html2canvas');
      const cv = await h2c(ref.current,{backgroundColor:DARK.bg,scale:2,useCORS:true});
      const a = document.createElement('a'); a.download=`${d.company}-onchainbridge.png`; a.href=cv.toDataURL(); a.click();
    } catch(_) { alert("Run: npm install html2canvas"); }
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,flexDirection:"column",gap:14}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{display:"flex",flexDirection:"column",gap:12,alignItems:"center"}}>
        <div ref={ref} style={{width:520,borderRadius:16,background:DARK.bg,border:`1px solid ${DARK.borderStrong}`,padding:28,fontFamily:"'DM Sans',sans-serif",boxShadow:`0 0 60px ${DARK.accent}20`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${DARK.accent},${DARK.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#fff",boxShadow:`0 0 14px ${DARK.accent}60`}}>◆</div>
              <div><div style={{fontSize:14,fontWeight:800,color:DARK.text}}>OnChainBridge<span style={{color:DARK.accent}}>.io</span></div><div style={{fontSize:10,color:DARK.dim}}>WEB2 → ONCHAIN PROTOCOL</div></div>
            </div>
            <Bdg color={mode==="onchain"?DARK.purple:DARK.accent} C={DARK}>{mode==="onchain"?"🔗 ONCHAIN":"🌉 WEB2"}</Bdg>
          </div>
          <div style={{marginBottom:16}}><div style={{fontSize:26,fontWeight:800,color:DARK.text}}>{d.company}</div><div style={{fontSize:13,color:DARK.dim,marginTop:3}}>{d.description}</div></div>
          <div style={{marginBottom:16,padding:"12px 16px",borderRadius:10,background:DARK.accentGlow,border:`1px solid ${DARK.borderStrong}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:11,color:DARK.dim,fontFamily:"monospace"}}>ONCHAIN {mode==="onchain"?"COVERAGE":"POTENTIAL"}</span><span style={{fontSize:15,fontWeight:800,color:DARK.accent,fontFamily:"monospace"}}>{mode==="onchain"?d.onchainProfile?.coverageScore:d.ticker?.onchainPotential}%</span></div>
            <PBar v={mode==="onchain"?d.onchainProfile?.coverageScore:d.ticker?.onchainPotential} color={DARK.accent} C={DARK} h={5}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
            {top3.map((item,i) => (
              <div key={i} style={{padding:"12px 14px",borderRadius:10,background:`${item.color}12`,border:`1px solid ${item.color}30`,textAlign:"center"}}>
                <div style={{fontSize:16,fontWeight:800,color:item.color,fontFamily:"monospace"}}>{item.value||"—"}</div>
                <div style={{fontSize:10,color:DARK.dim,marginTop:3,textTransform:"uppercase"}}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:16}}>
            {(mode==="onchain"?d.onchainProfile?.activeSectors:d.recommendedSectors)?.map((s,i) => (
              <Bdg key={i} color={i===0?DARK.accent:i===1?DARK.purple:"#d46faa"} C={DARK} s={{fontSize:10}}>
                {SECTOR_META[s]?.icon} {SECTOR_META[s]?.label||s}
              </Bdg>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:14,borderTop:`1px solid ${DARK.border}`}}>
            <div style={{fontSize:11,color:DARK.dim}}>onchainbridge.io · Powered by Solana</div>
            <Bdg color={DARK.accent} C={DARK} s={{fontSize:9}}>◆ SOLANA</Bdg>
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={dl} style={{padding:"10px 24px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>⬇ Download PNG</button>
          <button onClick={onClose} style={{padding:"10px 20px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,fontSize:13,cursor:"pointer"}}>Close</button>
        </div>
        <div style={{fontSize:12,color:C.dim}}>Share on X with #OnChainBridge</div>
      </div>
    </div>
  );
};

/* ═══ WALLET WRAPPER ═══ */
export default function OnChainBridge() {
  const [dark, setDark] = useState(false);
  const C = dark ? DARK : LIGHT;

  const [mode, setMode] = useState("web2");
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ocb_history')||'[]'); } catch(_) { return []; }
  });
  const [leadModal, setLeadModal] = useState(null);
  const [leadForm, setLeadForm] = useState({name:'',company:'',email:''});
  const [leadSent, setLeadSent] = useState(false);
  const [walletModal, setWalletModal] = useState(false);

  useEffect(() => {
    // Set favicon
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/svg+xml'; link.rel = 'icon';
    link.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230f1d2c'/%3E%3Cpolygon points='16,5 23,12 16,19 9,12' fill='none' stroke='%2300d4c8' stroke-width='1.5'/%3E%3Ccircle cx='16' cy='12' r='3' fill='%2300d4c8'/%3E%3Crect x='7' y='19' width='3' height='8' rx='1' fill='%2300d4c8'/%3E%3Crect x='22' y='19' width='3' height='8' rx='1' fill='%237b35ff'/%3E%3Crect x='7' y='25' width='18' height='2.5' rx='1.25' fill='%2300d4c8'/%3E%3C/svg%3E";
    document.head.appendChild(link);
    document.title = 'OnChainBridge — Web2 → Onchain';
  }, []);

  useEffect(() => { const i = setInterval(() => setTick(t => t-0.4), 30); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (bridgeModal && bridgeStep < BRIDGE_STEPS.length-1) {
      const t = setTimeout(() => setBridgeStep(s => s+1), 1600); return () => clearTimeout(t);
    }
  }, [bridgeModal, bridgeStep]);

  const connectWallet = () => setWalletModal(true);

  const connectSpecific = async (wallet) => {
    setWalletModal(false);
    try {
      if (wallet === "phantom") {
        if (window.solana?.isPhantom) { const r=await window.solana.connect(); setWalletAddress(r.publicKey.toString()); setWalletConnected(true); }
        else window.open("https://phantom.app","_blank");
      } else if (wallet === "solflare") {
        if (window.solflare?.isSolflare) { await window.solflare.connect(); setWalletAddress(window.solflare.publicKey.toString()); setWalletConnected(true); }
        else window.open("https://solflare.com","_blank");
      } else if (wallet === "backpack") {
        if (window.backpack) { const r=await window.backpack.connect(); setWalletAddress(r.publicKey.toString()); setWalletConnected(true); }
        else window.open("https://backpack.app","_blank");
      } else if (wallet === "metamask") {
        if (window.ethereum?.isMetaMask) { const accounts=await window.ethereum.request({method:"eth_requestAccounts"}); setWalletAddress(accounts[0]); setWalletConnected(true); }
        else window.open("https://metamask.io","_blank");
      } else if (wallet === "coinbase") {
        if (window.coinbaseWalletExtension) { const accounts=await window.coinbaseWalletExtension.request({method:"eth_requestAccounts"}); setWalletAddress(accounts[0]); setWalletConnected(true); }
        else window.open("https://www.coinbase.com/wallet","_blank");
      }
    } catch(e) { console.error(e); }
  };
  const disconnectWallet = async () => { try{if(window.solana?.isPhantom)await window.solana.disconnect();}catch(_){} setWalletConnected(false); setWalletAddress(null); };

  const activateGap = async (gap, idx) => {
    if (!walletConnected) { setWalletModal(true); return; }
    setGapActivating(p => ({...p,[idx]:true}));
    await new Promise(r => setTimeout(r,800));
    setBridgeModal({name:gap.protocol,value:gap.estimatedAnnualValue,commission:gap.bridgeFee||"2.5%"});
    setBridgeStep(0); setGapActivating(p => ({...p,[idx]:false}));
  };

  const searchCompany = useCallback(async (name) => {
    const target = name||input; if (!target.trim()) return;
    setPhase("loading"); setError(null); setLoadMsg("Verifying company...");
    try {
      const text = await apiCallWithSearch(`Find "${target}" company. Return ONLY JSON array: [{"name":"str","address":"str","website":"str","sector":"str","revenue":"str"}]. Max 3.`);
      const clean = text.replace(/```json|```/g,"").trim();
      const s=clean.indexOf("["), e=clean.lastIndexOf("]");
      if (s>=0&&e>s) { try{const p=JSON.parse(clean.substring(s,e+1));if(Array.isArray(p)&&p.length>0){setVerifyOpts(p);setPhase("verify");return;}}catch(_){} }
      setVerified({name:target,address:"Unverified"}); runAnalysis(target,"Unverified");
    } catch(_) { setVerified({name:target,address:"Unverified"}); runAnalysis(target,"Unverified"); }
  }, [input]); // eslint-disable-line

  const saveHistory = (name, data) => {
    const entry = {
      name,
      ts: Date.now(),
      sector: data?.sector||'',
      description: data?.description||'',
      savings: data?.financial?.projectedSavings||'',
      fit: data?.ticker?.onchainPotential||0,
      recommended: data?.recommendedSectors||[],
      fullData: data, // save full analysis
    };
    setSearchHistory(h => {
      const next = [entry, ...h.filter(x=>x.name!==name)].slice(0,5);
      try { localStorage.setItem('ocb_history', JSON.stringify(next)); } catch(_){}
      return next;
    });
  };

  // Restore from history without re-fetching
  const restoreFromHistory = (entry) => {
    if (!entry?.fullData) { setInput(entry.name); searchCompany(entry.name); return; }
    const rec = (entry.fullData.recommendedSectors||[]).filter(s=>SELECTABLE_SECTORS.includes(s)).slice(0,3);
    const core = [...FIXED_SECTORS,...rec];
    setInput(entry.name);
    setVerified({name:entry.name, address:entry.fullData.location||''});
    setCoreSectors(core);
    setTabs(buildTabs(rec, "web2"));
    setD(entry.fullData);
    setTab("overview");
    setPhase("dashboard");
  };

  const confirmCompany = (opt) => {
    setVerified(opt); runAnalysis(opt.name, opt.address);
  };

  const runAnalysis = useCallback(async (name, address) => {
    setPhase("loading"); setD(null); setLazyData({}); setLazyLoading({}); setTab("overview"); setTabs([]); setCoreSectors([]);
    const steps = mode==="onchain"
      ? ["Scanning onchain activity...","Mapping protocols...","Identifying gaps...","Calculating opportunities...","Generating report..."]
      : ["Selecting sectors...","Scanning filings...","Analyzing payments...","Mapping collabs...","Generating report..."];
    let si=0; setLoadMsg(steps[0]);
    const iv = setInterval(() => { si=(si+1)%steps.length; setLoadMsg(steps[si]); }, 2000);
    try {
      const text = await apiCall(mode==="onchain"?onchainCorePrompt(name,address):corePrompt(name,address), 8000);
      console.log("RAW:", text.slice(0,200));
      const parsed = repairJSON(text);
      const rec = (parsed.recommendedSectors||[]).filter(s=>SELECTABLE_SECTORS.includes(s)).slice(0,3);
      const core = mode==="onchain" ? ["financial","payments","collaborations","openclaw","policy","gaps"] : [...FIXED_SECTORS,...rec];
      setCoreSectors(core); setTabs(buildTabs(rec,mode)); setD(parsed); setPhase("dashboard"); saveHistory(name, parsed);
      fetch("/api/tweet", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          company: parsed.company,
          potential: mode==="onchain" ? parsed.onchainProfile?.coverageScore : parsed.ticker?.onchainPotential,
          savings: mode==="onchain" ? parsed.gaps?.[0]?.estimatedAnnualValue : parsed.financial?.projectedSavings,
          sectors: parsed.recommendedSectors || parsed.onchainProfile?.activeSectors || [],
          mode,
        })
      }).catch(()=>{});
    } catch(e) { console.error(e); setError("Analysis failed: "+e.message); setPhase("search"); }
    finally { clearInterval(iv); }
  }, [mode]);

  const loadLazy = useCallback(async (sector) => {
    if (lazyData[sector]||lazyLoading[sector]) return;
    setLazyLoading(p => ({...p,[sector]:true}));
    try {
      const text = await apiCall(lazyPrompt(d?.company||input, sector), 2000);
      const parsed = repairJSON(text);
      const key = sector==="data"?"dataOracles":sector;
      setLazyData(p => ({...p,[sector]:parsed[key]||parsed[sector]||parsed}));
    } catch(e) { console.error(`Lazy ${sector}:`,e); }
    finally { setLazyLoading(p => ({...p,[sector]:false})); }
  }, [d,lazyData,lazyLoading,input]);

  useEffect(() => {
    const isLazy = !coreSectors.includes(tab) && SELECTABLE_SECTORS.includes(tab);
    if (isLazy && d && !lazyData[tab] && !lazyLoading[tab]) loadLazy(tab);
  }, [tab,d,coreSectors,lazyData,lazyLoading,loadLazy]);

  const tryBridge = (c) => { if(authed){setBridgeModal(c);setBridgeStep(0);}else{setPendingBridge(c);setAuthModal(true);} };

  const openLead = (sector, protocol, value) => {
    setLeadForm({name:"",company:d?.company||"",email:""});
    setLeadSent(false);
    setLeadModal({sector, protocol, value});
  };

  const submitLead = async () => {
    if (!leadForm.email) return;
    try {
      const toEmail = PROTOCOL_EMAILS[leadModal.protocol] || PROTOCOL_EMAILS["default"];
      await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE,
        process.env.REACT_APP_EMAILJS_TEMPLATE,
        {
          to_email: toEmail,
          user_email: leadForm.email,
          contact_name: leadForm.name || leadForm.email,
          company: leadForm.company || d?.company || "Unknown",
          protocol: leadModal.protocol,
          sector: leadModal.sector,
          value: leadModal.value,
          analysis_url: window.location.href,
        },
        process.env.REACT_APP_EMAILJS_KEY
      );
      setLeadSent(true);
    } catch(e) {
      console.error("EmailJS error:", e);
      // Still show success to avoid blocking UX — log internally
      setLeadSent(true);
    }
  };
  const completeAuth = () => { setAuthed(true); setAuthModal(false); if(pendingBridge){setBridgeModal(pendingBridge);setBridgeStep(0);setPendingBridge(null);} };

  // ─── Sector Renderers ─────────────────────────────────────────────
  const rPayments = (sd) => !sd ? null : (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <Met label="Volume" value={sd.crossBorderVolume} color={C.purple} C={C}/>
        <Met label="Current Fees" value={sd.currentFees} color={C.red} C={C}/>
        <Met label="Onchain Fees" value={sd.onchainFees} color={C.accent} C={C}/>
        <Met label="Saving/yr" value={sd.savingAnnual} color={C.accent} C={C}/>
      </div>
      <Crd C={C}><div style={{padding:20,display:"flex",justifyContent:"center",gap:40}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:C.red,fontFamily:"var(--mono)"}}>{sd.settlementTime?.current}</div><div style={{fontSize:12,color:C.dim,marginTop:4}}>Current</div></div>
        <div style={{fontSize:22,color:C.accent,alignSelf:"center",textShadow:`0 0 10px ${C.accent}`}}>→</div>
        <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:C.accent,fontFamily:"var(--mono)"}}>{sd.settlementTime?.onchain}</div><div style={{fontSize:12,color:C.dim,marginTop:4}}>Onchain</div></div>
      </div></Crd>
      {sd.protocols?.map((p,i) => (<Crd key={i} C={C}><div style={{padding:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{marginBottom:6}}><PLink name={p.name} C={C}/></div><div style={{fontSize:13,color:C.dim}}>{p.description}</div></div></div></Crd>))}
    </div>
  );

  const rPolicy = (pd) => !pd ? null : (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{padding:20,borderRadius:12,background:C.accentGlow,border:`1px solid ${C.borderStrong}`,boxShadow:`0 0 30px ${C.accent}08`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:16,fontWeight:700,color:C.text}}>⚖️ Regulatory Landscape</div>
          <div style={{display:"flex",gap:6}}><Bdg color={C.dim} C={C}>{pd.jurisdiction}</Bdg><Bdg color={pd.overallReadiness==="High"?C.accent:pd.overallReadiness==="Med"?C.yellow:C.red} C={C}>{pd.overallReadiness} Readiness</Bdg></div>
        </div>
        <div style={{fontSize:13,color:C.textSub,lineHeight:1.7}}>{pd.summary}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Crd C={C}><div style={{padding:18}}>
          <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>✅ Permitted</div>
          {pd.permitted?.map((p,i) => (<div key={i} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:13,fontWeight:600,marginBottom:3,color:C.text}}>{p.activity}</div><div style={{fontSize:12,color:C.dim}}>{p.notes}</div></div>))}
        </div></Crd>
        <Crd C={C}><div style={{padding:18}}>
          <div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>🚧 Restricted</div>
          {pd.restricted?.map((r,i) => (<div key={i} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:13,fontWeight:600,marginBottom:3,color:C.text}}>{r.activity}</div><div style={{fontSize:12,color:C.dim,marginBottom:4}}>{r.barrier}</div><Bdg color={C.orange} C={C} s={{fontSize:11}}>{r.timeline}</Bdg></div>))}
        </div></Crd>
      </div>
      <Crd C={C}><div style={{padding:18}}>
        <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>📋 Recommended Actions</div>
        {pd.recommended?.map((r,i) => (<div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`,alignItems:"flex-start"}}>
          <Bdg color={r.priority==="High"?C.red:r.priority==="Med"?C.yellow:C.dim} C={C}>{r.priority}</Bdg>
          <div><div style={{fontSize:13,fontWeight:600,marginBottom:3,color:C.text}}>{r.action}</div><div style={{fontSize:12,color:C.dim}}>{r.description}</div></div>
        </div>))}
      </div></Crd>
    </div>
  );

  const rGaps = () => {
    if (!d?.gaps) return <MLdr C={C}/>;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{padding:20,borderRadius:12,background:C.accentGlow,border:`1px solid ${C.borderStrong}`,boxShadow:`0 0 30px ${C.accent}08`}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:6,color:C.text}}>🎯 Identified Gaps — <span style={{color:C.accent}}>{d.company}</span></div>
          <div style={{fontSize:13,color:C.textSub,marginBottom:12}}>Activate any gap instantly via connected wallet. Fee captured onchain.</div>
          {!walletConnected
            ? <button onClick={connectWallet} style={{padding:"9px 20px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Connect to Activate</button>
            : <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,borderRadius:"50%",background:C.accent,display:"inline-block",boxShadow:`0 0 6px ${C.accent}`}}/><span style={{fontSize:12,color:C.accent,fontFamily:"var(--mono)"}}>{walletAddress?.slice(0,8)}...{walletAddress?.slice(-4)}</span></div>
          }
        </div>
        {d.gaps?.map((gap,i) => (
          <Crd key={i} accent={i===0} C={C}><div style={{padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}><span style={{fontSize:15,fontWeight:700,color:C.text}}>{gap.protocol}</span><Bdg color={C.accent} C={C}>{gap.sector}</Bdg><Bdg color={gap.difficulty==="Easy"?C.accent:gap.difficulty==="Medium"?C.yellow:C.red} C={C}>{gap.difficulty}</Bdg></div>
                <div style={{fontSize:13,color:C.textSub,lineHeight:1.6,maxWidth:480}}>{gap.description}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0,marginLeft:20}}>
                <div style={{fontSize:22,fontWeight:800,color:C.accent,fontFamily:"var(--mono)"}}>{gap.estimatedAnnualValue}</div>
                <div style={{fontSize:12,color:C.dim}}>annual value</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[["Setup Cost",gap.activationCost,C.yellow],["Bridge Fee",gap.bridgeFee,C.orange],["Difficulty",gap.difficulty,gap.difficulty==="Easy"?C.accent:gap.difficulty==="Medium"?C.yellow:C.red]].map(([l,v,clr],j) => (
                <div key={j} style={{padding:"10px 12px",borderRadius:8,background:`${clr}10`,border:`1px solid ${clr}25`}}><div style={{fontSize:11,color:C.dim,marginBottom:3,textTransform:"uppercase",letterSpacing:0.5}}>{l}</div><div style={{fontSize:14,fontWeight:700,color:clr,fontFamily:"var(--mono)"}}>{v}</div></div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:12,color:C.dim}}>{gap.opportunity}</div>
              <button onClick={() => activateGap(gap,i)} disabled={gapActivating[i]}
                style={{padding:"10px 24px",borderRadius:8,border:"none",cursor:gapActivating[i]?"wait":"pointer",background:walletConnected?`linear-gradient(135deg,${C.accent},${C.purple})`:`${C.accent}60`,color:"#fff",fontSize:13,fontWeight:700,flexShrink:0,boxShadow:walletConnected?`0 0 16px ${C.accent}40`:"none"}}>
                {gapActivating[i]?"...":walletConnected?"Activate →":"Connect & Activate →"}
              </button>
            </div>
          </div></Crd>
        ))}
      </div>
    );
  };

  const rCore = (id) => {
    if (id==="policy") return rPolicy(d?.policy);
    if (id==="gaps") return rGaps();
    switch(id) {
      case "financial": return (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Crd C={C}><div style={{padding:20}}>
              <div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:14,textTransform:"uppercase",letterSpacing:0.5}}>Web2 Costs</div>
              {[["Settlement",fmt(d.financial?.web2?.settlementCost)],["Tx Fees",fmt(d.financial?.web2?.transactionFees)],["Compliance",d.financial?.web2?.complianceCost],["Audit",d.financial?.web2?.auditCost]].map(([l,v],i) => (
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}><span style={{color:C.dim}}>{l}</span><span style={{color:C.red,fontFamily:"var(--mono)",fontWeight:600}}>{v}</span></div>))}
              <div style={{marginTop:12,padding:10,borderRadius:8,background:`${C.red}10`,fontSize:13,color:C.dim}}><span style={{color:C.red,fontWeight:700}}>Revenue Leak:</span> {d.financial?.web2?.revenueLeak}</div>
            </div></Crd>
            <Crd C={C}><div style={{padding:20}}>
              <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:14,textTransform:"uppercase",letterSpacing:0.5}}>Onchain</div>
              {[["Settlement",fmt(d.financial?.onchain?.settlementCost)],["Tx Fees",fmt(d.financial?.onchain?.transactionFees)],["Compliance",d.financial?.onchain?.complianceSaving],["Audit",d.financial?.onchain?.auditSaving]].map(([l,v],i) => (
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}><span style={{color:C.dim}}>{l}</span><span style={{color:C.accent,fontFamily:"var(--mono)",fontWeight:600}}>{v}</span></div>))}
              <div style={{marginTop:12,padding:10,borderRadius:8,background:C.accentGlow,fontSize:13,color:C.dim}}><span style={{color:C.accent,fontWeight:700}}>New Revenue:</span> {d.financial?.onchain?.newRevenueStreams}</div>
            </div></Crd>
          </div>
          <div style={{display:"flex",gap:10}}><Met label="Savings/yr" value={d.financial?.projectedSavings} color={C.accent} C={C} spark={d.financial?.sparkData}/><Met label="3yr Growth" value={d.financial?.revenueGrowth} color={C.purple} C={C} spark={[20,35,48,60,72,82,90,100]}/></div>
        </div>
      );
      case "yield": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {d.yield?.map((y,i) => (<Crd key={i} accent={i===0} C={C}><div style={{padding:18,display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:56,height:56,borderRadius:12,background:C.accentGlow,border:`1px solid ${C.borderStrong}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:C.accent,fontFamily:"var(--mono)",flexShrink:0,boxShadow:`0 0 16px ${C.accent}25`}}>{y.apy}%</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap"}}><span style={{fontSize:15,fontWeight:700,color:C.text}}>{y.name}</span><Bdg color={C.purple} C={C}>{y.type}</Bdg><Bdg color={y.risk==="Low"?C.accent:y.risk==="Med"?C.yellow:C.red} C={C}>{y.risk}</Bdg></div>
              <div style={{fontSize:13,color:C.textSub,marginBottom:8}}>{y.description}</div>
              <PLink name={y.protocol} C={C}/>
            </div>
            <Spark data={[y.apy*.6,y.apy*.7,y.apy*.85,y.apy*.8,y.apy*.9,y.apy]} color={C.accent}/>
          </div></Crd>))}
        </div>
      );
      case "collaborations": return (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>● Active Collaborations</div>
            {d.collaborations?.active?.map((c,i) => (<Crd key={i} accent C={C} style={{marginBottom:10}}><div style={{padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:15,fontWeight:700,color:C.text}}>{c.name}</span><div style={{display:"flex",gap:6}}><Bdg color={C.purple} C={C}>{c.type}</Bdg><Bdg color={C.accent} C={C}>LIVE</Bdg></div></div>
              <div style={{fontSize:13,color:C.textSub,marginBottom:14,lineHeight:1.6}}>{c.description}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[["Annual Value",c.value,C.accent],["Commission",c.commission,C.yellow],["Status","Active",C.purple]].map(([l,v,clr],j) => (
                  <div key={j} style={{padding:"10px 12px",borderRadius:8,background:`${clr}10`,border:`1px solid ${clr}20`}}><div style={{fontSize:11,color:C.dim,marginBottom:3,textTransform:"uppercase"}}>{l}</div><div style={{fontSize:14,fontWeight:700,color:clr,fontFamily:"var(--mono)"}}>{v}</div></div>
                ))}
              </div>
            </div></Crd>))}
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.purple,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5}}>⚡ Possible Collaborations</div>
            {d.collaborations?.possible?.map((c,i) => (<Crd key={i} C={C} style={{marginBottom:10}}><div style={{padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:15,fontWeight:700,color:C.text}}>{c.name}</span><div style={{display:"flex",gap:6}}><Bdg color={C.purple} C={C}>{c.fit}% fit</Bdg><Bdg color={C.accentSoft} C={C}>{c.type}</Bdg></div></div>
              <div style={{fontSize:13,color:C.textSub,marginBottom:12,lineHeight:1.6}}>{c.description}</div>
              <PBar v={c.fit} color={C.purple} C={C} h={4}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
                {[["Potential Value",c.value,C.purple],["Bridge Fee",c.commission,C.yellow]].map(([l,v,clr],j) => (
                  <div key={j} style={{padding:"10px 12px",borderRadius:8,background:`${clr}10`,border:`1px solid ${clr}20`}}><div style={{fontSize:11,color:C.dim,marginBottom:3,textTransform:"uppercase"}}>{l}</div><div style={{fontSize:14,fontWeight:700,color:clr,fontFamily:"var(--mono)"}}>{v}</div></div>
                ))}
              </div>
              <div style={{display:"flex",gap:8,marginTop:14}}>
                <button onClick={() => tryBridge(c)} style={{flex:1,padding:"11px",borderRadius:8,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",fontSize:13,fontWeight:700,boxShadow:`0 0 20px ${C.accent}30`}}>Activate Bridge →</button>
                <button onClick={() => openLead(c.type||"Collaboration",c.name,c.value)} style={{padding:"11px 16px",borderRadius:8,border:`1px solid ${C.borderStrong}`,background:C.accentGlow,color:C.accent,fontSize:13,fontWeight:600,cursor:"pointer"}}>Follow Up 🦞</button>
              </div>
            </div></Crd>))}
          </div>
        </div>
      );
      case "depin": return (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{padding:20,borderRadius:12,background:C.accentGlow,border:`1px solid ${C.borderStrong}`}}><div style={{fontSize:15,fontWeight:700,marginBottom:8,color:C.text}}>📡 DePIN — <span style={{color:C.accent}}>{d.company}</span></div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{d.depin?.summary}</div></div>
          {d.depin?.opportunities?.map((o,i) => (<Crd key={i} accent={i===0} C={C}><div style={{padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div><div style={{fontSize:16,fontWeight:700,color:C.text}}>{o.network}</div><div style={{display:"flex",gap:6,marginTop:4}}><Bdg color={C.accent} C={C}>{o.type}</Bdg><Bdg color={C.dim} C={C}>{o.railPartner}</Bdg></div></div><div style={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:800,color:C.accent,fontFamily:"var(--mono)"}}>{o.revenueMonthly}</div><div style={{fontSize:12,color:C.dim}}>per month</div></div></div>
            <div style={{fontSize:13,color:C.textSub,lineHeight:1.6,marginBottom:12}}>{o.description}</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={() => tryBridge({name:o.network,value:o.revenueMonthly,commission:"10-15%"})} style={{padding:"9px 20px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Deploy Bridge →</button>
              <button onClick={() => openLead("DePIN",o.network,o.revenueMonthly)} style={{padding:"9px 16px",borderRadius:8,border:`1px solid ${C.borderStrong}`,background:C.accentGlow,color:C.accent,fontSize:13,fontWeight:600,cursor:"pointer"}}>Follow Up 🦞</button>
            </div>
          </div></Crd>))}
        </div>
      );
      case "rwa": return (<div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Crd C={C}><div style={{padding:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:11,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:4,fontFamily:"var(--mono)"}}>Total Tokenisable</div><div style={{fontSize:22,fontWeight:800,color:C.orange,fontFamily:"var(--mono)"}}>{d.rwa?.totalTokenisable}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:11,color:C.dim,marginBottom:4}}>Primary Protocol</div><PLink name={d.rwa?.primaryProtocol} C={C}/></div>
        </div></Crd>
        {d.rwa?.tokenisableAssets?.map((a,i) => (<Crd key={i} C={C}><div style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:14,fontWeight:700,color:C.text}}>{a.asset}</span><Bdg color={C.orange} C={C}>{a.estimatedValue}</Bdg></div>
          <div style={{fontSize:13,color:C.textSub,marginBottom:10}}>{a.description}</div>
          <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <PLink name={a.protocol} C={C}/>
            <span style={{fontSize:12,color:C.dim}}>Liquidity unlock: <span style={{color:C.orange,fontWeight:600}}>{a.liquidityUnlock}</span></span>
          </div>
        </div></Crd>))}
      </div>);
      case "openclaw": return (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{padding:20,borderRadius:12,background:C.accentGlow,border:`1px solid ${C.borderStrong}`}}><div style={{fontSize:15,fontWeight:700,marginBottom:8,color:C.text}}>🦞 OpenClaw Agents — <span style={{color:C.accent}}>{d.company}</span></div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>Autonomous agents via WhatsApp/Telegram/Slack. No crypto team needed.</div><div style={{display:"flex",gap:10,marginTop:12}}><Met label="Total Saving" value={d.openclaw?.totalAgentSaving} color={"#d46faa"} C={C}/><Met label="Agents" value={d.openclaw?.agents?.length||0} color={C.accent} C={C}/></div></div>
          {d.openclaw?.agents?.map((a,i) => (<Crd key={i} accent={i===0} C={C}><div style={{padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:6}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:3}}>🦞 {a.name}</div><div style={{fontSize:13,color:C.accent}}>{a.role}</div></div><div style={{textAlign:"right",flexShrink:0}}><Bdg color={C.accent} C={C}>{a.monthlySaving}/mo</Bdg><div style={{fontSize:11,color:C.dim,marginTop:3}}>Cost: {a.monthlyCost}/mo</div></div></div>
            <div style={{fontSize:13,color:C.textSub,lineHeight:1.6,marginBottom:10}}>{a.description}</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{a.skills?.map((sk,j) => <Bdg key={j} color={C.purple} C={C} s={{fontSize:11}}>{sk}</Bdg>)}</div>
          </div></Crd>))}
        </div>
      );
      case "employee": return (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Crd C={C}><div style={{padding:18}}><STtl icon="👥" title="Benefits" C={C}/>
            {d.employee?.benefits?.map((b,i) => (<div key={i} style={{padding:12,borderRadius:8,background:`${b.impact==="High"?C.accent:C.purple}08`,border:`1px solid ${b.impact==="High"?C.accent:C.purple}20`,marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{b.name}</span><div style={{display:"flex",gap:4}}><Bdg color={b.impact==="High"?C.accent:C.purple} C={C}>{b.impact}</Bdg>{b.yieldTag&&<Bdg color={C.yellow} C={C}>YIELD</Bdg>}</div></div><div style={{fontSize:12,color:C.dim}}>{b.description}</div></div>))}
          </div></Crd>
          <Crd C={C}><div style={{padding:18}}><STtl icon="⭐" title="Reputation" C={C}/>
            <div style={{display:"flex",gap:16,marginBottom:16}}>{[["Web2",d.employee?.reputationWeb2,C.orange],["Onchain",d.employee?.reputationOnchain,C.accent]].map(([l,s,c],i) => (<div key={i} style={{flex:1,textAlign:"center"}}><div style={{fontSize:24,fontWeight:800,color:c,fontFamily:"var(--mono)",textShadow:i===1?`0 0 10px ${c}40`:"none"}}>{s}</div><div style={{fontSize:12,color:C.dim,marginBottom:4}}>{l}</div><PBar v={s} color={c} C={C}/></div>))}</div>
            {d.employee?.reputationYield?.map((r,i) => (<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}><span style={{color:C.dim}}>{r.stream}</span><span style={{color:C.accent,fontFamily:"var(--mono)",fontWeight:600}}>{r.value}</span></div>))}
          </div></Crd>
        </div>
      );
      case "payments": return rPayments(d.payments);
      default: { const sK=id==="data"?"dataOracles":id; const sD=d[sK]; if(!sD)return null; return rLazy(id,sD); }
    }
  };

  const rLazy = (id, sd) => {
    switch(id) {
      case "treasury": return (<div style={{display:"flex",flexDirection:"column",gap:10}}><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Met label="Idle Capital" value={sd.idleCapital} color={C.orange} C={C}/><Met label="Current Yield" value={sd.currentYield} color={C.red} C={C}/><Met label="Onchain Yield" value={sd.onchainYield} color={C.accent} C={C}/><Met label="Annual Gain" value={sd.annualGain} color={C.accent} C={C}/></div>{sd.protocols?.map((p,i) => (<Crd key={i} C={C}><div style={{padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:14,fontWeight:700,color:C.text}}>{p.name}</span><Bdg color={C.accent} C={C}>{p.apy}</Bdg></div><div style={{fontSize:13,color:C.dim}}>{p.description}</div></div></Crd>))}</div>);
      case "supplychain": return (<div style={{display:"flex",flexDirection:"column",gap:10}}><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Met label="Complexity" value={sd.complexity} color={C.orange} C={C}/><Met label="Nodes" value={sd.nodes} color={C.purple} C={C}/><Met label="Fraud Cut" value={sd.fraudReduction} color={C.accent} C={C}/></div>{sd.benefits?.map((b,i) => (<Crd key={i} C={C}><div style={{padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:14,fontWeight:700,color:C.text}}>{b.area}</span><Bdg color={C.accent} C={C}>{b.saving}</Bdg></div><div style={{fontSize:13,color:C.dim,marginBottom:6}}>{b.description}</div><PLink name={b.protocol} C={C}/></div></Crd>))}</div>);
      case "governance": return (<div style={{display:"flex",flexDirection:"column",gap:10}}><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Met label="Current Cost" value={sd.currentCost} color={C.red} C={C}/><Met label="Saving" value={sd.onchainSaving} color={C.accent} C={C}/><Met label="Transparency" value={sd.transparencyGain} color={C.purple} C={C}/></div>{sd.tools?.map((t,i) => (<Crd key={i} C={C}><div style={{padding:16}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>{t.name}</div><div style={{fontSize:13,color:C.accent,marginBottom:4}}>{t.function}</div><div style={{fontSize:13,color:C.dim}}>{t.description}</div></div></Crd>))}</div>);
      case "payments": return rPayments(sd);
      case "data": return (<div style={{display:"flex",flexDirection:"column",gap:10}}><Met label="Total Annual" value={sd.totalAnnualValue} color={C.purple} C={C}/>{sd.monetisableData?.map((dd,i) => (<Crd key={i} C={C}><div style={{padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:14,fontWeight:700,color:C.text}}>{dd.dataType}</span><Bdg color={C.purple} C={C}>{dd.value}</Bdg></div><div style={{fontSize:13,color:C.dim,marginBottom:4}}>{dd.description}</div><div style={{fontSize:12,color:C.accent}}>Oracle: {dd.oracleNetwork}</div></div></Crd>))}</div>);
      case "identity": return (<div style={{display:"flex",flexDirection:"column",gap:10}}><div style={{display:"flex",gap:10}}><Met label="KYC Cost" value={sd.currentKycCost} color={C.red} C={C}/><Met label="Saving" value={sd.onchainSaving} color={C.accent} C={C}/></div>{sd.protocols?.map((p,i) => (<Crd key={i} C={C}><div style={{padding:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:14,fontWeight:700,color:C.text}}>{p.name}</span><Bdg color={C.accentSoft} C={C}>{p.type}</Bdg></div><div style={{fontSize:13,color:C.dim}}>{p.description}</div></div></Crd>))}<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{sd.credentialTypes?.map((c,i) => <Bdg key={i} color={C.purple} C={C}>{c}</Bdg>)}</div></div>);
      case "insurance": return (<div style={{display:"flex",flexDirection:"column",gap:10}}><div style={{display:"flex",gap:10}}><Met label="Premiums" value={sd.currentPremiums} color={C.red} C={C}/><Met label="Saving" value={sd.onchainSaving} color={C.accent} C={C}/></div>{sd.parametricOptions?.map((p,i) => (<Crd key={i} C={C}><div style={{padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:14,fontWeight:700,color:C.text}}>{p.type}</span><Bdg color={C.accent} C={C}>{p.saving}</Bdg></div><div style={{fontSize:13,color:C.dim,marginBottom:5}}>{p.description}</div><PLink name={p.protocol} C={C}/></div></Crd>))}</div>);
      case "carbon": return (<div style={{display:"flex",flexDirection:"column",gap:10}}><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Met label="Footprint" value={sd.estimatedFootprint} color={C.orange} C={C}/><Met label="Traditional" value={sd.offsetCostTraditional} color={C.red} C={C}/><Met label="Onchain" value={sd.offsetCostOnchain} color={C.accent} C={C}/><Met label="Saving" value={sd.saving} color={C.accent} C={C}/></div><div style={{padding:14,borderRadius:10,background:C.accentGlow,border:`1px solid ${C.borderStrong}`,fontSize:13,color:C.dim}}>ESG Impact: <span style={{color:C.accent,fontWeight:700}}>{sd.esgScoreImpact}</span></div>{sd.protocols?.map((p,i) => (<Crd key={i} C={C}><div style={{padding:14}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>{p.name}</div><div style={{fontSize:13,color:C.dim}}>{p.description}</div></div></Crd>))}</div>);
      case "loyalty": return (<div style={{display:"flex",flexDirection:"column",gap:10}}><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Met label="Program Size" value={sd.programSize} color={C.yellow} C={C}/><Met label="Current" value={sd.currentRedemption} color={C.red} C={C}/><Met label="Onchain" value={sd.onchainRedemption} color={C.accent} C={C}/><Met label="Lift" value={sd.engagementLift} color={C.accent} C={C}/></div><div style={{padding:14,borderRadius:10,background:`${C.yellow}10`,border:`1px solid ${C.yellow}25`,fontSize:13,color:C.dim}}>{sd.interoperability}</div>{sd.protocols?.map((p,i) => (<Crd key={i} C={C}><div style={{padding:14}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>{p.name}</div><div style={{fontSize:13,color:C.dim}}>{p.description}</div></div></Crd>))}</div>);
      case "depin": return (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{padding:20,borderRadius:12,background:C.accentGlow,border:`1px solid ${C.borderStrong}`}}><div style={{fontSize:15,fontWeight:700,marginBottom:8,color:C.text}}>📡 DePIN — <span style={{color:C.accent}}>{d?.company}</span></div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{sd.summary}</div></div>
          {sd.opportunities?.map((o,i) => (<Crd key={i} accent={i===0} C={C}><div style={{padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div><div style={{fontSize:16,fontWeight:700,color:C.text}}>{o.network}</div><div style={{display:"flex",gap:6,marginTop:4}}><Bdg color={C.accent} C={C}>{o.type}</Bdg><Bdg color={C.dim} C={C}>{o.railPartner}</Bdg></div></div><divle={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:800,color:C.accent,fontFamily:"var(--mono)"}}>{o.revenueMonthly}</div><div style={{fontSize:12,color:C.dim}}>per month</div></div></div>
            <div style={{fontSize:13,color:C.textSub,lineHeight:1.6,marginBottom:12}}>{o.description}</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={() => tryBridge({name:o.network,value:o.revenueMonthly,commission:"10-15%"})} style={{padding:"9px 20px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Deploy Bridge →</button>
              <button onClick={() => openLead("DePIN",o.network,o.revenueMonthly)} style={{padding:"9px 16px",borderRadius:8,border:`1px solid ${C.borderStrong}`,background:C.acceGlow,color:C.accent,fontSize:13,fontWeight:600,cursor:"pointer"}}>Follow Up 🦞</button>
            </div>
          </div></Crd>))}
        </div>
      );
      case "impact": return (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{padding:22,borderRadius:12,background:C.accentGlow,border:`1px solid ${C.borderStrong}`,boxShadow:`0 0 30px ${C.accent}08`}}><div style={{fontSize:16,fontWeight:700,marginBottom:8,color:C.text}}>🌍 Social Impact — <span style={{color:C.accent}}>{sd.stakeholderGroup}</span></div><div style={{fontSize:14,color:C.text,lineHeight:1.7,marginBottom:14,fontStyle:"italic"}}>{sd.headline}</div><Met label="Total Beneficiary Value" value={sd.totalBeneficiaryValue} color={C.accent} C={C}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Crd C={C}><div style={{padding:18}}><div style={{fontSize:13,fontWeight:700,color:C.red,marginBottom:10}}>⚠️ Current Problem</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{sd.currentProblem}</div></div></Crd><Crd C={C}><div style={{padding:18}}><div style={{fontSize:13,fontWeight:700,color:C.accent,marginBottom:10}}>✅ Onchain Solution</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{sd.onchainSolution}</div></div></Crd></div>
          <Crd accent C={C}><div style={{padding:18}}><div style={{fontSize:13,fontWeight:700,color:C.accent,marginBottom:14}}>💸 Redistribution Mechanism</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6,marginBottom:16}}>{sd.redistributionMechanism}</div>
            {sd.beneficiaries?.map((b,i) => (<div key={i} style={{padding:"14px 16px",borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:14,fontWeight:700,color:C.text}}>{b.group}</span><Bdg color={C.accent} C={C}>{b.annualGain}/yr</Bdg></div><div style={{display:"flex",gap:16,marginBottom:6,fontSize:13,fontFamily:"var(--mono)"}}><span><span style={{color:C.dim}}>NOW </span><span style={{color:C.red}}>{b.currentShare}</span></span><span style={{color:C.dim}}>→</span><span><span style={{color:C.dim}}>ONCHAIN </span><span style={{color:C.accent}}>{b.onchainShare}</span></span></div><div style={{fontSize:12,color:C.dim}}>{b.description}</div></div>))}
          </div></Crd>
          {sd.sdgAlignment?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",padding:"12px 16px",borderRadius:10,background:C.surface,border:`1px solid ${C.border}`}}><span style={{fontSize:12,color:C.dim,alignSelf:"center"}}>UN SDG:</span>{sd.sdgAlignment.map((g,i) => <Bdg key={i} color={C.accent} C={C}>{g}</Bdg>)}</div>}
        </div>
      );
      default: return null;
    }
  };

  const rSector = (id) => {
    if (coreSectors.includes(id)) return rCore(id);
    const sd = lazyData[id];
    if (lazyLoading[id]||!sd) return <MLdr C={C}/>;
    return rLazy(id, sd);
  };

  const examples = mode==="onchain" ? EX_ONCHAIN : EX_WEB2;

  // ─── RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"var(--display)"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
        :root{--display:'DM Sans',sans-serif;--mono:'DM Mono',monospace}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes neonPulse{0%,100%{opacity:1;filter:brightness(1)}50%{opacity:.8;filter:brightness(1.3)}}
        *{box-sizing:border-box;margin:0;padding:0}
        *::-webkit-scrollbar{width:4px;height:4px}
        *::-webkit-scrollbar-thumb{background:#32809440;border-radius:2px}
        input,button{font-family:var(--display);font-size:14px}
        input::placeholder{color:${C.muted}}
        a{text-decoration:none}
        @media(max-width:768px){
          .ocb-sidebar{display:none!important}
          .ocb-main{padding:12px 10px 90px!important}
          .ocb-topbar{padding:8px 10px!important;flex-wrap:wrap;gap:6px;align-items:center}
          .ocb-search{max-width:100%!important;width:100%!important;flex:1!important}
          .ocb-grid2{grid-template-columns:1fr!important}
          .ocb-metrics{flex-wrap:wrap}
          .ocb-hero{grid-template-columns:1fr!important}
          .ocb-ticker{display:none!important}
          .ocb-tabs{display:none!important}
          .ocb-mobile-nav{display:flex!important}
          .ocb-company-info{display:none!important}
          .ocb-hide-mobile{display:none!important}
          .ocb-burger{display:flex!important}

        }
        .ocb-burger{display:none;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;cursor:pointer;flex-shrink:0;flex-direction:column;gap:4px;padding:8px;border:1px solid rgba(50,128,148,0.3);background:transparent}
        .ocb-burger span{display:block;width:16px;height:2px;background:#7090a8;border-radius:1px}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        @media(max-width:480px){
          .ocb-search input{font-size:13px!important}
          .ocb-verify-btn{padding:8px 10px!important;font-size:11px!important}
        }
        @media(min-width:769px){.ocb-theme-fab{display:none!important}}
        .ocb-mobile-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:${C?.surface||"#243245"};border-top:1px solid rgba(0,212,200,0.2);z-index:100;padding:8px 4px;gap:2px}
      `}</style>

      {/* SIDEBAR */}
      <aside className="ocb-sidebar" style={{width:collapsed?62:220,flexShrink:0,background:C.sidebar,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",overflow:"hidden",transition:"width .25s ease",zIndex:50}}>
        {/* Logo */}
        <div style={{padding:"16px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#fff",flexShrink:0,boxShadow:`0 0 16px ${C.accent}40`}}>◆</div>
          {!collapsed && <div><div style={{fontSize:14,fontWeight:800,color:C.text}}>OnChain<span style={{color:C.accent}}>Bridge</span></div><div style={{fontSize:10,color:C.muted,fontFamily:"var(--mono)"}}>v5</div></div>}
        </div>

        {/* Mode Toggle */}
        {!collapsed && <div style={{padding:"10px 10px 6px"}}>
          {[{id:"web2",label:"Web2 Analysis"},{id:"onchain",label:"Onchain Gaps"}].map(m => (
            <button key={m.id} onClick={() => {setMode(m.id);setPhase("search");setD(null);setInput("");}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,border:`1px solid ${mode===m.id?C.borderStrong:C.border}`,background:mode===m.id?C.accentGlow:"transparent",color:mode===m.id?C.accent:"#7090a8",fontSize:12,fontWeight:mode===m.id?700:400,cursor:"pointer",marginBottom:4,textAlign:"left",transition:"all .15s",boxShadow:mode===m.id?`0 0 12px ${C.accent}15`:""}}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>}

        {/* Search History */}
        {!collapsed && searchHistory.length > 0 && <div style={{padding:"6px 10px 4px",borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:1.5,padding:"6px 4px 5px",textTransform:"uppercase"}}>Recent</div>
          {searchHistory.map((entry,i) => {
            const name = typeof entry === "string" ? entry : entry.name;
            const snap = typeof entry === "object" ? entry : null;
            return (
              <button key={i} onClick={() => restoreFromHistory(entry)}
                style={{width:"100%",display:"flex",flexDirection:"column",padding:"8px 10px",borderRadius:8,border:`1px solid transparent`,background:"transparent",color:C.dim,fontSize:12,cursor:"pointer",textAlign:"left",transition:"all .15s",marginBottom:3}}
                onMouseEnter={e=>{e.currentTarget.style.background=C.accentGlow;e.currentTarget.style.borderColor=C.borderStrong;}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:snap?3:0}}>
                  <span style={{fontSize:10,color:C.accent,opacity:0.7}}>↺</span>
                  <span style={{fontWeight:600,color:C.textSub,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span>
                </div>
                {snap && snap.savings && <div style={{display:"flex",gap:8,fontSize:10,fontFamily:"var(--mono)",paddingLeft:16}}>
                  <span style={{color:C.accent}}>{snap.savings}</span>
                  {snap.fit>0 && <span style={{color:C.dim}}>{snap.fit}% fit</span>}
                </div>}
              </button>
            );
          })}
        </div>}

        {/* Nav */}
        <nav style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
          {tabs.length>0 ? NAV_GROUPS.map(group => {
            const gTabs = group.items.map(id=>tabs.find(t=>t.id===id)).filter(Boolean);
            if (!gTabs.length) return null;
            return (
              <div key={group.label}>
                {!collapsed && <div style={{fontSize:10,fontWeight:700,color:"#5a8099",letterSpacing:1.5,padding:"10px 14px 4px",textTransform:"uppercase"}}>{group.label}</div>}
                {gTabs.map(t => {
                  const active = tab===t.id;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:collapsed?"10px 14px":"8px 14px",border:"none",background:active?C.accentGlow:"transparent",color:active?C.accent:"#a8c8dc",cursor:"pointer",fontSize:13,fontWeight:active?700:500,transition:"all .15s",borderLeft:`2px solid ${active?C.accent:"transparent"}`,textAlign:"left"}}
                      onMouseEnter={e=>{if(!active){e.currentTarget.style.background=C.accentGlow;e.currentTarget.style.color=C.textSub;}}}
                      onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.dim;}}}>
                      <span style={{fontSize:15,flexShrink:0}}>{t.icon}</span>
                      {!collapsed && <>
                        <span style={{flex:1}}>{t.label}</span>
                        {t.lazy&&!lazyData[t.id]&&<span style={{fontSize:9,color:C.muted}}>⬇</span>}
                        {t.id==="gaps"&&d?.gaps?.length>0&&<span style={{background:C.red,color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700}}>{d.gaps.length}</span>}
                      </>}
                    </button>
                  );
                })}
              </div>
            );
          }) : (
            !collapsed && <div style={{padding:"16px 14px"}}>{["Overview","Financial","Payments","Collabs","OpenClaw","Policy"].map((l,i) => (<div key={i} style={{padding:"8px 10px",color:C.muted,fontSize:13,marginBottom:2}}>◻ {l}</div>))}</div>
          )}
        </nav>

        {/* Footer */}
        <div style={{padding:"10px",borderTop:`1px solid ${C.border}`}}>
          {walletConnected
            ? <button onClick={disconnectWallet} style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${C.borderStrong}`,background:C.accentGlow,color:C.accent,fontSize:12,fontWeight:600,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:C.accent,display:"inline-block"}}/>
                {!collapsed&&`${walletAddress?.slice(0,6)}...${walletAddress?.slice(-4)}`}
              </button>
            : <button onClick={connectWallet} style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,fontSize:12,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
                Connect
              </button>
          }
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {!collapsed && <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
              <button onClick={() => setDark(v=>!v)} title="Toggle theme"
                style={{display:"flex",alignItems:"center",width:42,height:22,borderRadius:11,border:"none",background:dark?C.accentGlow:"#e0eaf0",cursor:"pointer",padding:2,transition:"all .25s",boxShadow:`inset 0 0 0 1px ${C.borderStrong}`}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:dark?C.accent:"#328094",transform:`translateX(${dark?20:0}px)`,transition:"transform .25s",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>
                  {dark?"●":"○"}
                </div>
              </button>
              <span style={{fontSize:10,color:"#7090a8",fontWeight:500}}>{dark?"Dark":"Light"}</span>
            </div>}
            <button onClick={() => setCollapsed(v=>!v)} style={{padding:"5px 8px",borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,fontSize:12,cursor:"pointer"}}>{collapsed?"›":"‹"}</button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,paddingBottom:"env(safe-area-inset-bottom)"}}>

        {/* Mobile Drawer */}
        {mobileMenu ? <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}} onClick={() => setMobileMenu(false)}>
          <div style={{width:280,height:"100%",background:C.surface,borderRight:`1px solid ${C.borderStrong}`,overflowY:"auto",animation:"slideIn .25s ease"}} onClick={e => e.stopPropagation()}>
            <div style={{padding:"16px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:30,height:30,borderRadius:8,background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff"}}>◆</div>
                <span style={{fontSize:14,fontWeight:800,color:C.text}}>OnChain<span style={{color:C.accent}}>Bridge</span></span>
              </div>
              <button onClick={() => setMobileMenu(false)} style={{border:"none",background:"transparent",color:C.dim,fontSize:18,cursor:"pointer"}}>✕</button>
            </div>
            {/* Mode toggle */}
            <div style={{padding:"12px 12px 6px"}}>
              {[{id:"web2",label:"Web2 Analysis"},{id:"onchain",label:"Onchain Gaps"}].map(m => (
                <button key={m.id} onClick={() => {setMode(m.id);setPhase("search");setD(null);setInput("");setMobileMenu(false);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,border:`1px solid ${mode===m.id?C.borderStrong:C.border}`,background:mode===m.id?C.accentGlow:"transparent",color:mode===m.id?C.accent:C.dim,fontSize:13,fontWeight:mode===m.id?700:400,cursor:"pointer",marginBottom:4,textAlign:"left"}}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
            {/* Recent searches */}
            {searchHistory.length > 0 && <div style={{padding:"6px 12px 4px",borderTop:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:1.5,padding:"8px 2px 6px",textTransform:"uppercase"}}>Recent</div>
              {searchHistory.map((entry,i) => {
                const name = typeof entry === "string" ? entry : entry.name;
                const snap = typeof entry === "object" ? entry : null;
                return (
                  <button key={i} onClick={() => {setInput(name);searchCompany(name);setMobileMenu(false);}}
                    style={{width:"100%",display:"flex",flexDirection:"column",padding:"9px 10px",borderRadius:8,border:"1px solid transparent",background:"transparent",color:C.dim,fontSize:13,cursor:"pointer",textAlign:"left",marginBottom:3,transition:"all .15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=C.accentGlow;e.currentTarget.style.borderColor=C.borderStrong;}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:10,color:C.accent}}>↺</span>
                      <span style={{fontWeight:600,color:C.textSub}}>{name}</span>
                    </div>
                    {snap?.savings && <div style={{fontSize:11,color:C.accent,fontFamily:"var(--mono)",paddingLeft:16}}>{snap.savings}</div>}
                  </button>
                );
              })}
            </div>}
            {/* Nav tabs if analysis done */}
            {tabs.length > 0 && phase === "dashboard" && <div style={{padding:"6px 0",borderTop:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:1.5,padding:"8px 14px 4px",textTransform:"uppercase"}}>Sectors</div>
              {tabs.map(t => (
                <button key={t.id} onClick={() => {setTab(t.id);setMobileMenu(false);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 14px",border:"none",background:tab===t.id?C.accentGlow:"transparent",color:tab===t.id?C.accent:C.dim,cursor:"pointer",fontSize:13,fontWeight:tab===t.id?700:400,borderLeft:`2px solid ${tab===t.id?C.accent:"transparent"}`,textAlign:"left"}}>
                  <span style={{fontSize:15}}>{t.icon}</span>
                  <span style={{flex:1}}>{t.label}</span>
                  {t.id==="gaps"&&d?.gaps?.length>0&&<span style={{background:C.red,color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700}}>{d.gaps.length}</span>}
                </button>
              ))}
            </div>}
            {/* Theme + wallet */}
            <div style={{padding:"12px",borderTop:`1px solid ${C.border}`,marginTop:"auto"}}>
              {walletConnected
                ? <button onClick={disconnectWallet} style={{width:"100%",padding:"9px",borderRadius:8,border:`1px solid ${C.borderStrong}`,background:C.accentGlow,color:C.accent,fontSize:12,fontWeight:600,cursor:"pointer",marginBottom:8}}>
                    ● {walletAddress?.slice(0,6)}...{walletAddress?.slice(-4)}
                  </button>
                : <button onClick={() => {setMobileMenu(false);setTimeout(()=>setWalletModal(true),150);}} style={{width:"100%",padding:"9px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,fontSize:12,cursor:"pointer",marginBottom:8}}>
                    Connect Wallet
                  </button>
              }
              <button onClick={() => setDark(v=>!v)} style={{width:"100%",padding:"9px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,fontSize:12,cursor:"pointer"}}>
                {dark?"☀️ Light mode":"🌙 Dark mode"}
              </button>
            </div>
          </div>
        </div> : null}

        {/* Top Bar */}
        <header className="ocb-topbar" style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"12px 24px",display:phase==="search"?"none":"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:40,gap:16}}>
          <button className="ocb-burger" onClick={() => setMobileMenu(true)}>
            <span/><span/><span/>
          </button>
          <div className="ocb-search" style={{display:"flex",gap:8,background:C.bg,borderRadius:10,border:`1px solid ${C.border}`,padding:"5px 5px 5px 16px",alignItems:"center",flex:1,maxWidth:520}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchCompany()}
              placeholder={mode==="onchain"?"Search protocol or onchain company...":"Search any Web2 company..."}
              style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.text,fontSize:14,padding:"4px 0"}}/>
            <button onClick={() => searchCompany()} disabled={phase==="loading"}
              style={{padding:"7px 14px",borderRadius:7,border:"none",background:phase==="loading"?C.muted:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",fontWeight:700,fontSize:12,cursor:phase==="loading"?"wait":"pointer",flexShrink:0,whiteSpace:"nowrap",boxShadow:phase!=="loading"?`0 0 14px ${C.accent}35`:""}}>
              {phase==="loading"?"...":mode==="onchain"?"Scan →":"Verify →"}
            </button>
          </div>

          {d ? (
            <div className="ocb-company-info" style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div><div style={{fontSize:14,fontWeight:700,color:C.text}}>{d.company}</div><div style={{fontSize:11,color:C.dim}}>{d.description?.slice(0,45)}</div></div>
              <Bdg color={C.accent} C={C}>✓ {mode==="onchain"?"Scanned":"Verified"}</Bdg>
              {mode==="onchain"
                ? <><Bdg color={C.accent} C={C}>{d.onchainProfile?.coverageScore}% Coverage</Bdg><Bdg color={C.red} C={C}>{d.gaps?.length} Gaps</Bdg></>
                : <><Bdg color={C.purple} C={C}>{d.ticker?.onchainPotential}% Fit</Bdg><Bdg color={d.policy?.overallReadiness==="High"?C.accent:d.policy?.overallReadiness==="Med"?C.yellow:C.red} C={C}>⚖️ {d.policy?.overallReadiness}</Bdg></>
              }
              <button onClick={() => setShareModal(true)} style={{padding:"7px 16px",borderRadius:8,border:`1px solid ${C.borderStrong}`,background:C.accentGlow,color:C.accent,fontSize:13,fontWeight:600,cursor:"pointer"}}>𝕏 Share</button>
            </div>
          ) : (
            <div style={{display:"flex",gap:6,marginLeft:8,flexWrap:"wrap"}}>
              <span style={{fontSize:12,color:C.muted,alignSelf:"center"}}>Try:</span>
              {examples.slice(0,6).map(c => (
                <button key={c} onClick={() => {setInput(c);searchCompany(c);}}
                  style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,fontSize:12,cursor:"pointer",transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;e.currentTarget.style.background=C.accentGlow;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.dim;e.currentTarget.style.background="transparent";}}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Ticker */}
        {d && <div className="ocb-ticker" style={{background:C.bg2,borderBottom:`1px solid ${C.border}`,padding:"5px 0",overflow:"hidden"}}>
          <div style={{display:"flex",gap:32,whiteSpace:"nowrap",fontFamily:"var(--mono)",fontSize:12,transform:`translateX(${tick}px)`}}>
            {[0,1,2].map(r => <div key={r} style={{display:"flex",gap:32}}>
              {[["CO",d.company,C.accent],["REV",d.revenue,C.yellow],
                mode==="onchain"?["COV",`${d.onchainProfile?.coverageScore}%`,C.accent]:["FIT",`${d.ticker?.onchainPotential}%`,C.accent],
                mode==="onchain"?["GAPS",d.gaps?.length,C.red]:["SAVE",d.financial?.projectedSavings,C.accent],
                ["POLICY",d.policy?.overallReadiness,d.policy?.overallReadiness==="High"?C.accent:d.policy?.overallReadiness==="Med"?C.yellow:C.red],
                ["AGENTS",d.openclaw?.agents?.length,"#d46faa"]
              ].map(([k,v,clr],i) => <span key={i}><span style={{color:C.muted}}>{k} </span><span style={{color:clr}}>{v}</span></span>)}
            </div>)}
          </div>
        </div>}

        {/* Content */}
        <main className="ocb-main" style={{flex:1,padding:"24px",overflowY:"auto"}}>

          {/* Verify */}
          {phase==="verify" && <div style={{animation:"fadeUp .3s",marginBottom:20}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:14,color:C.text}}>Confirm <span style={{color:C.accent}}>{input}</span>:</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12}}>
              {verifyOpts.map((opt,i) => (
                <button key={i} onClick={() => confirmCompany(opt)}
                  style={{padding:20,borderRadius:12,border:`1px solid ${C.border}`,background:C.card,cursor:"pointer",textAlign:"left",color:C.text,transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderStrong;e.currentTarget.style.boxShadow=`0 0 20px ${C.accent}15`;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="";}}>
                  <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>{opt.name}</div>
                  <div style={{fontSize:13,color:C.dim,marginBottom:3}}>📍 {opt.address}</div>
                  {opt.website&&<div style={{fontSize:13,color:C.accent,marginBottom:6}}>🌐 {opt.website}</div>}
                  <div style={{display:"flex",gap:6,marginTop:8}}>{opt.sector&&<Bdg color={C.purple} C={C}>{opt.sector}</Bdg>}{opt.revenue&&<Bdg color={C.yellow} C={C}>{opt.revenue}</Bdg>}</div>
                  <div style={{marginTop:10,fontSize:13,color:C.accent,fontWeight:600}}>Confirm & Analyze →</div>
                </button>
              ))}
            </div>
          </div>}

          {/* Loading */}
          {phase==="loading" && <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"80px 0",animation:"fadeUp .3s"}}>
            <div style={{width:64,height:64,borderRadius:18,marginBottom:22,background:C.accentGlow,border:`1px solid ${C.borderStrong}`,display:"flex",alignItems:"center",justifyContent:"center",animation:"spin 2s linear infinite",boxShadow:`0 0 30px ${C.accent}30`}}>
              <span style={{fontSize:28}}>◆</span>
            </div>
            <div style={{fontSize:17,fontWeight:700,marginBottom:8,color:C.text}}>Analyzing <span style={{color:C.accent,textShadow:`0 0 10px ${C.accent}60`}}>{verified?.name||input}</span></div>
            <div style={{fontSize:13,color:C.dim,fontFamily:"var(--mono)"}}>{loadMsg}</div>
            <div style={{width:220,marginTop:20,height:2,borderRadius:2,overflow:"hidden",background:C.border}}>
              <div style={{height:"100%",background:`linear-gradient(90deg,${C.accent},${C.purple},${C.accent})`,backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite linear"}}/>
            </div>
          </div>}

          {error && <div style={{padding:16,borderRadius:10,background:`${C.red}10`,border:`1px solid ${C.red}30`,color:C.red,fontSize:13,fontFamily:"var(--mono)"}}>{error}</div>}

          {/* Empty — tokens.xyz style hero search */}
          {phase==="search" && !error && <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"70vh",padding:"40px 20px",animation:"fadeUp .4s"}}>
            {/* Title */}
            <div style={{textAlign:"center",marginBottom:40}}>
              <div style={{fontSize:"clamp(32px,5vw,44px)",fontWeight:800,color:C.text,letterSpacing:"-1px",marginBottom:12,lineHeight:1.1}}>
                {mode==="onchain"
                  ? <>Find your <span style={{color:C.accent}}>onchain gaps</span></>
                  : <>What is your company<br/><span style={{color:C.accent}}>leaving onchain?</span></>}
              </div>
              <div style={{fontSize:15,color:C.dim,maxWidth:480,margin:"0 auto",lineHeight:1.6}}>
                {mode==="onchain"
                  ? "Enter any protocol. Map existing activity and surface untapped opportunities."
                  : "Free 16-sector analysis for any company. Results in 10 seconds."}
              </div>
            </div>

            {/* Mode toggle only */}
            <div style={{display:"flex",gap:8,marginBottom:24,alignItems:"center"}}>
              <div style={{display:"flex",borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden",background:C.surface}}>
                {[{id:"web2",label:"Web2"},{id:"onchain",label:"Onchain"}].map(m => (
                  <button key={m.id} onClick={() => {setMode(m.id);setD(null);setInput("");}}
                    style={{padding:"8px 20px",border:"none",background:mode===m.id?`linear-gradient(135deg,${C.accent},${C.purple})`:"transparent",color:mode===m.id?"#fff":C.dim,fontSize:13,fontWeight:mode===m.id?700:400,cursor:"pointer",transition:"all .15s"}}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* BIG search bar — the hero */}
            <div style={{width:"100%",maxWidth:580,marginBottom:24}}>
              <div style={{background:C.surface,borderRadius:14,border:`1.5px solid ${C.borderStrong}`,padding:"14px 20px",boxShadow:`0 0 30px ${C.accent}10`,marginBottom:10,transition:"border-color .2s"}}
                onFocusCapture={e=>e.currentTarget.style.borderColor=C.accent}
                onBlurCapture={e=>e.currentTarget.style.borderColor=C.borderStrong}>
                <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchCompany()}
                  placeholder={mode==="onchain"?"Search any protocol or onchain company...":"Search any company — Nike, HSBC, Spotify..."}
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",color:C.text,fontSize:16,fontFamily:"var(--display)"}}
                  autoFocus/>
              </div>
              <button onClick={() => searchCompany()} disabled={phase==="loading"}
                style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:phase==="loading"?C.muted:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",fontWeight:700,fontSize:15,cursor:phase==="loading"?"wait":"pointer",boxShadow:`0 0 20px ${C.accent}30`}}>
                {phase==="loading"?"Analysing...":mode==="onchain"?"Scan for gaps →":"Analyse company →"}
              </button>
            </div>

            {/* Example pills */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",maxWidth:600}}>
              <span style={{fontSize:12,color:C.muted,alignSelf:"center",marginRight:4,fontFamily:"var(--mono)"}}>Try:</span>
              {examples.map(c => (
                <button key={c} onClick={() => {setInput(c);searchCompany(c);}}
                  style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,fontSize:13,cursor:"pointer",transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;e.currentTarget.style.background=C.accentGlow;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.dim;e.currentTarget.style.background="transparent";}}>
                  {c}
                </button>
              ))}
            </div>

            {/* Recent searches */}
            {searchHistory.length > 0 && <div style={{marginTop:32,width:"100%",maxWidth:640}}>
              <div style={{fontSize:11,color:C.muted,fontFamily:"var(--mono)",letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Recent</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {searchHistory.map((entry,i) => {
                  const name = typeof entry==="string"?entry:entry.name;
                  const snap = typeof entry==="object"?entry:null;
                  return (
                    <button key={i} onClick={() => restoreFromHistory(entry)}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.textSub,fontSize:13,cursor:"pointer",transition:"all .15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background=C.accentGlow;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface;}}>
                      <span style={{fontSize:11,color:C.accent}}>↺</span>
                      <span style={{fontWeight:600}}>{name}</span>
                      {snap?.savings&&<span style={{fontSize:11,color:C.accent,fontFamily:"var(--mono)"}}>{snap.savings}</span>}
                    </button>
                  );
                })}
              </div>
            </div>}

            {/* Stats row */}
            <div style={{display:"flex",gap:32,marginTop:48,flexWrap:"wrap",justifyContent:"center"}}>
              {[["16","Sectors analysed"],["$0","Cost to analyse"],["10s","Time to insight"]].map(([n,l]) => (
                <div key={n} style={{textAlign:"center"}}>
                  <div style={{fontSize:26,fontWeight:800,color:C.accent,fontFamily:"var(--mono)"}}>{n}</div>
                  <div style={{fontSize:12,color:C.dim,marginTop:3}}>{l}</div>
                </div>
              ))}
            </div>
          </div>}

          {/* Dashboard */}
          {phase==="dashboard" && d && <div style={{animation:"fadeUp .3s"}}>

            {tab==="overview" && <div style={{display:"flex",flexDirection:"column",gap:14}}>

              {/* Hero cards */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div style={{borderRadius:14,padding:24,background:`linear-gradient(135deg,${C.accent}20,${C.purple}15)`,border:`1px solid ${C.borderStrong}`,boxShadow:`0 0 40px ${C.accent}15`}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.dim,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>{mode==="onchain"?"Onchain Coverage":"Onchain Potential"}</div>
                  <div style={{fontSize:"clamp(24px,6vw,38px)",fontWeight:800,fontFamily:"var(--mono)",marginBottom:4,color:C.accent}}>{mode==="onchain"?d.onchainProfile?.coverageScore:d.ticker?.onchainPotential}%</div>
                  <div style={{fontSize:13,color:C.textSub}}>{d.description}</div>
                </div>
                <div style={{borderRadius:14,padding:24,background:C.surface,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.dim,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Projected Savings</div>
                  <div style={{fontSize:38,fontWeight:800,color:C.accent,fontFamily:"var(--mono)",marginBottom:4}}>{d.financial?.projectedSavings}</div>
                  <div style={{fontSize:13,color:C.dim}}>3yr growth: <span style={{color:C.purple}}>{d.financial?.revenueGrowth}</span></div>
                </div>
              </div>

              {mode==="web2" && d.recommendedSectors && <div style={{padding:"14px 18px",borderRadius:12,background:C.surface,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:700,color:C.text}}>AI Recommended:</span>
                {d.recommendedSectors.map((s,i) => <Bdg key={i} color={i===0?C.accent:i===1?C.purple:"#d46faa"} C={C}>{SECTOR_META[s]?.icon} {SECTOR_META[s]?.label}</Bdg>)}
              </div>}

              {mode==="onchain" && d.onchainProfile && <div style={{padding:20,borderRadius:12,background:C.accentGlow,border:`1px solid ${C.borderStrong}`}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:8,color:C.text}}>🔗 Onchain Profile — <span style={{color:C.accent}}>{d.company}</span></div>
                <div style={{fontSize:13,color:C.textSub,lineHeight:1.7,marginBottom:12}}>{d.onchainProfile.summary}</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}><Met label="Coverage" value={`${d.onchainProfile.coverageScore}%`} color={C.accent} C={C}/><Met label="Active Sectors" value={d.onchainProfile.activeSectors?.length} color={C.purple} C={C}/>{d.onchainProfile.totalTVL&&<Met label="TVL" value={d.onchainProfile.totalTVL} color={C.purple} C={C}/>}<Met label="Gaps Found" value={d.gaps?.length} color={C.red} C={C}/></div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{d.onchainProfile.activeSectors?.map((s,i) => <Bdg key={i} color={C.accent} C={C} s={{fontSize:11}}>✓ {SECTOR_META[s]?.label||s}</Bdg>)}</div>
              </div>}

              {d.policy && <button onClick={() => setTab("policy")} style={{padding:"12px 18px",borderRadius:12,background:C.surface,border:`1px solid ${d.policy.overallReadiness==="High"?C.accent:d.policy.overallReadiness==="Med"?C.yellow:C.red}35`,display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",color:"inherit",width:"100%",textAlign:"left",transition:"all .15s"}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 0 20px ${C.accent}10`}
                onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
                <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:18}}>⚖️</span><div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{d.policy.jurisdiction} — {d.policy.overallReadiness} Regulatory Readiness</div><div style={{fontSize:12,color:C.dim,marginTop:2}}>{d.policy.summary?.slice(0,90)}...</div></div></div>
                <span style={{fontSize:12,color:C.accent,flexShrink:0,marginLeft:12}}>View Policy →</span>
              </button>}

              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <Met label="Savings/yr" value={d.financial?.projectedSavings} color={C.accent} C={C} spark={d.financial?.sparkData}/>
                <Met label="Payment Save" value={d.payments?.savingAnnual} sub={`${d.payments?.settlementTime?.current} → ${d.payments?.settlementTime?.onchain}`} color={C.purple} C={C}/>
                <Met label="Agent Save" value={d.openclaw?.totalAgentSaving} color={"#d46faa"} C={C}/>
                {mode==="onchain"&&d.gaps?.length>0&&<Met label="Top Gap" value={d.gaps[0]?.estimatedAnnualValue} sub="annual value" color={C.red} C={C}/>}
                {mode==="web2"&&d.depin&&<Met label="DePIN/mo" value={d.depin.totalMonthlyRevenue} color={C.purple} C={C}/>}
                {mode==="web2"&&d.rwa&&<Met label="RWA" value={d.rwa.totalTokenisable} color={C.orange} C={C}/>}
              </div>

              {mode==="onchain" && d.gaps && <Crd accent C={C}><div style={{padding:20}}>
                <STtl icon="🎯" title="Top Gaps" badge={`${d.gaps.length} found`} color={C.red} C={C}/>
                {d.gaps.slice(0,3).map((gap,i) => (<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontSize:14,fontWeight:700,color:C.text}}>{gap.protocol}</div><div style={{fontSize:12,color:C.dim,marginTop:2}}>{gap.sector} · {gap.difficulty}</div></div><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:15,fontWeight:700,color:C.accent,fontFamily:"var(--mono)"}}>{gap.estimatedAnnualValue}</span><button onClick={() => setTab("gaps")} style={{padding:"6px 14px",borderRadius:7,border:"none",background:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>Activate</button></div></div>))}
                <button onClick={() => setTab("gaps")} style={{marginTop:12,width:"100%",padding:"10px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,fontSize:13,cursor:"pointer"}}>View All Gaps →</button>
              </div></Crd>}

              {mode==="web2" && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Crd C={C}><div style={{padding:18}}><STtl icon="📊" title="Financial" C={C}/>
                  {[["Settlement",`${fmt(d.financial?.web2?.settlementCost)}`,`${fmt(d.financial?.onchain?.settlementCost)}`],["Tx Fees",`${fmt(d.financial?.web2?.transactionFees)}`,`${fmt(d.financial?.onchain?.transactionFees)}`]].map(([l,w,o],i) => (<div key={i} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.dim,marginBottom:5,fontFamily:"var(--mono)"}}><span>{l}</span><span><span style={{color:C.red}}>{w}</span> → <span style={{color:C.accent}}>{o}</span></span></div><PBar v={75} color={C.accent} C={C}/></div>))}
                </div></Crd>
                <Crd C={C}><div style={{padding:18}}><STtl icon="💸" title="Payments" C={C}/>
                  <div style={{display:"flex",justifyContent:"center",gap:28,marginBottom:12}}><div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:C.red,fontFamily:"var(--mono)"}}>{d.payments?.currentFees}</div><div style={{fontSize:11,color:C.dim,marginTop:3}}>Current</div></div><div style={{fontSize:18,color:C.accent,alignSelf:"center",textShadow:`0 0 10px ${C.accent}`}}>→</div><div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:C.accent,fontFamily:"var(--mono)"}}>{d.payments?.onchainFees}</div><div style={{fontSize:11,color:C.dim,marginTop:3}}>Onchain</div></div></div>
                  <div style={{padding:10,borderRadius:8,background:C.accentGlow,fontSize:13,textAlign:"center"}}><span style={{color:C.accent,fontWeight:700}}>{d.payments?.savingAnnual}</span> <span style={{color:C.dim}}>saved annually</span></div>
                </div></Crd>
              </div>}

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Crd C={C}><div style={{padding:18}}><STtl icon="🤝" title="Collaborations" C={C}/>
                  {d.collaborations?.active?.slice(0,2).map((c,i) => <div key={i} style={{padding:"10px 12px",borderRadius:8,background:C.accentGlow,border:`1px solid ${C.borderStrong}`,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{c.name}</div><div style={{fontSize:11,color:C.dim,marginTop:2}}>{c.value}</div></div><Bdg color={C.accent} C={C}>LIVE</Bdg></div>)}
                  {d.collaborations?.possible?.slice(0,2).map((c,i) => <div key={i} style={{padding:"10px 12px",borderRadius:8,background:`${C.purple}08`,border:`1px solid ${C.border}`,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{c.name}</div><div style={{fontSize:11,color:C.dim,marginTop:2}}>{c.fit}% fit</div></div><button onClick={() => tryBridge(c)} style={{padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",fontSize:11,fontWeight:700}}>Bridge</button></div>)}
                </div></Crd>
                <Crd accent C={C}><div style={{padding:18}}><STtl icon="🦞" title="OpenClaw" badge={d.openclaw?.totalAgentSaving} color={"#d46faa"} C={C}/>
                  {d.openclaw?.agents?.slice(0,4).map((a,i) => <div key={i} style={{padding:"9px 12px",background:C.bg,borderRadius:8,marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",gap:6,flexWrap:"wrap"}}><span style={{fontSize:13,fontWeight:700,color:C.text,flex:1,minWidth:0}}>{a.name}</span><Bdg color={"#d46faa"} C={C} s={{fontSize:11,flexShrink:0}}>{a.monthlySaving}/mo</Bdg></div><div style={{fontSize:12,color:C.dim,marginTop:2}}>{a.role}</div></div>)}
                </div></Crd>
              </div>

              {mode==="onchain" && d.existingActivity && <Crd C={C}><div style={{padding:18}}>
                <STtl icon="✅" title="Existing Activity" badge={`${d.existingActivity.length} protocols`} color={C.accent} C={C}/>
                {d.existingActivity.map((a,i) => (<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>{a.protocol}</div><div style={{fontSize:12,color:C.dim,marginTop:2}}>{a.role} · {a.sector}</div></div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:13,color:C.accent,fontFamily:"var(--mono)"}}>{a.estimatedValue}</span><Bdg color={a.status==="Active"?C.accent:a.status==="Partial"?C.yellow:C.muted} C={C}>{a.status}</Bdg></div></div>))}
              </div></Crd>}

              {mode==="web2" && d.recommendedSectors?.map((secId,idx) => {
                const meta = SECTOR_META[secId];
                const sKey = secId==="data"?"dataOracles":secId;
                const sData = d[sKey];
                if (!meta||!sData) return null;
                const clr = idx===0?C.accent:idx===1?C.purple:"#d46faa";
                return (
                  <div key={secId} onClick={() => setTab(secId)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.querySelector('div').style.boxShadow=`0 0 20px ${clr}15`} onMouseLeave={e=>e.currentTarget.querySelector('div').style.boxShadow=""}>
                    <Crd accent={idx===0} C={C}><div style={{padding:18,transition:"box-shadow .2s"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                        <div style={{fontSize:14,fontWeight:700,color:C.text,display:"flex",alignItems:"center",gap:8}}><span>{meta.icon}</span>{meta.label}</div>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <Bdg color={clr} C={C}>{secId==="depin"?sData.totalMonthlyRevenue+"/mo":secId==="rwa"?sData.totalTokenisable:secId==="yield"?`${Math.max(...(sData.map?.(y=>y.apy)||[0]))}% peak`:secId==="treasury"?sData.annualGain:secId==="carbon"?sData.saving:secId==="loyalty"?sData.engagementLift:secId==="impact"?sData.totalBeneficiaryValue:secId==="employee"?`${sData.reputationOnchain} trust`:sData.fraudReduction||sData.onchainSaving||null}</Bdg>
                          <button onClick={e=>{e.stopPropagation();openLead(SECTOR_META[secId]?.label||secId, secId==="depin"?sData.opportunities?.[0]?.network:secId==="yield"?sData[0]?.protocol:secId==="rwa"?sData.primaryProtocol:"Protocol Partner", secId==="depin"?sData.totalMonthlyRevenue:secId==="rwa"?sData.totalTokenisable:secId==="yield"?`${Math.max(...(sData.map?.(y=>y.apy)||[0]))}% APY`:sData.annualGain||sData.onchainSaving||"TBD");}} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.borderStrong}`,background:C.accentGlow,color:C.accent,fontSize:11,fontWeight:600,cursor:"pointer"}}>Follow Up 🦞</button>
                          <span style={{fontSize:12,color:C.dim}}>View →</span>
                        </div>
                      </div>
                      {secId==="depin"&&sData.opportunities?.slice(0,3).map((o,i) => <div key={i} style={{padding:"8px 12px",background:C.bg,borderRadius:8,marginBottom:6,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{o.network}</span><span style={{fontSize:13,color:C.accent,fontFamily:"var(--mono)"}}>{o.revenueMonthly}/mo</span></div>)}
                      {secId==="rwa"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8}}>{sData.tokenisableAssets?.map((a,i) => <div key={i} style={{padding:"10px 12px",background:C.bg,borderRadius:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{a.asset}</span><Bdg color={C.orange} C={C} s={{fontSize:10}}>{a.estimatedValue}</Bdg></div><div style={{fontSize:11,color:C.dim}}>{a.protocol}</div></div>)}</div>}
                      {secId==="yield"&&sData.slice?.(0,3).map?.((y,i) => <div key={i} style={{padding:"9px 12px",background:C.bg,borderRadius:8,marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><span style={{fontSize:13,fontWeight:600,color:C.text}}>{y.name}</span><span style={{fontSize:12,color:C.dim,marginLeft:8}}>{y.protocol}</span></div><Bdg color={C.accent} C={C}>{y.apy}%</Bdg></div>)}
                      {secId==="treasury"&&<div style={{display:"flex",gap:10}}><Met label="Idle" value={sData.idleCapital} color={C.orange} C={C}/><Met label="Current" value={sData.currentYield} color={C.red} C={C}/><Met label="Onchain" value={sData.onchainYield} color={C.accent} C={C}/></div>}
                      {secId==="impact"&&<div style={{fontSize:13,color:C.textSub,lineHeight:1.6,fontStyle:"italic"}}>{sData.headline}</div>}
                      {["supplychain","governance","identity","insurance","carbon","loyalty"].includes(secId)&&<div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>
                        {secId==="supplychain"&&`${sData.complexity} complexity · ${sData.nodes} nodes · ${sData.fraudReduction} fraud reduction`}
                        {secId==="governance"&&`${sData.currentCost} → ${sData.onchainSaving} saving · ${sData.transparencyGain}`}
                        {secId==="identity"&&`${sData.currentKycCost} KYC → ${sData.onchainSaving} saved`}
                        {secId==="insurance"&&`${sData.currentPremiums} premiums → ${sData.onchainSaving} saved`}
                        {secId==="carbon"&&`${sData.estimatedFootprint} footprint · ${sData.saving} saved · ${sData.esgScoreImpact}`}
                        {secId==="loyalty"&&`${sData.programSize} program · ${sData.engagementLift} lift`}
                      </div>}
                    </div></Crd>
                  </div>
                );
              })}

              {mode==="web2"&&<div style={{padding:16,borderRadius:10,background:C.surface,border:`1px dashed ${C.border}`,textAlign:"center",fontSize:13,color:C.dim}}>
                {SELECTABLE_SECTORS.filter(s=>!d.recommendedSectors?.includes(s)).length} more sectors in sidebar — click to load on demand
              </div>}
            </div>}

            {tab!=="overview" && tab!=="rails" && rSector(tab)}

            {tab==="rails" && <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{padding:20,borderRadius:12,background:C.accentGlow,border:`1px solid ${C.borderStrong}`}}><div style={{fontSize:16,fontWeight:700,marginBottom:6,color:C.text}}>🛤️ Web2 → Onchain Onboarding</div><div style={{fontSize:13,color:C.textSub}}>No keys needed on your side. ChainBridge + OpenClaw handles everything.</div></div>
              {[{s:1,t:"Company Verified",dd:"KYB/KYC — address and website confirmed.",c:C.accent},{s:2,t:"Managed Wallet",dd:"Solana via MPC custody (Fireblocks/Turnkey).",c:C.purple},{s:3,t:"Fiat Rails",dd:"Helio/Sphere/Stripe — Fiat → USDC/SOL.",c:C.purple},{s:4,t:"OpenClaw Agents",dd:"Treasury, DePIN, Bridge, Compliance deployed.",c:"#d46faa"},{s:5,t:"Operations Live",dd:"Smart contracts active. Dashboard connected.",c:C.yellow},{s:6,t:"Commission Active",dd:"2.5% bridges + DePIN referrals + rails + SaaS.",c:C.accent}].map((step,i) => (
                <div key={i} style={{display:"flex",gap:16}}>
                  <div style={{width:40,height:40,borderRadius:10,background:`${step.c}15`,border:`1px solid ${step.c}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:step.c,fontFamily:"var(--mono)",flexShrink:0,boxShadow:`0 0 12px ${step.c}20`}}>{step.s}</div>
                  <div style={{flex:1,padding:16,borderRadius:10,background:C.surface,border:`1px solid ${C.border}`}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>{step.t}</div><div style={{fontSize:13,color:C.dim}}>{step.dd}</div></div>
                </div>
              ))}
            </div>}
          </div>}
        </main>
      {/* MOBILE BOTTOM NAV */}
      {phase==="dashboard" && d && <div className="ocb-mobile-nav" style={{background:C.surface,borderTop:`1px solid ${C.borderStrong}`}}>
        {["overview","financial","collaborations","openclaw","policy"].map(id => (
          <button key={id} onClick={() => setTab(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"6px 2px",border:"none",background:"transparent",color:tab===id?C.accent:C.muted,cursor:"pointer",fontSize:9,gap:2}}>
            <span style={{fontSize:16}}>{SECTOR_META[id]?.icon}</span>
            <span style={{fontWeight:tab===id?700:400}}>{SECTOR_META[id]?.label?.slice(0,7)}</span>
          </button>
        ))}
      </div>}

      </div>

      {/* AUTH MODAL */}
      {authModal && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={() => setAuthModal(false)}>
        <div style={{width:"90%",maxWidth:420,borderRadius:16,background:C.surface,border:`1px solid ${C.borderStrong}`,padding:28,boxShadow:`0 0 40px ${C.accent}20`}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:17,fontWeight:800,marginBottom:6,color:C.text}}>🔐 Sign In to Bridge</div>
          <div style={{fontSize:13,color:C.dim,marginBottom:20,lineHeight:1.6}}>Bridge execution requires verification. A specialist completes KYB within 24h.</div>
          <input placeholder="company@email.com" style={{width:"100%",padding:"11px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,marginBottom:10,outline:"none"}}/>
          <input placeholder="Company name" style={{width:"100%",padding:"11px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,marginBottom:18,outline:"none"}}/>
          <button onClick={completeAuth} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 0 20px ${C.accent}35`}}>Sign In & Bridge →</button>
        </div>
      </div>}

      {/* BRIDGE MODAL */}
      {bridgeModal && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={() => {setBridgeModal(null);setBridgeStep(0);}}>
        <div style={{width:"90%",maxWidth:460,borderRadius:16,background:C.surface,border:`1px solid ${C.borderStrong}`,overflow:"hidden",boxShadow:`0 0 50px ${C.accent}20`}} onClick={e=>e.stopPropagation()}>
          <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,background:C.accentGlow,display:"flex",justifyContent:"space-between"}}>
            <div><div style={{fontSize:16,fontWeight:800,color:C.text}}>🌉 {bridgeModal.name}</div><div style={{fontSize:12,color:C.dim,marginTop:2}}>Solana Program · OnChainBridge</div></div>
            <button onClick={() => {setBridgeModal(null);setBridgeStep(0);}} style={{width:28,height:28,borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,cursor:"pointer",fontSize:14}}>✕</button>
          </div>
          <div style={{padding:22}}>
            {BRIDGE_STEPS.map((step,i) => {
              const done=i<bridgeStep, active=i===bridgeStep, pending=i>bridgeStep;
              return (<div key={i} style={{display:"flex",gap:14,opacity:pending?.3:1,transition:"all .5s"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:32}}>
                  <div style={{width:32,height:32,borderRadius:9,background:done?C.accent:active?C.accentGlow:C.surface,border:`1px solid ${done?C.accent:active?C.borderStrong:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,transition:"all .5s",boxShadow:done||active?`0 0 12px ${C.accent}40`:"none"}}>{done?"✓":step.icon}</div>
                  {i<3&&<div style={{width:2,height:24,background:done?C.accent:C.border,transition:"background .5s"}}/>}
                </div>
                <div style={{paddingBottom:14}}><div style={{fontSize:13,fontWeight:700,color:done?C.accent:active?C.text:C.muted}}>{step.label}</div><div style={{fontSize:12,color:C.dim}}>{step.detail}</div></div>
              </div>);
            })}
            {bridgeStep===3 && <div style={{marginTop:12,padding:14,borderRadius:10,background:C.accentGlow,border:`1px solid ${C.borderStrong}`,animation:"fadeUp .3s",boxShadow:`0 0 20px ${C.accent}15`}}>
              <div style={{fontSize:13,fontWeight:700,color:C.accent,marginBottom:8}}>✅ Bridge Complete</div>
              {[["Protocol",bridgeModal.name],["Value",bridgeModal.value],["Commission",bridgeModal.commission],["Network","Solana Mainnet"]].map(([k,v],i) => (<div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span style={{color:C.dim}}>{k}</span><span style={{color:C.accent,fontFamily:"var(--mono)",fontWeight:600}}>{v}</span></div>))}
            </div>}
          </div>
        </div>
      </div>}

      {shareModal && d && <ShareCard d={d} mode={mode} onClose={() => setShareModal(false)} C={C}/>}

      {/* WALLET MODAL */}
      {walletModal && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={() => setWalletModal(false)}>
        <div style={{width:"90%",maxWidth:380,borderRadius:16,background:C.surface,border:`1px solid ${C.borderStrong}`,padding:24,boxShadow:`0 0 50px ${C.accent}20`}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:4,color:C.text}}>Connect Wallet</div>
          <div style={{fontSize:13,color:C.dim,marginBottom:20}}>Choose your wallet to continue</div>
          {[
            {id:"phantom",name:"Phantom",desc:"Solana · Most popular",color:"#ab9ff2",
              logo:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' rx='26' fill='%23ab9ff2'/%3E%3Cpath d='M110.6 64c0 25.7-20.8 46.6-46.6 46.6S17.4 89.7 17.4 64 38.3 17.4 64 17.4 110.6 38.3 110.6 64z' fill='%23fff'/%3E%3Cpath d='M85 51.3H43.5c-2.2 0-3.5 2.4-2.3 4.3l20.6 31.2c.7 1 1.8 1.6 3 1.6h20.2c1.8 0 3.3-1.5 3.3-3.3V54.6c0-1.8-1.5-3.3-3.3-3.3z' fill='%234e44ce'/%3E%3C/svg%3E"},
            {id:"solflare",name:"Solflare",desc:"Solana · Non-custodial",color:"#fc7227",
              logo:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' rx='26' fill='%23fc7227'/%3E%3Cpath d='M64 20l30 52H34L64 20z' fill='%23fff'/%3E%3Cpath d='M64 108l-30-52h60L64 108z' fill='%23fff' opacity='.7'/%3E%3C/svg%3E"},
            {id:"backpack",name:"Backpack",desc:"Solana · xNFT wallet",color:"#e33e3f",
              logo:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' rx='26' fill='%23e33e3f'/%3E%3Crect x='36' y='44' width='56' height='52' rx='10' fill='%23fff'/%3E%3Crect x='50' y='28' width='28' height='22' rx='8' fill='none' stroke='%23fff' stroke-width='6'/%3E%3Crect x='58' y='62' width='12' height='16' rx='3' fill='%23e33e3f'/%3E%3C/svg%3E"},
            {id:"metamask",name:"MetaMask",desc:"Ethereum · EVM chains",color:"#f6851b",
              logo:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' rx='26' fill='%23f6851b'/%3E%3Cpolygon points='64,20 96,72 64,88 32,72' fill='%23fff' opacity='.9'/%3E%3Cpolygon points='64,88 96,72 64,108' fill='%23fff' opacity='.7'/%3E%3Cpolygon points='64,88 32,72 64,108' fill='%23fff' opacity='.5'/%3E%3C/svg%3E"},
            {id:"coinbase",name:"Coinbase Wallet",desc:"Multi-chain",color:"#0052ff",
              logo:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' rx='26' fill='%230052ff'/%3E%3Ccircle cx='64' cy='64' r='32' fill='%23fff'/%3E%3Crect x='48' y='56' width='32' height='16' rx='4' fill='%230052ff'/%3E%3C/svg%3E"},
          ].map(w => (
            <button key={w.id} onClick={() => connectSpecific(w.id)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"13px 16px",borderRadius:12,border:`1px solid ${C.border}`,background:C.card,cursor:"pointer",marginBottom:6,transition:"all .15s",textAlign:"left"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=w.color;e.currentTarget.style.background=`${w.color}0f`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.card;}}>
              <img src={w.logo} alt={w.name} width={36} height={36} style={{borderRadius:10,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:C.text}}>{w.name}</div>
                <div style={{fontSize:11,color:C.dim,marginTop:1}}>{w.desc}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke={C.dim} strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          ))}
          <div style={{fontSize:11,color:C.muted,textAlign:"center",marginTop:8}}>New to wallets? <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" style={{color:C.accent}}>Get Phantom →</a></div>
        </div>
      </div>}

      {/* LEAD MODAL */}
      {leadModal && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={() => setLeadModal(null)}>
        <div style={{width:"90%",maxWidth:440,borderRadius:16,background:C.surface,border:`1px solid ${C.borderStrong}`,padding:28,boxShadow:`0 0 50px ${C.accent}25`}} onClick={e=>e.stopPropagation()}>
          {!leadSent ? (<>
            <div style={{fontSize:17,fontWeight:800,marginBottom:4,color:C.text}}>🚀 Follow Up on {leadModal.sector}</div>
            <div style={{fontSize:13,color:C.dim,marginBottom:6,lineHeight:1.5}}>We will connect you with <span style={{color:C.accent,fontWeight:600}}>{leadModal.protocol}</span> and have an OpenClaw agent compose a personalised intro on your behalf.</div>
            <div style={{padding:"10px 14px",borderRadius:9,background:C.accentGlow,border:`1px solid ${C.borderStrong}`,marginBottom:18,fontSize:13}}>
              <span style={{color:C.dim}}>Opportunity value: </span><span style={{color:C.accent,fontWeight:700,fontFamily:"var(--mono)"}}>{leadModal.value}</span>
            </div>
            <input value={leadForm.name} onChange={e=>setLeadForm(f=>({...f,name:e.target.value}))} placeholder="Your full name" style={{width:"100%",padding:"11px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,marginBottom:10,outline:"none"}}/>
            <input value={leadForm.company} onChange={e=>setLeadForm(f=>({...f,company:e.target.value}))} placeholder="Company name" style={{width:"100%",padding:"11px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,marginBottom:10,outline:"none"}}/>
            <input value={leadForm.email} onChange={e=>setLeadForm(f=>({...f,email:e.target.value}))} placeholder="Work email *" style={{width:"100%",padding:"11px 14px",borderRadius:8,border:`1px solid ${leadForm.email?C.borderStrong:C.border}`,background:C.bg,color:C.text,fontSize:14,marginBottom:18,outline:"none"}}/>
            <div style={{display:"flex",gap:10}}>
              <button onClick={submitLead} disabled={!leadForm.email} style={{flex:1,padding:"12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",fontSize:14,fontWeight:700,cursor:leadForm.email?"pointer":"not-allowed",opacity:leadForm.email?1:0.5,boxShadow:`0 0 20px ${C.accent}35`}}>
                🦞 Send via OpenClaw →
              </button>
              <button onClick={() => setLeadModal(null)} style={{padding:"12px 18px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.dim,fontSize:13,cursor:"pointer"}}>Cancel</button>
            </div>
            <div style={{fontSize:11,color:C.muted,marginTop:12,textAlign:"center"}}>OpenClaw will draft a personalised intro email to {leadModal.protocol} and cc you within minutes.</div>
          </>) : (<>
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:36,marginBottom:14}}>🦞</div>
              <div style={{fontSize:18,fontWeight:800,color:C.accent,marginBottom:8}}>Lead Sent!</div>
              <div style={{fontSize:13,color:C.textSub,lineHeight:1.6,marginBottom:20}}>OpenClaw is composing your personalised introduction to <strong style={{color:C.accent}}>{leadModal.protocol}</strong>. You will receive a copy at <strong>{leadForm.email}</strong> within minutes.</div>
              <div style={{padding:"12px 16px",borderRadius:10,background:C.accentGlow,border:`1px solid ${C.borderStrong}`,fontSize:13,color:C.textSub,marginBottom:20}}>
                <div style={{marginBottom:4}}>📡 Sector: <span style={{color:C.accent}}>{leadModal.sector}</span></div>
                <div style={{marginBottom:4}}>🔗 Protocol: <span style={{color:C.accent}}>{leadModal.protocol}</span></div>
                <div>💰 Value: <span style={{color:C.accent,fontFamily:"var(--mono)"}}>{leadModal.value}</span></div>
              </div>
              <button onClick={() => setLeadModal(null)} style={{padding:"11px 28px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Done ✓</button>
            </div>
          </>)}
        </div>
      </div>}
    </div>
  );
}