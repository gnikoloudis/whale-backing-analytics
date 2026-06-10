import React, { useEffect, useRef } from 'react';
import { Database, RefreshCw, AlertTriangle, UploadCloud, FileText } from 'lucide-react';

/**
 * Responsive Header component with status indicators, admin capabilities and terminal log drawer.
 */
export default function Header({
  showAdmin,
  isApiOffline,
  status,
  lastUpdated,
  isPipelineRunning,
  loading,
  logsOpen,
  setLogsOpen,
  pipelineLogs,
  handleRunPipeline,
  handleSeed
}) {
  const terminalEndRef = useRef(null);

  // Auto scroll console log window to bottom when logs change
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [pipelineLogs]);

  return (
    <>
      {/* REMARK: Parent container is styled with dashboard-container in index.css. Max width 1440px, padding 24px (16px on mobile). */}
      {/* ==========================================
          HEADER SECTION
          ========================================== */}
      {/* REMARK: Header layout. Flexwrap: wrap handles responsiveness by stacking title and buttons on smaller screens. */}
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
              <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)' }}></span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Status: Online</span>
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
    </>
  );
}
