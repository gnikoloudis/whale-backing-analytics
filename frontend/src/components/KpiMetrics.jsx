import React from 'react';
import { formatUSD } from '../utils/formatters';

/**
 * KPI stats metric blocks showing consolidated values.
 */
export default function KpiMetrics({ stats, stocksCount }) {
  if (!stats) return null;

  return (
    /* REMARK: grid-cols-4 template stacks 1 column on mobile (<640px), 2 columns on tablet (<1024px), and 4 columns on desktop. */
    <div className="grid-cols-4 animate-fade-in">
      <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
        <div className="stat-label">Tracked Companies</div>
        <div className="stat-value">{stocksCount}</div>
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
  );
}
