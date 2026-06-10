import React from 'react';
import { Users } from 'lucide-react';
import { formatUSD, formatPercent } from '../utils/formatters';

/**
 * DashboardOverview displays charts, sector allocation and top whale summaries.
 */
export default function DashboardOverview({ stats, setSelectedTicker, setActiveView }) {
  if (!stats) return null;

  return (
    /* REMARK: dashboard-grid controls this layout: 1.2fr 0.8fr columns on desktop, collapses to 1fr on mobile.
       This ensures Sector Distribution stacks physically below the Whale Backing Comparison card. */
    <div className="dashboard-grid animate-fade-in">

      {/* Institutional vs Mutual Fund backing Value Bar Chart */}
      {/* REMARK: Horizontal bar chart for mobile readability. Uses CSS/HTML flex layout with percentage widths for maximum responsiveness.
         Clicking a ticker label redirects the user directly to the Stock & Whale Explorer tab for that symbol. */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Whale Backing Comparison</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Institutional vs Mutual Fund dollar values for top assets</p>
        </div>

        {/* Custom Responsive Grouped Bar Chart */}
        <div className="chart-card-content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
            {stats.top_institutional_stocks.slice(0, 8).map((stock, idx) => {
              const instVal = stock.value;
              const mfVal = stats.top_mutual_fund_stocks.find(s => s.ticker === stock.ticker)?.value || 0;
              const maxVal = Math.max(...stats.top_institutional_stocks.map(s => s.value));

              // Calculate widths proportionally
              const instWidth = `${(instVal / maxVal * 100).toFixed(1)}%`;
              const mfWidth = `${(mfVal / maxVal * 100).toFixed(1)}%`;

              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                  {/* Ticker label */}
                  <span
                    style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', cursor: 'pointer', width: '50px', flexShrink: 0 }}
                    onClick={() => {
                      setSelectedTicker(stock.ticker);
                      setActiveView('stocks');
                    }}
                    className="interactive"
                  >
                    {stock.ticker}
                  </span>

                  {/* Horizontal Bars Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
                    {/* Institutional bar */}
                    <div
                      style={{
                        width: instWidth,
                        height: '8px',
                        background: 'linear-gradient(to right, var(--accent-primary), #818cf8)',
                        borderRadius: '0 4px 4px 0',
                        boxShadow: '0 0 6px rgba(99,102,241,0.15)'
                      }}
                      title={`Institutional: ${formatUSD(instVal)}`}
                    />
                    {/* Mutual Fund bar */}
                    <div
                      style={{
                        width: mfWidth,
                        height: '8px',
                        background: 'linear-gradient(to right, var(--accent-tertiary), #fb7185)',
                        borderRadius: '0 4px 4px 0',
                        boxShadow: '0 0 6px rgba(244,63,94,0.15)'
                      }}
                      title={`Mutual Fund: ${formatUSD(mfVal)}`}
                    />
                  </div>
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
      {/* REMARK: Sector Distribution. Placed below Whale Backing Comparison in the JSX so it wraps underneath on mobile layout stacks. */}
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
      {/* REMARK: Uses class col-span-2-desktop (defined in index.css) to span across 2 columns on desktop,
         but collapses to 1 column width on tablet/mobile screens to fit the viewport width. */}
      <div className="glass-card col-span-2-desktop">
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
  );
}
