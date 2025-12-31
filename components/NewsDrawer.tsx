"use client";

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

  // 1. Initialize Twitter Widget Script (Robust Setup)
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).twttr) {
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
          t._e.push(f);
        };
        return t;
      })(document, "script", "twitter-wjs");
    }
  }, []);

  // 2. Render the Timeline (The "Force Build" Method)
  // This replaces the old "scan" method which was failing on your site.
  useEffect(() => {
    if (isOpen && (window as any).twttr) {
      
      // Clear previous content to prevent duplicates/errors
      if (feedContainerRef.current) {
        feedContainerRef.current.innerHTML = "";
      }

      (window as any).twttr.ready((twttr: any) => {
        // We use createTimeline instead of load() because it doesn't rely on scanning the DOM.
        // It programmatically inserts the feed EXACTLY where we want it.
        twttr.widgets.createTimeline(
          {
            sourceType: "profile",
            screenName: activeTab.handle
          },
          feedContainerRef.current,
          {
            height: 800,
            theme: "dark",
            chrome: "transparent noheader nofooter noborders",
            dnt: true // "Do Not Track" - helps bypass some privacy blockers
          }
        ).then(() => {
            console.log("Timeline created successfully for", activeTab.handle);
        });
      });
    }
  }, [activeTab, isOpen]);

  // 3. Typed Styles (Fixes the Red Squiggly Error)
  const styles: { [key: string]: React.CSSProperties | ((isActive: boolean) => React.CSSProperties) } = {
    overlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 99998,
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'opacity 0.3s'
    },
    drawer: {
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: '400px',
      background: '#111',
      borderLeft: '1px solid #333',
      zIndex: 99999,
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      padding: '16px',
      background: '#000',
      borderBottom: '1px solid #333',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    tabContainer: {
      display: 'flex',
      gap: '8px',
      padding: '10px',
      background: '#1a1a1a',
      borderBottom: '1px solid #333'
    },
    tab: (isActive: boolean) => ({
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      padding: '8px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      background: isActive ? '#1b5e20' : '#222',
      color: isActive ? '#fff' : '#888',
      transition: 'all 0.2s'
    })
  };

  return (
    <>
      <div style={styles.overlay as React.CSSProperties} onClick={onClose} />
      <div style={styles.drawer as React.CSSProperties}>
        
        {/* Header */}
        <div style={styles.header as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', background: '#4caf50', borderRadius: '50%', boxShadow: '0 0 10px #4caf50' }} />
            <span style={{ fontWeight: 900, color: '#fff', fontSize: '16px' }}>ROTO<span style={{color:'#4caf50'}}>FILTER</span></span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabContainer as React.CSSProperties}>
          {SOURCES.map(source => (
            <button key={source.id} onClick={() => setActiveTab(source)} style={(styles.tab as Function)(activeTab.id === source.id)}>
              {source.icon} {source.name}
            </button>
          ))}
        </div>

        {/* Twitter Feed Container */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#000', padding: '0px', position: 'relative' }} className="hide-scrollbar">
          
          {/* FALLBACK BUTTON */}
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
          
          {/* The Actual Feed (Populated via API) */}
          <div 
            ref={feedContainerRef} 
            style={{ position: 'relative', zIndex: 10, minHeight: '100%', padding: '10px' }} 
          />
        </div>
      </div>
    </>
  );
};