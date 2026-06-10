import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatUSD, formatPercent, formatShares } from '../utils/formatters';

/**
 * TickerDetails right-hand side detailed active profile, local totals, and tabular reports list.
 */
export default function TickerDetails({
  tickerHolders,
  lastUpdated,
  holdersTab,
  setHoldersTab,
  isApiOffline
}) {
  const [showRightShadow, setShowRightShadow] = useState(false);
  const tableContainerRef = useRef(null);

  const checkScroll = () => {
    const el = tableContainerRef.current;
    if (el) {
      const canScroll = el.scrollWidth > el.clientWidth;
      const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
      setShowRightShadow(canScroll && !isAtEnd);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkScroll();
    }, 50);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [tickerHolders, holdersTab]);

  return (
    <div className="glass-card min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Right panel: Active Stock holders detailed analytics */}
      {/* REMARK: Right panel uses min-w-0 to avoid horizontal scroll on mobile. All children components are designed with responsive wrapping/hiding. */}

      {tickerHolders ? (
        <>
          {/* Stock Profile info */}
          {/* REMARK: Stock Profile details header uses flex-wrap and space-between to align market capitalization right on desktop and stack under titles on mobile. */}
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
          {/* REMARK: local statistics grid uses responsive classes grid-cols-1 sm:grid-cols-2 gap-4 to stack stats vertically on mobile, and side-by-side on screens >=640px. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            {/* REMARK: card-tabs uses overflow-x: auto, flex-shrink: 0 and white-space: nowrap to allow horizontal scroll on mobile tab lists without expanding parent card container. */}
            <div className="card-tabs">
              <button
                className={`card-tab ${holdersTab === 'institutional' ? 'active' : ''}`}
                onClick={() => setHoldersTab('institutional')}
              >
                Institutional Holders
              </button>
              <button
                className={`card-tab ${holdersTab === 'mutual' ? 'active' : ''}`}
                onClick={() => setHoldersTab('mutual')}
              >
                Mutual Fund Holders
              </button>
              <button
                className={`card-tab ${holdersTab === 'news' ? 'active' : ''}`}
                onClick={() => setHoldersTab('news')}
              >
                Latest News
              </button>
            </div>

            {holdersTab === 'news' ? (
              !tickerHolders.news || tickerHolders.news.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No news articles found for this ticker. Run "Scrape Live" to fetch latest news.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 4px' }}>
                  {tickerHolders.news.map((article, idx) => {
                    const dateStr = article.publish_time
                      ? new Date(article.publish_time * 1000).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                      : 'N/A';
                    return (
                      <div key={idx} className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255, 255, 255, 0.03)', borderRadius: '10px' }}>
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontWeight: '600', fontSize: '15px', color: '#f8fafc', textDecoration: 'none', display: 'inline-block', marginBottom: '8px' }}
                          className="interactive"
                        >
                          {article.title}
                        </a>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>{article.publisher}</span>
                          <span>•</span>
                          <span>{dateStr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="table-scroll-wrapper">
                <div
                  className="table-container"
                  ref={tableContainerRef}
                  onScroll={checkScroll}
                >
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
                            <th className="hidden sm:table-cell">Date Reported</th>
                            <th className="hidden md:table-cell" style={{ textAlign: 'right' }}>Shares</th>
                            <th style={{ textAlign: 'right' }}>Value</th>
                            <th style={{ textAlign: 'right' }}>% Out</th>
                            <th style={{ textAlign: 'right' }}>Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tickerHolders.institutional_holders.map((holder, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: '600' }}>{holder.holder}</td>
                              <td className="hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{holder.date_reported || 'N/A'}</td>
                              <td className="hidden md:table-cell" style={{ textAlign: 'right' }}>{formatShares(holder.shares)}</td>
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
                            <th className="hidden sm:table-cell">Date Reported</th>
                            <th className="hidden md:table-cell" style={{ textAlign: 'right' }}>Shares</th>
                            <th style={{ textAlign: 'right' }}>Value</th>
                            <th style={{ textAlign: 'right' }}>% Out</th>
                            <th style={{ textAlign: 'right' }}>Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tickerHolders.mutual_fund_holders.map((holder, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: '600' }}>{holder.holder}</td>
                              <td className="hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{holder.date_reported || 'N/A'}</td>
                              <td className="hidden md:table-cell" style={{ textAlign: 'right' }}>{formatShares(holder.shares)}</td>
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
                {showRightShadow && <div className="table-scroll-shadow" />}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Select a stock from the directory to view its whale backing analysis.
        </div>
      )}

    </div>
  );
}
