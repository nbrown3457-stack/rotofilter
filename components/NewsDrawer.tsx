"use client";

import React, { useState, useEffect } from 'react';
import { Newspaper, TrendingUp, Activity, X } from 'lucide-react';

const SOURCES = [
  // 1. UPDATES (Front & Center - Images Enabled)
  { id: 'updates', name: 'Updates', icon: <Activity size={14} /> },
  // 2. BREAKING (Text Only)
  { id: 'breaking', name: 'Breaking', icon: <Newspaper size={14} /> },
  // 3. PROSPECTS (Text Only)
  { id: 'prospects', name: 'Prospects', icon: <TrendingUp size={14} /> },
];

// --- NEWS CARD COMPONENT ---
// Accepts 'showImage' to toggle layout modes
const NewsCard = ({ item, showImage }: { item: any; showImage: boolean }) => {
  const [imgSrc, setImgSrc] = useState(item.image);
  const [hasError, setHasError] = useState(false);

  return (
    <a 
      href={item.link} 
      target="_blank" 
      rel="noopener noreferrer"
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        textDecoration: 'none', 
        background: '#1a1a1a', 
        borderRadius: '8px', 
        overflow: 'hidden', 
        border: '1px solid #333', 
        transition: 'transform 0.2s' 
      }}
    >
      {/* ONLY RENDER IMAGE IF showImage IS TRUE */}
      {showImage && (
        <div style={{ height: '140px', overflow: 'hidden', background: '#222', position: 'relative' }}>
          <img 
            src={hasError ? "https://www.mlbstatic.com/team-logos/league-on-dark.svg" : imgSrc} 
            alt="News" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: hasError ? 'contain' : 'cover',
              padding: hasError ? '20px' : '0'
            }}
            onError={() => { if (!hasError) setHasError(true); }} 
          />
        </div>
      )}
      
      <div style={{ padding: '16px' }}>
        <h4 style={{ 
          color: '#fff', 
          fontSize: '14px', 
          fontWeight: 700, 
          margin: '0 0 8px 0', 
          lineHeight: '1.4' 
        }}>
          {item.title}
        </h4>
        
        {/* Slightly larger summary text since there is no image on some cards */}
        <p style={{ 
          color: '#bbb', 
          fontSize: '12px', 
          margin: 0, 
          lineHeight: '1.5', 
          display: '-webkit-box', 
          WebkitLineClamp: showImage ? 2 : 4, // Show more text if no image
          WebkitBoxOrient: 'vertical', 
          overflow: 'hidden' 
        }}>
          {item.summary ? item.summary.replace(/<[^>]*>?/gm, '') : ''}
        </p>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginTop: '12px', 
          borderTop: '1px solid #333', 
          paddingTop: '8px' 
        }}>
            <span style={{ color: '#4caf50', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>READ MORE</span>
            <span style={{ color: '#666', fontSize: '10px' }}>{new Date(item.pubDate).toLocaleDateString()}</span>
        </div>
      </div>
    </a>
  );
};

export const NewsDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState(SOURCES[0]); // Defaults to Updates
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setNewsItems([]); 
      
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

  const styles: { [key: string]: React.CSSProperties | ((isActive: boolean) => React.CSSProperties) } = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 99998, opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none', transition: 'opacity 0.3s' },
    drawer: { position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '400px', background: '#111', borderLeft: '1px solid #333', zIndex: 99999, transform: isOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', flexDirection: 'column' },
    header: { padding: '16px', background: '#000', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    tabContainer: { display: 'flex', gap: '8px', padding: '10px', background: '#1a1a1a', borderBottom: '1px solid #333' },
    tab: (isActive: boolean) => ({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: isActive ? '#1b5e20' : '#222', color: isActive ? '#fff' : '#888', transition: 'all 0.2s' })
  };

  return (
    <>
      <div style={styles.overlay as React.CSSProperties} onClick={onClose} />
      <div style={styles.drawer as React.CSSProperties}>
        <div style={styles.header as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', background: '#4caf50', borderRadius: '50%', boxShadow: '0 0 10px #4caf50' }} />
            <span style={{ fontWeight: 900, color: '#fff', fontSize: '16px' }}>ROTO<span style={{color:'#4caf50'}}>FILTER</span></span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={styles.tabContainer as React.CSSProperties}>
          {SOURCES.map(source => (
            <button key={source.id} onClick={() => setActiveTab(source)} style={(styles.tab as any)(activeTab.id === source.id)}>
              {source.icon} {source.name}
            </button>
          ))}
        </div>

        <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', background: '#000', padding: '16px' }}>
          {loading ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: 0.5 }}>
                {[1,2,3].map(i => (<div key={i} style={{ height: '100px', background: '#222', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />))}
             </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {newsItems.map((item, idx) => (
                <NewsCard 
                  key={idx} 
                  item={item} 
                  showImage={activeTab.id === 'updates'} // <--- ONLY UPDATES GET IMAGES
                />
              ))}
              {newsItems.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontSize: '12px' }}>No updates found.</div>}
            </div>
          )}
        </div>
      </div>
    </>
  );
};