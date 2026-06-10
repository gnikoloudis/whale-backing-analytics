import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * TickerDirectory left-hand side search, filter and ticker selector list.
 */
export default function TickerDirectory({
  selectedSector,
  setSelectedSector,
  selectedCategory,
  setSelectedCategory,
  uniqueSectors,
  uniqueCategories,
  filteredStocks,
  selectedTicker,
  setSelectedTicker
}) {
  return (
    <div className="glass-card min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
      {/* Top Header Row with Title and Filters Inline */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ticker Directory</h2>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Sector filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Sector:</label>
            <select
              className="glass-select"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              <option value="">All Sectors</option>
              {uniqueSectors.map((sect, i) => <option key={i} value={sect}>{sect}</option>)}
            </select>
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Category:</label>
            <select
              className="glass-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              <option value="">All Categories</option>
              {uniqueCategories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Stocks List - Grid layout for full-width presentation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px', marginTop: '8px' }}>
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
  );
}
