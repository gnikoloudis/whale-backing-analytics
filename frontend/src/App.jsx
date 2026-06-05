import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  RefreshCw, 
  Search, 
  Filter, 
  TrendingUp, 
  Users, 
  Building, 
  PieChart, 
  Info, 
  AlertTriangle,
  Play,
  UploadCloud,
  FileText,
  Briefcase,
  Layers,
  ChevronRight,
  TrendingDown
} from 'lucide-react';

// API URL (FastAPI backend port is 8000 by default)
const API_BASE_URL = 'http://localhost:8000';

// ==========================================
// PRE-BUILT MOCK DATA (Fallback for Offline)
// ==========================================
const MOCK_STATUS = {
  status: "online (offline mock fallback)",
  database_type: "SQLite (Mock)",
  pipeline_running: false,
  counts: { stocks: 10, institutional_holders: 42, mutual_fund_holders: 35 }
};

const MOCK_STOCKS = [
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

const MOCK_STATS = {
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

const MOCK_TICKER_HOLDERS = (symbol) => {
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
    ]
  };
};

// ==========================================
// SUPABASE CLIENTLESS INTEGRATION (PRODUCTION OPTION 1)
// ==========================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isSupabaseMode = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

const supabaseFetch = async (path) => {
  const cleanBaseUrl = SUPABASE_URL.replace(/\/+$/, '');
  const url = `${cleanBaseUrl}/rest/v1/${path}`;
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };
  
  // Only include Authorization header if using a legacy JWT key (starts with 'ey').
  // The new 'sb_publishable_' keys are not JWTs and will cause token decoding errors if passed as Bearer.
  if (SUPABASE_ANON_KEY.startsWith('ey')) {
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Supabase PostgREST error: ${res.statusText}`);
  return res.json();
};

const computeStatsFromData = (stocksList, instHolders, mfHolders) => {
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

function App() {
  // Admin Mode Visibility Check: Only show if the URL contains the secret query param '?admin=true'
  const showAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';

  // Navigation
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'stocks'
  
  // Data State
  const [isApiOffline, setIsApiOffline] = useState(false);
  const [status, setStatus] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [tickerHolders, setTickerHolders] = useState(null);
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  
  // Holder detailed sub-tabs
  const [holdersTab, setHoldersTab] = useState('institutional'); // 'institutional' | 'mutual'
  
  // Scraper pipeline terminal state
  const [pipelineLogs, setPipelineLogs] = useState([]);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  
  // UI Loading States
  const [loading, setLoading] = useState(true);
  
  const terminalEndRef = useRef(null);

  // Auto scroll console log window to bottom when logs change
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [pipelineLogs]);

  // Initial fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Poll logs if pipeline is running
  useEffect(() => {
    let intervalId;
    if (isPipelineRunning) {
      intervalId = setInterval(() => {
        fetchPipelineLogs();
      }, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPipelineRunning]);

  // Fetch ticker holders detail when active ticker changes
  useEffect(() => {
    if (selectedTicker) {
      fetchTickerDetails(selectedTicker);
    }
  }, [selectedTicker]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      if (isSupabaseMode) {
        // --- SUPABASE MODE ---
        // 0. Query latest timestamp
        const tsData = await supabaseFetch('stock_metadata?select=timestamp&order=timestamp.desc&limit=1');
        const latestTimestamp = tsData && tsData.length > 0 ? tsData[0].timestamp : null;
        setLastUpdated(latestTimestamp);
        
        // 1. Fetch Stocks, Inst Holders, and Mutual Fund Holders in parallel
        // Filter the holders by the latest timestamp so we don't fetch historical runs
        const instQuery = latestTimestamp ? `institutional_holders?select=*&timestamp=eq.${encodeURIComponent(latestTimestamp)}` : 'institutional_holders?select=*';
        const mfQuery = latestTimestamp ? `mutual_fund_holders?select=*&timestamp=eq.${encodeURIComponent(latestTimestamp)}` : 'mutual_fund_holders?select=*';
        
        const [stocksData, instData, mfData] = await Promise.all([
          supabaseFetch('stock_metadata?select=*&or=(category.eq.Mega-Cap,category.eq.Large-Cap)&order=symbol'),
          supabaseFetch(instQuery),
          supabaseFetch(mfQuery)
        ]);
        
        setStocks(stocksData);
        
        // 2. Compute aggregate stats in memory (client-side)
        const computedStats = computeStatsFromData(stocksData, instData, mfData);
        setStats(computedStats);
        
        // 3. Set Status
        setStatus({
          status: "online (Supabase)",
          database_type: "Supabase (PostgreSQL)",
          pipeline_running: false,
          counts: {
            stocks: stocksData.length,
            institutional_holders: instData.length,
            mutual_fund_holders: mfData.length
          }
        });
        setIsApiOffline(false);

        // Set active ticker if stocks are loaded
        const activeStocksList = stocksData.filter(s => s.deep_dive_captured === 'Yes');
        if (activeStocksList.length > 0) {
          setSelectedTicker(activeStocksList[0].symbol);
        }
      } else {
        // --- LOCAL API MODE ---
        // 1. Fetch Status
        const statusRes = await fetch(`${API_BASE_URL}/api/status`);
        const statusData = await statusRes.json();
        setStatus(statusData);
        setLastUpdated(statusData.last_updated);
        setIsApiOffline(false);
        
        // 2. Fetch Stocks
        const stocksRes = await fetch(`${API_BASE_URL}/api/stocks`);
        const stocksData = await stocksRes.json();
        setStocks(stocksData);
        
        // 3. Fetch Stats
        const statsRes = await fetch(`${API_BASE_URL}/api/holders/stats`);
        const statsData = await statsRes.json();
        setStats(statsData);
        
        // Set active ticker if stocks are loaded
        const activeStocksList = stocksData.filter(s => s.deep_dive_captured === 'Yes');
        if (activeStocksList.length > 0) {
          setSelectedTicker(activeStocksList[0].symbol);
        } else if (stocksData.length > 0) {
          setSelectedTicker(stocksData[0].symbol);
        }
      }
    } catch (error) {
      console.warn("API offline or failed. Switching to mock data.", error);
      setIsApiOffline(true);
      setStatus(MOCK_STATUS);
      setStocks(MOCK_STOCKS);
      setStats(MOCK_STATS);
      setSelectedTicker('AAPL');
    } finally {
      setLoading(false);
    }
  };

  const fetchTickerDetails = async (ticker) => {
    try {
      if (isApiOffline) {
        setTickerHolders(MOCK_TICKER_HOLDERS(ticker));
        return;
      }
      
      if (isSupabaseMode) {
        // Query stock metadata with nested joins for institutional and mutual fund holders
        // Filter the joined records to match the active lastUpdated timestamp
        let path = `stock_metadata?select=*,institutional_holders(*),mutual_fund_holders(*)&symbol=eq.${ticker.toUpperCase() || ticker}`;
        if (lastUpdated) {
          const encTs = encodeURIComponent(lastUpdated);
          path += `&institutional_holders.timestamp=eq.${encTs}&mutual_fund_holders.timestamp=eq.${encTs}`;
        }
        
        const data = await supabaseFetch(path);
        if (data && data.length > 0) {
          const stockObj = data[0];
          
          // Sort lists descending by Value
          const sortedInst = (stockObj.institutional_holders || []).sort((a, b) => (b.value || 0) - (a.value || 0));
          const sortedMf = (stockObj.mutual_fund_holders || []).sort((a, b) => (b.value || 0) - (a.value || 0));
          
          setTickerHolders({
            stock: {
              symbol: stockObj.symbol,
              market_cap: stockObj.market_cap,
              category: stockObj.category,
              sector: stockObj.sector,
              industry: stockObj.industry
            },
            institutional_holders: sortedInst,
            mutual_fund_holders: sortedMf
          });
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/api/holders/${ticker}`);
        if (res.ok) {
          const data = await res.json();
          setTickerHolders(data);
        } else {
          console.error("Failed to load ticker holders detail");
        }
      }
    } catch (error) {
      console.error("Error loading ticker details", error);
      setTickerHolders(MOCK_TICKER_HOLDERS(ticker));
    }
  };

  const fetchPipelineLogs = async () => {
    if (isSupabaseMode) return; // Background scraping running on GitHub Actions, logs not loaded from local API
    try {
      if (isApiOffline) return;
      const res = await fetch(`${API_BASE_URL}/api/pipeline/logs`);
      if (res.ok) {
        const data = await res.json();
        setIsPipelineRunning(data.running);
        setPipelineLogs(data.logs || []);
        
        // If finished, reload dashboard data
        if (!data.running && isPipelineRunning) {
          fetchInitialData();
        }
      }
    } catch (error) {
      console.error("Error fetching logs", error);
    }
  };

  const handleSeed = async () => {
    if (isApiOffline) {
      alert("Backend API is offline. Cannot seed local SQLite db.");
      return;
    }
    setLoading(true);
    setLogsOpen(true);
    setPipelineLogs(["[00:00:00] INFO: Triggering local CSV data import..."]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pipeline/seed`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPipelineLogs(prev => [
          ...prev, 
          `[System] SUCCESS: Imported ${data.metadata_count} stock metadata entries.`,
          `[System] SUCCESS: Seeded ${data.inst_count} institutional holder rows.`,
          `[System] SUCCESS: Seeded ${data.mutual_count} mutual fund holder rows.`,
          `[System] DB Seed complete!`
        ]);
        fetchInitialData();
      } else {
        setPipelineLogs(prev => [...prev, `[System] ERROR: ${data.detail || "Import failed"}`]);
      }
    } catch (error) {
      setPipelineLogs(prev => [...prev, `[System] ERROR: Failed to connect to server.`]);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPipeline = async () => {
    if (isApiOffline) {
      alert("Backend API is offline. Cannot run live scraping pipeline.");
      return;
    }
    setLogsOpen(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pipeline/run?limit=10`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setIsPipelineRunning(true);
        setPipelineLogs(prev => [...prev, `[System] Scraper started (limit 10 symbols for quick test).`]);
      } else {
        setPipelineLogs(prev => [...prev, `[System] ERROR: ${data.detail || "Scraper launch failed"}`]);
      }
    } catch (error) {
      setPipelineLogs(prev => [...prev, `[System] ERROR: Connection failed.`]);
    }
  };

  // Helper formatting numbers to human readable USD
  const formatUSD = (value) => {
    if (!value) return "$0.00";
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatPercent = (val) => {
    if (val === null || val === undefined) return "N/A";
    return `${(val * 100).toFixed(2)}%`;
  };

  // Helper formatting big share counts
  const formatShares = (value) => {
    if (!value) return "0";
    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(2)}M`;
    }
    return value.toLocaleString();
  };

  // Only show stocks that have deep-dive holder details successfully captured
  const activeStocks = stocks.filter(stock => stock.deep_dive_captured === 'Yes');

  // Filter stocks dynamically
  const filteredStocks = activeStocks.filter(stock => {
    const matchesSearch = stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (stock.sector && stock.sector.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (stock.industry && stock.industry.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory ? stock.category === selectedCategory : true;
    const matchesSector = selectedSector ? stock.sector === selectedSector : true;
    return matchesSearch && matchesCategory && matchesSector;
  });

  // Extract unique sectors and categories for filter options from stocks that actually have data
  const uniqueSectors = [...new Set(activeStocks.map(s => s.sector).filter(Boolean))];
  const uniqueCategories = [...new Set(activeStocks.map(s => s.category).filter(Boolean))];

  return (
    <div className="dashboard-container">
      {/* ==========================================
          HEADER SECTION
          ========================================== */}
      <header className="glass-card animate-fade-in" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px', padding: '20px 24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'var(--accent-primary-glow)', padding: '10px', borderRadius: '12px', border: '1px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={24} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-title)', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Whale Backing Analytics
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '500' }}>
                Stock Categories & Consolidated Holder Insights
              </p>
            </div>
          </div>
        </div>

        {/* Database Status and Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {isApiOffline && (
            <div className="badge error" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <AlertTriangle size={14} /> Offline Mock Mode
            </div>
          )}

          {status && !isApiOffline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', fontSize: '13px' }}>
              <span style={{ width: '8px', height: '8px', background: 'var(--accent-secondary)', borderRadius: '50%', boxShadow: '0 0 8px var(--accent-secondary-glow)' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>DB: {status.database_type}</span>
            </div>
          )}

          {lastUpdated && !isApiOffline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Last Update:</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>{lastUpdated.split(' ')[0]}</span>
            </div>
          )}

          {showAdmin && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={`glass-btn ${isPipelineRunning ? 'active' : ''}`}
                onClick={handleRunPipeline}
                disabled={isPipelineRunning || loading}
                title="Run live yfinance scraper pipeline for top symbols"
              >
                <RefreshCw size={16} className={isPipelineRunning ? 'animate-spin' : ''} />
                <span>Scrape Live</span>
              </button>
              
              <button 
                className="glass-btn success"
                onClick={handleSeed}
                disabled={isPipelineRunning || loading}
                title="Import local consolidated CSV files in market_data"
              >
                <UploadCloud size={16} />
                <span>Import Local CSVs</span>
              </button>

              <button 
                className="glass-btn secondary"
                onClick={() => setLogsOpen(!logsOpen)}
              >
                <FileText size={16} />
                <span>Logs</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Realtime Terminal Log Viewer */}
      {showAdmin && logsOpen && (
        <div className="glass-card animate-fade-in" style={{ padding: '20px', borderColor: 'var(--accent-primary-glow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', background: isPipelineRunning ? '#ef4444' : '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                System Logs Terminal {isPipelineRunning && "(Running Scraper...)"}
              </h3>
            </div>
            <button 
              onClick={() => setLogsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
            >
              Close
            </button>
          </div>
          <div className="terminal-window">
            {pipelineLogs.length === 0 ? (
              <div className="terminal-line text-muted">// No logs generated. Trigger "Import Local CSVs" or "Scrape Live" to stream logs.</div>
            ) : (
              pipelineLogs.map((log, index) => (
                <div key={index} className="terminal-line">{log}</div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      )}

      {/* ==========================================
          KPI METRICS BAR
          ========================================== */}
      {stats && (
        <div className="grid-cols-4 animate-fade-in">
          <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
            <div className="stat-label">Tracked Companies</div>
            <div className="stat-value">{stocks.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Categories: Mega, Large</div>
          </div>
          <div className="glass-card" style={{ borderLeft: '4px solid #818cf8' }}>
            <div className="stat-label">Institutional Backing</div>
            <div className="stat-value">{formatUSD(stats.summary.total_institutional_value)}</div>
            <div style={{ fontSize: '12px', color: 'var(--accent-secondary)' }}>Largest backing block</div>
          </div>
          <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-tertiary)' }}>
            <div className="stat-label">Mutual Fund Backing</div>
            <div className="stat-value">{formatUSD(stats.summary.total_mutual_fund_value)}</div>
            <div style={{ fontSize: '12px', color: 'var(--accent-tertiary)' }}>Consolidated fund pools</div>
          </div>
          <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
            <div className="stat-label">Total Whale Capital</div>
            <div className="stat-value">{formatUSD(stats.summary.total_combined_whale_value)}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Institutional + Mutual fund sums</div>
          </div>
        </div>
      )}

      {/* Main Navigation tabs */}
      <div style={{ display: 'flex', gap: '12px' }} className="animate-fade-in">
        <button 
          className={`glass-btn ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          <PieChart size={16} />
          <span>Dashboard Overview</span>
        </button>
        <button 
          className={`glass-btn ${activeView === 'stocks' ? 'active' : ''}`}
          onClick={() => setActiveView('stocks')}
        >
          <Building size={16} />
          <span>Stock & Whale Explorer</span>
        </button>
      </div>

      {/* ==========================================
          VIEW 1: DASHBOARD OVERVIEW
          ========================================== */}
      {activeView === 'dashboard' && stats && (
        <div className="grid-cols-2 animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
          
          {/* Institutional vs Mutual Fund backing Value Bar Chart */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Whale Backing Comparison</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Institutional vs Mutual Fund dollar values for top assets</p>
            </div>
            
            {/* Custom Responsive SVG Grouped Bar Chart */}
            <div style={{ width: '100%', minHeight: '320px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '24px 16px 12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', flex: 1, alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', height: '260px' }}>
                {stats.top_institutional_stocks.slice(0, 8).map((stock, idx) => {
                  const instVal = stock.value;
                  const mfVal = stats.top_mutual_fund_stocks.find(s => s.ticker === stock.ticker)?.value || 0;
                  const maxVal = Math.max(...stats.top_institutional_stocks.map(s => s.value));
                  
                  // Calculate heights proportionally
                  const instHeight = `${(instVal / maxVal * 200).toFixed(0)}px`;
                  const mfHeight = `${(mfVal / maxVal * 200).toFixed(0)}px`;
                  
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px' }}>
                      {/* Dual bars */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '200px' }}>
                        {/* Institutional bar */}
                        <div 
                          style={{ 
                            width: '12px', 
                            height: instHeight, 
                            background: 'linear-gradient(to top, var(--accent-primary), #818cf8)', 
                            borderRadius: '4px 4px 0 0',
                            position: 'relative',
                            boxShadow: '0 0 10px rgba(99,102,241,0.2)'
                          }}
                          title={`Institutional: ${formatUSD(instVal)}`}
                        />
                        {/* Mutual Fund bar */}
                        <div 
                          style={{ 
                            width: '12px', 
                            height: mfHeight, 
                            background: 'linear-gradient(to top, var(--accent-tertiary), #fb7185)', 
                            borderRadius: '4px 4px 0 0',
                            position: 'relative',
                            boxShadow: '0 0 10px rgba(244,63,94,0.2)'
                          }}
                          title={`Mutual Fund: ${formatUSD(mfVal)}`}
                        />
                      </div>
                      
                      {/* Ticker label */}
                      <span 
                        style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedTicker(stock.ticker);
                          setActiveView('stocks');
                        }}
                        className="interactive"
                      >
                        {stock.ticker}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ width: '12px', height: '12px', background: 'var(--accent-primary)', borderRadius: '3px' }}></span>
                  <span style={{ color: 'var(--text-secondary)' }}>Institutional backing</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ width: '12px', height: '12px', background: 'var(--accent-tertiary)', borderRadius: '3px' }}></span>
                  <span style={{ color: 'var(--text-secondary)' }}>Mutual Fund backing</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sector Exposure Chart List */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Sector Distribution</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Whale backing allocation weight across market sectors</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {stats.sector_whale_backing.map((sect, idx) => {
                const totalValue = stats.summary.total_combined_whale_value;
                const percent = sect.total_value / totalValue;
                
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ fontWeight: '500' }}>{sect.sector}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{formatUSD(sect.total_value)} ({formatPercent(percent)})</span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div 
                        style={{ 
                          width: `${(percent * 100).toFixed(1)}%`, 
                          height: '100%', 
                          background: idx === 0 
                            ? 'linear-gradient(to right, var(--accent-primary), #818cf8)' 
                            : idx === 1 
                            ? 'linear-gradient(to right, var(--accent-secondary), #34d399)' 
                            : 'linear-gradient(to right, var(--accent-gold), #fbbf24)',
                          borderRadius: '9999px' 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Overall Whale Holders Table (Vanguard, Blackrock, etc) */}
          <div className="glass-card" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Largest Whales Exposure</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Combined investment exposure across all target Nasdaq listings</p>
              </div>
              <span className="badge success" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Users size={14} /> Major Whale Backers
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {stats.top_overall_whales.slice(0, 6).map((whale, idx) => {
                const maxWhaleVal = stats.top_overall_whales[0].total_value;
                const percentage = whale.total_value / maxWhaleVal;
                
                return (
                  <div key={idx} className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)' }}>#{idx + 1}</span>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }} title={whale.holder}>
                          {whale.holder}
                        </h3>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {formatUSD(whale.total_value)}
                      </span>
                    </div>
                    {/* Mini SVG bar indicators */}
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${(percentage * 100).toFixed(0)}%`, 
                          height: '100%', 
                          background: 'var(--accent-primary)',
                          borderRadius: '2px',
                          boxShadow: '0 0 6px var(--accent-primary-glow)' 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          VIEW 2: STOCK & WHALE EXPLORER
          ========================================== */}
      {activeView === 'stocks' && (
        <div className="grid-main animate-fade-in">
          
          {/* Left panel: stocks list and search */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ticker Directory</h2>
            
            {/* Search Input */}
            <div className="glass-input-wrapper">
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Search symbol, sector..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Sector filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filter by Sector</label>
              <select 
                className="glass-select" 
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
              >
                <option value="">All Sectors</option>
                {uniqueSectors.map((sect, i) => <option key={i} value={sect}>{sect}</option>)}
              </select>
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filter by Category</label>
              <select 
                className="glass-select" 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {uniqueCategories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
              </select>
            </div>

            {/* Stocks List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px', marginTop: '8px' }}>
              {filteredStocks.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No tickers match your filters.
                </div>
              ) : (
                filteredStocks.map((stock, idx) => (
                  <div 
                    key={idx}
                    className={`glass-card interactive ${selectedTicker === stock.symbol ? 'active' : ''}`}
                    onClick={() => setSelectedTicker(stock.symbol)}
                    style={{ 
                      padding: '12px 16px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      borderRadius: '10px',
                      background: selectedTicker === stock.symbol ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                      borderLeft: selectedTicker === stock.symbol ? '3px solid var(--accent-primary)' : '1px solid var(--card-border)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px' }}>{stock.symbol}</span>
                        <span className={`badge ${stock.category.toLowerCase().replace('-cap', '-cap')}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                          {stock.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                        {stock.sector}
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: selectedTicker === stock.symbol ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel: Active Stock holders detailed analytics */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {tickerHolders ? (
              <>
                {/* Stock Profile info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h2 style={{ fontSize: '24px', fontWeight: '800' }}>{tickerHolders.stock.symbol} Profile</h2>
                      <span className={`badge ${tickerHolders.stock.category.toLowerCase().replace('-cap', '-cap')}`}>
                        {tickerHolders.stock.category}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      {tickerHolders.stock.sector} • {tickerHolders.stock.industry}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="stat-label">Market Capitalization</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                      {formatUSD(tickerHolders.stock.market_cap)}
                    </div>
                  </div>
                </div>

                {/* Local Stats inside Ticker */}
                <div className="grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid var(--accent-primary)' }}>
                    <div className="stat-label">Institutional Holdings</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '6px' }}>
                      {formatUSD(
                        tickerHolders.institutional_holders.reduce((sum, h) => sum + (h.value || 0), 0)
                      )}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Sum of top {tickerHolders.institutional_holders.length} institutional blocks
                    </span>
                  </div>

                  <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid var(--accent-tertiary)' }}>
                    <div className="stat-label">Mutual Fund Holdings</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '6px' }}>
                      {formatUSD(
                        tickerHolders.mutual_fund_holders.reduce((sum, h) => sum + (h.value || 0), 0)
                      )}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Sum of top {tickerHolders.mutual_fund_holders.length} mutual fund blocks
                    </span>
                  </div>
                </div>

                {/* Tabbed Holders table list */}
                <div>
                  <div className="card-tabs">
                    <button 
                      className={`card-tab ${holdersTab === 'institutional' ? 'active' : ''}`}
                      onClick={() => setHoldersTab('institutional')}
                    >
                      Institutional Holders ({tickerHolders.institutional_holders.length})
                    </button>
                    <button 
                      className={`card-tab ${holdersTab === 'mutual' ? 'active' : ''}`}
                      onClick={() => setHoldersTab('mutual')}
                    >
                      Mutual Fund Holders ({tickerHolders.mutual_fund_holders.length})
                    </button>
                  </div>

                  <div className="table-container">
                    {holdersTab === 'institutional' ? (
                      tickerHolders.institutional_holders.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No institutional holders data loaded for this ticker. Run "Import Local CSVs" or "Scrape Live".
                        </div>
                      ) : (
                        <table className="sleek-table">
                          <thead>
                            <tr>
                              <th>Holder Entity</th>
                              <th>Date Reported</th>
                              <th style={{ textAlign: 'right' }}>Shares</th>
                              <th style={{ textAlign: 'right' }}>Value</th>
                              <th style={{ textAlign: 'right' }}>% Out</th>
                              <th style={{ textAlign: 'right' }}>Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tickerHolders.institutional_holders.map((holder, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: '600' }}>{holder.holder}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{holder.date_reported || 'N/A'}</td>
                                <td style={{ textAlign: 'right' }}>{formatShares(holder.shares)}</td>
                                <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatUSD(holder.value)}</td>
                                <td style={{ textAlign: 'right' }}>{formatPercent(holder.pct_held)}</td>
                                <td style={{ 
                                  textAlign: 'right', 
                                  fontWeight: '600', 
                                  color: holder.pct_change > 0 ? 'var(--accent-secondary)' : holder.pct_change < 0 ? 'var(--accent-tertiary)' : 'var(--text-muted)' 
                                }}>
                                  {holder.pct_change !== null ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      {holder.pct_change > 0 ? <TrendingUp size={12} /> : holder.pct_change < 0 ? <TrendingDown size={12} /> : null}
                                      {holder.pct_change === 1.0 ? "NEW" : formatPercent(holder.pct_change)}
                                    </div>
                                  ) : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )
                    ) : (
                      tickerHolders.mutual_fund_holders.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No mutual fund holders data loaded for this ticker.
                        </div>
                      ) : (
                        <table className="sleek-table">
                          <thead>
                            <tr>
                              <th>Mutual Fund Name</th>
                              <th>Date Reported</th>
                              <th style={{ textAlign: 'right' }}>Shares</th>
                              <th style={{ textAlign: 'right' }}>Value</th>
                              <th style={{ textAlign: 'right' }}>% Out</th>
                              <th style={{ textAlign: 'right' }}>Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tickerHolders.mutual_fund_holders.map((holder, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: '600' }}>{holder.holder}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{holder.date_reported || 'N/A'}</td>
                                <td style={{ textAlign: 'right' }}>{formatShares(holder.shares)}</td>
                                <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatUSD(holder.value)}</td>
                                <td style={{ textAlign: 'right' }}>{formatPercent(holder.pct_held)}</td>
                                <td style={{ 
                                  textAlign: 'right', 
                                  fontWeight: '600', 
                                  color: holder.pct_change > 0 ? 'var(--accent-secondary)' : holder.pct_change < 0 ? 'var(--accent-tertiary)' : 'var(--text-muted)' 
                                }}>
                                  {holder.pct_change !== null ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      {holder.pct_change > 0 ? <TrendingUp size={12} /> : holder.pct_change < 0 ? <TrendingDown size={12} /> : null}
                                      {holder.pct_change === 1.0 ? "NEW" : formatPercent(holder.pct_change)}
                                    </div>
                                  ) : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Select a stock from the directory to view its whale backing analysis.
              </div>
            )}

          </div>
        </div>
      )}

      {/* ==========================================
          FOOTER
          ========================================== */}
      <footer style={{ marginTop: '20px', padding: '24px 0', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
        <div>
          <span>Antigravity Stock & Whale Analytics Suite © 2026. Built on Google DeepMind technologies.</span>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <span>Vite + React Dashboard</span>
          <span>FastAPI Backend</span>
          <span>Supabase Ready</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
