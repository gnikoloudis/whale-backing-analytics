import React, { useEffect } from 'react';

export default function AdBanner({ slotId, format = 'horizontal', style = {} }) {
  useEffect(() => {
    // Only push if we have a valid slotId and window.adsbygoogle exists
    if (slotId && slotId !== 'YOUR_SLOT_ID') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn("AdSense failed to push ad unit: ", e);
      }
    }
  }, [slotId]);

  // If slotId is missing or placeholder, show placeholder locally for developer clarity
  const isPlaceholder = !slotId || slotId === 'YOUR_SLOT_ID';
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isPlaceholder) {
    if (isDev) {
      return (
        <div className="glass-card ad-container" style={{ padding: '24px 12px', textAlign: 'center', margin: '20px 0', border: '1px dashed rgba(255, 255, 255, 0.15)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', ...style }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: '600' }}>Google AdSense Placeholder</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Footer Leaderboard (Option 1) will render here.</div>
          <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px' }}>Provide a valid 'slotId' once your site is approved.</div>
        </div>
      );
    }
    return null; // Don't render blank boxes in production
  }

  return (
    <div className="glass-card ad-container" style={{ padding: '12px', textAlign: 'center', margin: '20px 0', border: '1px solid rgba(255, 255, 255, 0.03)', borderRadius: '12px', overflow: 'hidden', ...style }}>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'left', paddingLeft: '8px' }}>Advertisement</div>
      <ins className="adsbygoogle"
           style={{ display: 'block', minHeight: '90px' }}
           data-ad-client="ca-pub-2974954307281469"
           data-ad-slot={slotId}
           data-ad-format={format}
           data-full-width-responsive="true" />
    </div>
  );
}
