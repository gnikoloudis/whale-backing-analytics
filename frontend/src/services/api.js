// API endpoints, Supabase configuration, and mock fallbacks

const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_BASE_URL = hostname === 'localhost' || hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : `http://${hostname}:8000`;

// ==========================================
// PRE-BUILT MOCK DATA (Fallback for Offline)
// ==========================================
export const MOCK_STATUS = {
  status: "online (offline mock fallback)",
  database_type: "SQLite (Mock)",
  pipeline_running: false,
  counts: { stocks: 10, institutional_holders: 42, mutual_fund_holders: 35 }
};

export const MOCK_STOCKS = [
  { symbol: "AAPL", market_cap: 3106550000000, category: "Mega-Cap", sector: "Technology", industry: "Consumer Electronics", deep_dive_captured: "Yes", timestamp: "2026-06-05 13:30:00" },
  { symbol: "AMZN", market_cap: 2580000000000, category: "Mega-Cap", sector: "Consumer Cyclical", industry: "Internet Retail", deep_dive_captured: "Yes", timestamp: "2026-06-05 13:30:00" },
  { symbol: "GOOGL", market_cap: 2280000000000, category: "Mega-Cap", sector: "Technology", industry: "Internet Content & Information", deep_dive_captured: "Yes", timestamp: "2026-06-05 13:30:00" },
  { symbol: "AVGO", market_cap: 915270000000, category: "Large-Cap", sector: "Technology", industry: "Semiconductors", deep_dive_captured: "Yes", timestamp: "2026-06-05 13:30:00" },
  { symbol: "GOOG", market_cap: 2260000000000, category: "Mega-Cap", sector: "Technology", industry: "Internet Content & Information", deep_dive_captured: "Yes", timestamp: "2026-06-05 13:30:00" },
  { symbol: "AMD", market_cap: 358690000000, category: "Large-Cap", sector: "Technology", industry: "Semiconductors", deep_dive_captured: "Yes", timestamp: "2026-06-05 13:30:00" },
  { symbol: "INTC", market_cap: 243240000000, category: "Large-Cap", sector: "Technology", industry: "Semiconductors", deep_dive_captured: "Yes", timestamp: "2026-06-05 13:30:00" },
  { symbol: "CSCO", market_cap: 237830000000, category: "Large-Cap", sector: "Technology", industry: "Communication Equipment", deep_dive_captured: "Yes", timestamp: "2026-06-05 13:30:00" },
  { symbol: "COST", market_cap: 196300000000, category: "Large-Cap", sector: "Consumer Defensive", industry: "Discount Stores", deep_dive_captured: "Yes", timestamp: "2026-06-05 13:30:00" },
  { symbol: "AMAT", market_cap: 182740000000, category: "Large-Cap", sector: "Technology", industry: "Semiconductor Equipment", deep_dive_captured: "Yes", timestamp: "2026-06-05 13:30:00" }
];

export const MOCK_STATS = {
  summary: {
    total_institutional_value: 5085341203000,
    total_mutual_fund_value: 1989012484000,
    total_combined_whale_value: 7074353687000
  },
  top_institutional_stocks: [
    { ticker: "AAPL", value: 1432927038353, avg_pct_held: 0.034 },
    { ticker: "AMZN", value: 773859766522, avg_pct_held: 0.029 },
    { ticker: "GOOGL", value: 692713228204, avg_pct_held: 0.025 },
    { ticker: "AVGO", value: 658960897155, avg_pct_held: 0.028 },
    { ticker: "GOOG", value: 535505656416, avg_pct_held: 0.022 },
    { ticker: "AMD", value: 244717000391, avg_pct_held: 0.018 },
    { ticker: "INTC", value: 171518903693, avg_pct_held: 0.015 },
    { ticker: "CSCO", value: 166653724079, avg_pct_held: 0.014 },
    { ticker: "COST", value: 134338634902, avg_pct_held: 0.012 },
    { ticker: "AMAT", value: 128597323442, avg_pct_held: 0.011 }
  ],
  top_mutual_fund_stocks: [
    { ticker: "AAPL", value: 580356125825, avg_pct_held: 0.014 },
    { ticker: "AMZN", value: 310044296571, avg_pct_held: 0.012 },
    { ticker: "GOOGL", value: 274511904526, avg_pct_held: 0.011 },
    { ticker: "AVGO", value: 256316210913, avg_pct_held: 0.013 },
    { ticker: "GOOG", value: 226713592542, avg_pct_held: 0.010 },
    { ticker: "AMD", value: 113977667557, avg_pct_held: 0.008 },
    { ticker: "INTC", value: 71726490230, avg_pct_held: 0.007 },
    { ticker: "CSCO", value: 71177852524, avg_pct_held: 0.007 },
    { ticker: "COST", value: 61964304224, avg_pct_held: 0.005 },
    { ticker: "AMAT", value: 54148597211, avg_pct_held: 0.005 }
  ],
  top_overall_whales: [
    { holder: "Vanguard Group Inc", total_value: 1856230000000 },
    { holder: "Blackrock Inc.", total_value: 1542100000000 },
    { holder: "State Street Corporation", total_value: 912800000000 },
    { holder: "FMR, LLC", total_value: 714900000000 },
    { holder: "Geode Capital Management, LLC", total_value: 412500000000 },
    { holder: "Morgan Stanley", total_value: 382400000000 },
    { holder: "JPMorgan Chase & Co.", total_value: 320600000000 },
    { holder: "Price (T.Rowe) Associates Inc", total_value: 298400000000 },
    { holder: "Vanguard Capital Management LLC", total_value: 296300000000 },
    { holder: "Berkshire Hathaway, Inc", total_value: 220700000000 }
  ],
  sector_whale_backing: [
    { sector: "Technology", total_value: 5824900000000 },
    { sector: "Consumer Cyclical", total_value: 1083900000000 },
    { sector: "Consumer Defensive", total_value: 196300000000 }
  ]
};

