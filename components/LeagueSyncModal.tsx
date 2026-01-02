"use client";

import React, { useState } from "react";
import { X, Info } from "lucide-react"; 

interface LeagueSyncModalProps {
  onClose?: () => void;
}

export default function LeagueSyncModal({ onClose }: LeagueSyncModalProps) {
  const [provider, setProvider] = useState<'YAHOO' | 'ESPN'>('YAHOO');

  // ESPN Form State
  const [leagueId, setLeagueId] = useState('');
  const [swid, setSwid] = useState('');
  const [espnS2, setEspnS2] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEspnSync = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Call our Proxy API
      const res = await fetch('/api/sync/espn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, espnS2, swid })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to sync with ESPN');

      // 2. Success! Save raw data to LocalStorage
      // CRITICAL FIX: Ensure we are saving the 'rawData' property we just added to the API
      if (data.rawData) {
          localStorage.setItem('espn_raw_data', JSON.stringify(data.rawData));
      }
      
      // Save metadata for the context to pick up
      localStorage.setItem('active_league_provider', 'ESPN');
      localStorage.setItem('active_team_id', `e.${leagueId}.${data.rawData?.teams?.[0]?.id || 1}`);

      // 3. Force a reload so the main page picks up the new data
      window.location.reload(); 
      
      if (onClose) onClose();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2 text-gray-800 text-center">Sync Your League</h2>
          <p className="text-gray-500 text-sm mb-6 text-center">
            Import your rosters to see availability status on the grid.
          </p>

          {/* PROVIDER SWITCHER */}
          <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setProvider('YAHOO')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                provider === 'YAHOO' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Yahoo
            </button>
            <button
              onClick={() => setProvider('ESPN')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                provider === 'ESPN' 
                  ? 'bg-red-600 text-white shadow-md' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ESPN
            </button>
          </div>

          {/* YAHOO CONTENT */}
          {provider === 'YAHOO' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-4 text-center">
                <p className="text-purple-800 text-sm font-medium">
                  One-click sync via secure OAuth.
                </p>
              </div>
              <a
                href="/api/auth/login"
                className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg text-center transition duration-200 shadow-lg shadow-purple-200"
              >
                Connect Yahoo Account
              </a>
            </div>
          )}

          {/* ESPN CONTENT */}
          {provider === 'ESPN' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">League ID</label>
                <input 
                  type="text"
                  value={leagueId}
                  onChange={(e) => setLeagueId(e.target.value)}
                  placeholder="e.g. 12345678"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                />
              </div>

              {/* Private League Section */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3 text-gray-700 font-bold text-xs uppercase tracking-wide">
                  <Info size={14} className="text-blue-500" />
                  Private League Keys (Optional)
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">swid (include {'{ }'})</label>
                    <input 
                      type="text"
                      value={swid}
                      onChange={(e) => setSwid(e.target.value)}
                      placeholder="{A1B2...}"
                      className="w-full p-2 bg-white border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:border-red-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">espn_s2 (long string)</label>
                    <input 
                      type="text"
                      value={espnS2}
                      onChange={(e) => setEspnS2(e.target.value)}
                      placeholder="AEC..."
                      className="w-full p-2 bg-white border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:border-red-400"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-xs bg-red-50 p-3 rounded border border-red-100">
                  {error}
                </div>
              )}

              <button
                onClick={handleEspnSync}
                disabled={isLoading}
                className={`w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 shadow-lg shadow-red-200 flex justify-center items-center ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Syncing...
                  </span>
                ) : (
                  'Sync ESPN League'
                )}
              </button>

              <div className="text-center">
                <a 
                  href="https://support.espn.com/hc/en-us/articles/115003845091-How-to-Find-Your-League-ID-swid-and-espn-s2" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                >
                  Where do I find these keys?
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}