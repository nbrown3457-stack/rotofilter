"use client";

import React, { useState, useEffect } from 'react';
import { Newspaper, TrendingUp, Activity, X, ExternalLink, RefreshCw } from 'lucide-react';

const SOURCES = [
  { id: 'news', name: 'Breaking', icon: <Newspaper size={14} /> },
  { id: 'prospects', name: 'Prospects', icon: <TrendingUp size={14} /> },
  { id: 'injuries', name: 'Lineups', icon: <Activity size={14} /> },
];

export const NewsDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState(SOURCES[0]);
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch News from our internal API
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(`/api/news?type=${activeTab.id}`)
        .then(res => res.json())
        .then(data => {
          setNewsItems(data.items || []);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [isOpen, activeTab]);

  const styles = {
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
      backdropFilter: 'blur(4px)', zIndex: 99998,
      opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'opacity 0.3s'
    } as React.CSSProperties,

    drawer: {
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: '100%', maxWidth: '400px', background: '#111', 
      borderLeft: '1px solid #333', zIndex: 99999,
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex', flexDirection: 'column'
    } as React.CSSProperties,
    
    // ... (Keep your other styles for header/tabs same as before)
    header: { padding: '16px', background: '#000', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    tabContainer: { display: 'flex', gap: '8px', padding: '10px', background: '#1a1a1a', borderBottom: '1px solid #333' } as React.CSSProperties,
    tab: (isActive: boolean): React.CSSProperties => ({
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
      background: isActive ? '#1b5e20' : '#222', color: isActive ? '#fff' : '#888', transition: 'all 0.2s'
    })
  };

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.drawer}>
        
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', background: '#4caf50', borderRadius: '50%', boxShadow: '0 0 10px #4caf50' }} />
            <span style={{ fontWeight: 900, color: '#fff', fontSize: '16px' }}>ROTO<span style={{color:'#4caf50'}}>FILTER</span></span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {/* Tabs */}
        <div style={styles.tabContainer}>
          {SOURCES.map(source => (
            <button key={source.id} onClick={() => setActiveTab(source)} style={(styles.tab as any)(activeTab.id === source.id)}>
              {source.icon} {source.name}
            </button>
          ))}
        </div>

        {/* News Feed Content */}
        <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', background: '#000', padding: '16px' }}>
          
          {loading ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: 0.5 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ height: '100px', background: '#222', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
                ))}
             </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {newsItems.map((item, idx) => (
                <a 
                  key={idx} 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333', transition: 'transform 0.2s' }}
                >
                  {/* Image */}
                  {item.image && (
                    <div style={{ height: '140px', overflow: 'hidden' }}>
                      <img src={item.image} alt="News" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div style={{ padding: '12px' }}>
                    <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0', lineHeight: '1.4' }}>{item.title}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                       <span style={{ color: '#4caf50', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>MLB.com</span>
                       <span style={{ color: '#666', fontSize: '10px' }}>{new Date(item.pubDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </a>
              ))}
              
              {newsItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontSize: '12px' }}>
                  No news found right now.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};