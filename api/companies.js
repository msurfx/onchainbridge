module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { query } = req.query;
  if (!query) return res.status(400).json({ results: [] });

  const isNumber = /^\d+$/.test(query.trim());
  const isUS = /^[A-Z]{1,5}$/.test(query.trim());
  const results = [];

  try {
    if (isNumber) {
      // UK Companies House lookup by number
      const r = await fetch(`https://api.company-information.service.gov.uk/company/${query.trim()}`, {
        headers: { "Authorization": "Basic " + Buffer.from(process.env.COMPANIES_HOUSE_KEY + ":").toString("base64") }
      });
      const d = await r.json();
      if (d.company_name) {
        results.push({
          name: d.company_name,
          address: [d.registered_office_address?.address_line_1, d.registered_office_address?.locality, d.registered_office_address?.country].filter(Boolean).join(", "),
          sector: d.sic_codes?.[0] || "Unknown",
          website: "",
          revenue: "",
          description: `${d.type} · ${d.company_status} · Incorporated ${d.date_of_creation}`,
          source: "companies_house",
          companyNumber: query.trim()
        });
      }
    } else {
      // UK name search
      const ukR = await fetch(`https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(query)}&items_per_page=3`, {
        headers: { "Authorization": "Basic " + Buffer.from(process.env.COMPANIES_HOUSE_KEY + ":").toString("base64") }
      });
      const ukD = await ukR.json();
      for (const item of ukD.items || []) {
        results.push({
          name: item.title,
          address: item.address_snippet || "",
        sector: item.description || "",
          website: "",
          revenue: "",
          description: `UK Company · ${item.company_status || ""}`,
          source: "companies_house",
          companyNumber: item.company_number
        });
      }

      // US SEC EDGAR search
      const secR = await fetch(`https://efts.sec.gov/LATEST/search-index?q="${encodeURIComponent(query)}"&dateRange=custom&startdt=2023-01-01&forms=10-K`, {
        headers: { "User-Agent": "OnChainBridge contact@onchainbridge.xyz" }
      });
      const secD = await secR.json();
      for (const hit of (secD.hits?.hits || []).slice(0, 2)) {
        results.push({
          name: hit._source?.entity_name || query,
          address: "United States",
          sector: hit._source?.file_date || "",
          website: "",
          rvenue: "",
          description: `US Public Company · SEC Filing ${hit._source?.file_date || ""}`,
          source: "sec_edgar"
        });
      }
    }
  } catch(e) {
    console.error("Companies lookup error:", e.message);
  }

  return res.json({ results });
};