export const MOCK_TICKER_HOLDERS = (symbol) => {
  const stock = MOCK_STOCKS.find(s => s.symbol === symbol) || MOCK_STOCKS[0];
  const instVal = MOCK_STATS.top_institutional_stocks.find(s => s.ticker === symbol)?.value || 1000000000;
  const mfVal = MOCK_STATS.top_mutual_fund_stocks.find(s => s.ticker === symbol)?.value || 400000000;

  return {
    stock: {
      symbol: stock.symbol,
      market_cap: stock.market_cap,
      category: stock.category,
      sector: stock.sector,
      industry: stock.industry
    },
    institutional_holders: [
      { ticker: symbol, holder: "Blackrock Inc.", shares: Math.round(instVal * 0.003), value: instVal * 0.40, pct_held: 0.0779, date_reported: "2026-03-31", pct_change: -0.0086 },
      { ticker: symbol, holder: "Vanguard Capital Management LLC", shares: Math.round(instVal * 0.0025), value: instVal * 0.33, pct_held: 0.0649, date_reported: "2026-03-31", pct_change: 1.0 },
      { ticker: symbol, holder: "State Street Corporation", shares: Math.round(instVal * 0.0018), value: instVal * 0.20, pct_held: 0.0410, date_reported: "2026-03-31", pct_change: -0.0028 },
      { ticker: symbol, holder: "Geode Capital Management, LLC", shares: Math.round(instVal * 0.001), value: instVal * 0.12, pct_held: 0.0251, date_reported: "2026-03-31", pct_change: 0.0296 },
      { ticker: symbol, holder: "FMR, LLC", shares: Math.round(instVal * 0.0008), value: instVal * 0.10, pct_held: 0.0209, date_reported: "2026-03-31", pct_change: 0.0001 }
    ],
    mutual_fund_holders: [
      { ticker: symbol, holder: "Vanguard Total Stock Market Index Fund", shares: Math.round(mfVal * 0.002), value: mfVal * 0.35, pct_held: 0.0285, date_reported: "2026-03-31", pct_change: 0.015 },
      { ticker: symbol, holder: "Vanguard 500 Index Fund", shares: Math.round(mfVal * 0.0018), value: mfVal * 0.28, pct_held: 0.0210, date_reported: "2026-03-31", pct_change: 0.021 },
      { ticker: symbol, holder: "Fidelity 500 Index Fund", shares: Math.round(mfVal * 0.001), value: mfVal * 0.15, pct_held: 0.0105, date_reported: "2026-03-31", pct_change: -0.005 },
      { ticker: symbol, holder: "SPDR S&P 500 ETF Trust", shares: Math.round(mfVal * 0.0009), value: mfVal * 0.12, pct_held: 0.0098, date_reported: "2026-03-31", pct_change: 0.0 }
    ],
    news: []
  };
};

// ==========================================
// SUPABASE CLIENTLESS INTEGRATION
// ==========================================
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const urlParams = new URLSearchParams(window.location.search);
const forceSupabase = urlParams.get('supabase') === 'true';
const forceLocal = urlParams.get('local') === 'true';
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const isSupabaseMode = forceSupabase || (!!(SUPABASE_URL && SUPABASE_ANON_KEY) && !forceLocal && !isLocalhost);

