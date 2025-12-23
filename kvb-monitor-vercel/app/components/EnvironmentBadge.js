'use client';

import { useEffect, useState } from 'react';

export default function EnvironmentBadge() {
  const [environment, setEnvironment] = useState(null);

  useEffect(() => {
    const hostname = window.location.hostname;

    // Prüfe die Umgebung basierend auf der Domain
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      setEnvironment('LOCAL');
    } else if (hostname.startsWith('dev.') || hostname.includes('vercel.app')) {
      setEnvironment('DEV');
    }
    // Bei Production (kvb-monitor.de ohne dev.) wird nichts angezeigt
  }, []);

  // Zeige nichts in Production
  if (!environment) return null;

  const isLocal = environment === 'LOCAL';

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: isLocal ? '#7c3aed' : '#f59e0b',
      color: 'white',
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '700',
      fontFamily: 'Inter, system-ui, sans-serif',
      zIndex: 9999,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      letterSpacing: '0.5px',
      userSelect: 'none',
      pointerEvents: 'none',
    }}>
      {environment}
    </div>
  );
}
