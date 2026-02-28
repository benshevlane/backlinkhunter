'use client';

import { useState } from 'react';

export function GmailConnectButton() {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/gmail');
      if (!res.ok) {
        alert('Failed to start Gmail connection. Check server configuration.');
        return;
      }
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      alert('Failed to start Gmail connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:bg-slate-400"
    >
      {loading ? 'Connecting...' : 'Connect Gmail'}
    </button>
  );
}