export const supabaseFetch = async (path) => {
  const cleanBaseUrl = SUPABASE_URL.replace(/\/+$/, '');
  const url = `${cleanBaseUrl}/rest/v1/${path}`;

  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };

  if (SUPABASE_ANON_KEY.startsWith('ey')) {
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Supabase PostgREST error: ${res.statusText}`);
  return res.json();
};

export const supabaseFetchAll = async (pathPattern) => {
  let allData = [];
  const limit = 1000;
  let offset = 0;
  let hasMore = true;

  const separator = pathPattern.includes('?') ? '&' : '?';

  while (hasMore) {
    const paginatedPath = `${pathPattern}${separator}limit=${limit}&offset=${offset}`;
    const data = await supabaseFetch(paginatedPath);
    if (!Array.isArray(data)) {
      return data;
    }
    allData = allData.concat(data);
    if (data.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }
  return allData;
};

export const computeStatsFromData = (stocksList, instHolders, mfHolders) => {
  const totalInst = instHolders.reduce((sum, h) => sum + (h.value || 0), 0);
  const totalMf = mfHolders.reduce((sum, h) => sum + (h.value || 0), 0);

  const tickerToSector = {};
  stocksList.forEach(s => {
    tickerToSector[s.symbol] = s.sector || 'Unknown';
  });

  const instStockVals = {};
  const instStockPcts = {};
  const instStockCount = {};
  instHolders.forEach(h => {
    instStockVals[h.ticker] = (instStockVals[h.ticker] || 0) + (h.value || 0);
    instStockPcts[h.ticker] = (instStockPcts[h.ticker] || 0) + (h.pct_held || 0);
    instStockCount[h.ticker] = (instStockCount[h.ticker] || 0) + 1;
  });
  const topInstStocks = Object.keys(instStockVals).map(ticker => ({
    ticker,
    value: instStockVals[ticker],
    avg_pct_held: instStockPcts[ticker] / (instStockCount[ticker] || 1)
  })).sort((a, b) => b.value - a.value).slice(0, 10);

  const mfStockVals = {};
  const mfStockPcts = {};
  const mfStockCount = {};
  mfHolders.forEach(h => {
    mfStockVals[h.ticker] = (mfStockVals[h.ticker] || 0) + (h.value || 0);
    mfStockPcts[h.ticker] = (mfStockPcts[h.ticker] || 0) + (h.pct_held || 0);
    mfStockCount[h.ticker] = (mfStockCount[h.ticker] || 0) + 1;
  });
  const topMfStocks = Object.keys(mfStockVals).map(ticker => ({
    ticker,
    value: mfStockVals[ticker],
    avg_pct_held: mfStockPcts[ticker] / (mfStockCount[ticker] || 1)
  })).sort((a, b) => b.value - a.value).slice(0, 10);

  const whaleTotals = {};
  instHolders.forEach(h => {
    if (h.holder) whaleTotals[h.holder] = (whaleTotals[h.holder] || 0) + (h.value || 0);
  });
  mfHolders.forEach(h => {
    if (h.holder) whaleTotals[h.holder] = (whaleTotals[h.holder] || 0) + (h.value || 0);
  });
  const topWhales = Object.keys(whaleTotals).map(holder => ({
    holder,
    total_value: whaleTotals[holder]
  })).sort((a, b) => b.total_value - a.total_value).slice(0, 10);

  const sectorTotals = {};
  instHolders.forEach(h => {
    const sector = tickerToSector[h.ticker] || 'Unknown';
    if (sector !== 'Unknown' && sector !== 'Failed') {
      sectorTotals[sector] = (sectorTotals[sector] || 0) + (h.value || 0);
    }
  });
  mfHolders.forEach(h => {
    const sector = tickerToSector[h.ticker] || 'Unknown';
    if (sector !== 'Unknown' && sector !== 'Failed') {
      sectorTotals[sector] = (sectorTotals[sector] || 0) + (h.value || 0);
    }
  });
  const sectorWhaleBacking = Object.keys(sectorTotals).map(sector => ({
    sector,
    total_value: sectorTotals[sector]
  })).sort((a, b) => b.total_value - a.total_value);

  return {
    summary: {
      total_institutional_value: totalInst,
      total_mutual_fund_value: totalMf,
      total_combined_whale_value: totalInst + totalMf
    },
    top_institutional_stocks: topInstStocks,
    top_mutual_fund_stocks: topMfStocks,
    top_overall_whales: topWhales,
    sector_whale_backing: sectorWhaleBacking
  };
};
