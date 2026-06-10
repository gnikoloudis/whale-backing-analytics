import React, { useState, useEffect } from 'react';
import { Building, PieChart, Search } from 'lucide-react';
//import AdBanner from './components/AdBanner';
import Header from './components/Header';
import KpiMetrics from './components/KpiMetrics';
import DashboardOverview from './components/DashboardOverview';
import TickerDirectory from './components/TickerDirectory';
import TickerDetails from './components/TickerDetails';
import { SpeedInsights } from "@vercel/speed-insights/react"
import {
  API_BASE_URL,
  isSupabaseMode,
  supabaseFetch,
  supabaseFetchAll,
  computeStatsFromData,
  MOCK_STATUS,
  MOCK_STOCKS,
  MOCK_STATS,
  MOCK_TICKER_HOLDERS
} from './services/api';

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
        // Query latest timestamp
        const tsData = await supabaseFetch('stock_metadata?select=timestamp&order=timestamp.desc&limit=1');
        const latestTimestamp = tsData && tsData.length > 0 ? tsData[0].timestamp : null;
        setLastUpdated(latestTimestamp);

        // Fetch Stocks, Inst Holders, and Mutual Fund Holders in parallel
        const instQuery = 'institutional_holders?select=*';
        const mfQuery = 'mutual_fund_holders?select=*';

        const [stocksData, instData, mfData] = await Promise.all([
          supabaseFetchAll('stock_metadata?select=*&or=(category.eq.Mega-Cap,category.eq.Large-Cap)&order=symbol'),
          supabaseFetchAll(instQuery),
          supabaseFetchAll(mfQuery)
        ]);

        setStocks(stocksData);

        // Compute aggregate stats in memory (client-side)
        const computedStats = computeStatsFromData(stocksData, instData, mfData);
        setStats(computedStats);

        // Set Status
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
        const statusRes = await fetch(`${API_BASE_URL}/api/status`);
        const statusData = await statusRes.json();
        setStatus(statusData);
        setLastUpdated(statusData.last_updated);
        setIsApiOffline(false);

        const stocksRes = await fetch(`${API_BASE_URL}/api/stocks`);
        const stocksData = await stocksRes.json();
        setStocks(stocksData);

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
        let path = `stock_metadata?select=*,institutional_holders(*),mutual_fund_holders(*),stock_news(*)&symbol=eq.${ticker.toUpperCase() || ticker}`;

        const data = await supabaseFetch(path);
        if (data && data.length > 0) {
          const stockObj = data[0];
          const stockTimestamp = stockObj.timestamp;

          // Filter holders to only include those matching the stock's own last scrape timestamp
          const filteredInst = stockTimestamp
            ? (stockObj.institutional_holders || []).filter(h => h.timestamp === stockTimestamp)
            : (stockObj.institutional_holders || []);

          const filteredMf = stockTimestamp
            ? (stockObj.mutual_fund_holders || []).filter(h => h.timestamp === stockTimestamp)
            : (stockObj.mutual_fund_holders || []);

          const sortedInst = filteredInst.sort((a, b) => (b.value || 0) - (a.value || 0));
          const sortedMf = filteredMf.sort((a, b) => (b.value || 0) - (a.value || 0));

          setTickerHolders({
            stock: {
              symbol: stockObj.symbol,
              market_cap: stockObj.market_cap,
              category: stockObj.category,
              sector: stockObj.sector,
              industry: stockObj.industry
            },
            institutional_holders: sortedInst,
            mutual_fund_holders: sortedMf,
            news: stockObj.stock_news || []
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
    if (isSupabaseMode) return;
    try {
      if (isApiOffline) return;
      const res = await fetch(`${API_BASE_URL}/api/pipeline/logs`);
      if (res.ok) {
        const data = await res.json();
        setIsPipelineRunning(data.running);
        setPipelineLogs(data.logs || []);

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

  // Filter stocks dynamically
  const activeStocks = stocks.filter(stock => stock.deep_dive_captured === 'Yes');
  const filteredStocks = activeStocks.filter(stock => {
    const matchesSearch = stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (stock.sector && stock.sector.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (stock.industry && stock.industry.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory ? stock.category === selectedCategory : true;
    const matchesSector = selectedSector ? stock.sector === selectedSector : true;
    return matchesSearch && matchesCategory && matchesSector;
  });

  // Extract unique sectors and categories for filter options
  const uniqueSectors = [...new Set(activeStocks.map(s => s.sector).filter(Boolean))];
  const uniqueCategories = [...new Set(activeStocks.map(s => s.category).filter(Boolean))];

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <Header
        showAdmin={showAdmin}
        isApiOffline={isApiOffline}
        status={status}
        lastUpdated={lastUpdated}
        isPipelineRunning={isPipelineRunning}
        loading={loading}
        logsOpen={logsOpen}
        setLogsOpen={setLogsOpen}
        pipelineLogs={pipelineLogs}
        handleRunPipeline={handleRunPipeline}
        handleSeed={handleSeed}
      />

      {/* KPI Metrics Summary Bar */}
      <KpiMetrics stats={stats} stocksCount={stocks.length} />

      {/* Main Navigation tabs */}
      {/* REMARK: Navigation tabs. Gap 12px. Ensure buttons shrink or wrap cleanly on narrow screens. */}
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

      {/* VIEW 1: DASHBOARD OVERVIEW */}
      {activeView === 'dashboard' && (
        <DashboardOverview
          stats={stats}
          setSelectedTicker={setSelectedTicker}
          setActiveView={setActiveView}
        />
      )}

      {/* VIEW 2: STOCK & WHALE EXPLORER */}
      {activeView === 'stocks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
          {/* Search Input - placed at full width, matching the Header Section's width */}
          <div className="glass-card" style={{ padding: '16px 24px' }}>
            <div className="glass-input-wrapper" style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="glass-input"
                placeholder="Search symbol, sector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Ticker Directory and Ticker Details stacked vertically at full width */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <TickerDirectory
              selectedSector={selectedSector}
              setSelectedSector={setSelectedSector}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              uniqueSectors={uniqueSectors}
              uniqueCategories={uniqueCategories}
              filteredStocks={filteredStocks}
              selectedTicker={selectedTicker}
              setSelectedTicker={setSelectedTicker}
            />
            <TickerDetails
              tickerHolders={tickerHolders}
              lastUpdated={lastUpdated}
              holdersTab={holdersTab}
              setHoldersTab={setHoldersTab}
              isApiOffline={isApiOffline}
            />
          </div>
        </div>
      )}
       <div>
      {/* ... */}
      <SpeedInsights />
    </div>
      {/* Google AdSense Footer Leaderboard */}
      {/* <AdBanner slotId="4670133083" format="horizontal" /> */}

      {/* FOOTER */}
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
