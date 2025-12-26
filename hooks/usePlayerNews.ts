// statfilter/hooks/usePlayerNews.ts
import { useState, useEffect } from 'react';

export function usePlayerNews(mlbId: string) {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      // 1. Better Guard: Skip the fetch if the ID is missing, blank, or looks like a local demo ID (like 'p1')
      if (!mlbId || mlbId === "" || mlbId === "undefined" || isNaN(Number(mlbId))) {
        setLoading(false);
        setArticles([]);
        return;
      }

      try {
        setLoading(true);
        
        // Official search endpoint
        const url = `https://statsapi.mlb.com/api/v1/content/search?tagNames=playerid-${mlbId}&limit=5`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        // 2. NEW LOGIC: Handle 404 gracefully. 
        // Many minor league or retired players return 404 if they have NO news articles.
        if (response.status === 404) {
          setArticles([]);
          setLoading(false);
          return;
        }

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();

        if (data.docs && data.docs.length > 0) {
          const cleanData = data.docs.map((item: any) => ({
            headline: item.headline,
            description: item.blurb || "Latest update...",
            url: `https://www.mlb.com/news/${item.slug}`,
            date: item.date ? new Date(item.date).toLocaleDateString() : 'Recent',
            image: item.image?.cuts?.find((c: any) => c.width > 400)?.src || item.image?.cuts?.[0]?.src || ''
          }));
          setArticles(cleanData);
        } else {
          setArticles([]);
        }
      } catch (err) {
        // Log errors to console for your eyes, but keep UI clean
        console.warn("News fetch skipped/failed for ID:", mlbId);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
  }, [mlbId]);

  return { articles, loading };
}