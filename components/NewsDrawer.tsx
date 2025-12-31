"use client"; // <--- CRITICAL: This was missing!

import React, { useState, useEffect, useRef } from 'react';
import { Newspaper, TrendingUp, Activity, X, ExternalLink } from 'lucide-react';

const SOURCES = [
  { id: 'prospects', name: 'Prospects', handle: 'MLBPipeline', icon: <TrendingUp size={14} /> },
  { id: 'news', name: 'Breaking', handle: 'JeffPassan', icon: <Newspaper size={14} /> },
  { id: 'injuries', name: 'Lineups', handle: 'Underdog__MLB', icon: <Activity size={14} /> },
];

export const NewsDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState(SOURCES[0]);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // 1. Initialize Twitter Widget Script
  useEffect(() => {
    if (!(window as any).twttr) {
      console.log("Fetching Twitter Script...");
      (window as any).twttr = (function (d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0],
          t = (window as any).twttr || {};
        if (d.getElementById(id)) return t;
        js = d.createElement(s) as HTMLScriptElement;
        js.id = id;
        js.src = "https://platform.twitter.com/widgets.js";
        if (fjs && fjs.parentNode) {
            fjs.parentNode.insertBefore(js, fjs);
        } else {
            document.head.appendChild(js);
        }
        t._e = [];
        t.ready = function (f: any) {
          console.log("Twitter Script Ready!"); 
          t._e.push(f);
        };
        return t;
      })(document, "script", "twitter-wjs");
    }
  }, []);

  // 2. Render the Timeline
  useEffect(() => {
    if (isOpen && (window as any).twttr) {
      console.log("Attempting to render feed for:", activeTab.handle);
      
      // Clear previous content
      if (feedContainerRef.current) {
        feedContainerRef.current.innerHTML = "";
      }

      // Create the link element
      const link = document.createElement("a");
      link.className = "twitter-timeline";
      link.setAttribute("data-theme", "dark");
      link.setAttribute("data-noheader", "true");
      link.setAttribute("data-nofooter", "true");
      link.setAttribute("data-chrome", "transparent noheader nofooter noborders");
      link.setAttribute("data-height", "800"); 
      link.href = `https://twitter.com/${activeTab.handle}`;
      // This text is what you see if the widget fails to load
      link.innerText = `Loading Tweets from @${activeTab.handle}...`; 
      link.style.color = "#fff"; // Make sure fallback text is visible

      if (feedContainerRef.current) {
        feedContainerRef.current.appendChild(link);
        
        // Force Twitter to scan the new element
        (window as any).twttr.ready((twttr: any) => {
            console.log("Scanning DOM for widgets...");
            twttr.widgets.load(feedContainerRef.current);
        });
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
          
          {/* FALLBACK BUTTON: Always visible at the top so users can click out if it fails */}
          <div style={{ padding: '16px', borderBottom: '1px solid #222' }}>
             <a 
               href={`https://twitter.com/${activeTab.handle}`} 
               target="_blank" 
               rel="noreferrer"
               style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px', background: '#1b5e20', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontSize: '12px', fontWeight: 800 }}
             >
                <ExternalLink size={14} /> View @{activeTab.handle} on X
             </a>
             <p style={{ fontSize: '10px', color: '#666', textAlign: 'center', marginTop: '8px' }}>
               Feed taking a while? Browser privacy settings may block embeds.
             </p>
          </div>
          
          {/* The Actual Feed */}
          <div 
            ref={feedContainerRef} 
            style={{ position: 'relative', zIndex: 10, minHeight: '100%', padding: '10px' }} 
          />
        </div>
      </div>
    </>
  );
};