import React, { useState, useEffect, useRef } from 'react';
import { Newspaper, TrendingUp, Activity, X } from 'lucide-react';

const SOURCES = [
  { id: 'prospects', name: 'Prospects', handle: 'MLBPipeline', icon: <TrendingUp size={14} /> },
  { id: 'news', name: 'Breaking', handle: 'JeffPassan', icon: <Newspaper size={14} /> },
  { id: 'injuries', name: 'Lineups', handle: 'Underdog__MLB', icon: <Activity size={14} /> },
];

export const NewsDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState(SOURCES[0]);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // 1. Load the Twitter/X Script manually (No library needed)
  useEffect(() => {
    const scriptId = "twitter-wjs";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // 2. Force the widget to reload when you switch tabs or open the drawer
  useEffect(() => {
    if (isOpen && (window as any).twttr) {
      // Clear previous content to prevent duplicates
      if (feedContainerRef.current) {
        feedContainerRef.current.innerHTML = ""; 
      }
      
      // Re-create the timeline element
      const link = document.createElement("a");
      link.className = "twitter-timeline";
      link.setAttribute("data-theme", "dark");
      link.setAttribute("data-noheader", "true");
      link.setAttribute("data-nofooter", "true");
      link.setAttribute("data-chrome", "transparent noheader nofooter noborders");
      link.href = `https://twitter.com/${activeTab.handle}`;
      link.innerText = `Loading ${activeTab.name}...`;

      if (feedContainerRef.current) {
        feedContainerRef.current.appendChild(link);
        // Tell Twitter to scan the new element and render it
        (window as any).twttr.widgets.load(feedContainerRef.current);
      }
    }
  }, [activeTab, isOpen]);

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

    header: {
      padding: '16px', background: '#000', borderBottom: '1px solid #333',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    } as React.CSSProperties,

    tabContainer: {
      display: 'flex', gap: '8px', padding: '10px', background: '#1a1a1a', borderBottom: '1px solid #333'
    } as React.CSSProperties,

    tab: (isActive: boolean): React.CSSProperties => ({
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
      background: isActive ? '#1b5e20' : '#222',
      color: isActive ? '#fff' : '#888',
      transition: 'all 0.2s'
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabContainer}>
          {SOURCES.map(source => (
            <button key={source.id} onClick={() => setActiveTab(source)} style={styles.tab(activeTab.id === source.id)}>
              {source.icon} {source.name}
            </button>
          ))}
        </div>

        {/* Twitter Feed Container */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#000', padding: '0px', position: 'relative' }} className="hide-scrollbar">
          
          {/* Skeleton Loader (Shows behind the feed while loading) */}
          <div style={{ padding: '20px', position: 'absolute', width: '100%', zIndex: 0 }}>
             {[1,2,3,4,5].map(i => (
                <div key={i} style={{ marginBottom: '20px', display: 'flex', gap: '10px', opacity: 0.2 }}>
                   <div style={{ width: 40, height: 40, background: '#333', borderRadius: '50%' }} />
                   <div style={{ flex: 1 }}>
                      <div style={{ width: '30%', height: 10, background: '#333', marginBottom: 6, borderRadius: 4 }} />
                      <div style={{ width: '100%', height: 60, background: '#333', borderRadius: 4 }} />
                   </div>
                </div>
             ))}
          </div>
          
          {/* The Actual Feed - Populated by the useEffect above */}
          <div 
            ref={feedContainerRef} 
            style={{ position: 'relative', zIndex: 10, minHeight: '100%', padding: '10px' }} 
          />
        </div>
      </div>
    </>
  );
};