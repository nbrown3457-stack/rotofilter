"use client";
import React, { useEffect, useState } from 'react';

export const PlayerNewsFeed = ({ mlbId, playerName }: { mlbId: number, playerName: string }) => {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        // 1. Try the Content Endpoint first (Most accurate for tagged news)
        const contentRes = await fetch(`https://statsapi.mlb.com/api/v1/people/${mlbId}/content`);
        const contentData = await contentRes.json();
        
        let articles = contentData.editorial?.articles?.items || [];

        // 2. If ID-specific content is empty (common in off-season), search the Global News Wire
        if (articles.length === 0 && playerName) {
          const searchRes = await fetch(`https://statsapi.mlb.com/api/v1/news?search=${encodeURIComponent(playerName)}&limit=10`);
          const searchData = await searchRes.json();
          articles = searchData.items || searchData.articles || [];
        }

        // 3. Third Resort: Filter general recent news locally for the player's name
        if (articles.length === 0) {
          const generalRes = await fetch(`https://statsapi.mlb.com/api/v1/news?limit=100`);
          const generalData = await generalRes.json();
          const allNews = generalData.items || generalData.articles || [];
          articles = allNews.filter((item: any) => {
            const content = `${item.headline} ${item.blurb} ${item.description}`.toLowerCase();
            return content.includes(playerName.toLowerCase());
          });
        }

        setNews(articles);
      } catch (err) {
        console.error("News Feed Error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (playerName) fetchNews();
  }, [mlbId, playerName]);

  if (loading) return <div style={{ padding: 20, fontSize: 12, color: '#666' }}>Scanning MLB news for <strong>{playerName}</strong>...</div>;
  
  if (news.length === 0) return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>No recent stories found mentioning {playerName}.</p>
      <p style={{ fontSize: '11px', color: '#999' }}>MLB news tagging may be limited for this player during the off-season transition.</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', color: '#1b5e20' }}>
          {playerName} News Wire
        </h3>
        <span style={{ fontSize: '10px', color: '#aaa', fontWeight: 700 }}>MLB NETWORK DATA</span>
      </div>
      
      {news.map((item, idx) => {
        const publishDate = new Date(item.date || item.datetime);
        const isRecent = (new Date().getTime() - publishDate.getTime()) / (1000 * 3600) < 168; // 7 days

        return (
          <div key={idx} style={{ paddingLeft: '15px', borderLeft: '3px solid #eee', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', color: '#999', fontWeight: 800 }}>
                {publishDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {isRecent && (
                <span style={{ background: '#4caf50', color: '#fff', fontSize: '8px', fontWeight: 900, padding: '1px 5px', borderRadius: '4px' }}>
                  RECENT
                </span>
              )}
            </div>
            <a 
              href={item.url || `https://www.mlb.com/news/${item.slug}`} 
              target="_blank" 
              rel="noreferrer" 
              style={{ textDecoration: 'none' }}
            >
              <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#0d47a1', fontWeight: 800, lineHeight: 1.3 }}>
                {item.headline || item.title}
              </h4>
            </a>
            <p style={{ margin: 0, fontSize: '12px', color: '#444', lineHeight: 1.5 }}>
              {item.blurb || item.description || item.abstract || "Click headline for full summary."}
            </p>
          </div>
        );
      })}
    </div>
  );
};