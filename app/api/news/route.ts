import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

// 1. Configure Parser to explicitly look for "media:content"
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['description', 'description'], // RotoWire often puts updates here
    ],
  },
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'news';

  // 2. Define DISTINCT Sources
  let feedUrl = '';

  switch (type) {
    case 'prospects':
      // Official MiLB (Minor League) Feed - 100% Prospect focused
      feedUrl = 'https://www.milb.com/feeds/news/rss.xml';
      break;
    case 'injuries':
      // Rotowire MLB News - Best for Lineups/Injuries
      feedUrl = 'https://www.rotowire.com/rss/news.htm?sport=mlb'; 
      break;
    case 'news':
    default:
      // Official MLB Breaking News
      feedUrl = 'https://www.mlb.com/feeds/news/rss.xml';
      break;
  }

  try {
    const feed = await parser.parseURL(feedUrl);
    
    const items = feed.items.slice(0, 20).map(item => {
      let imageUrl = '/api/placeholder/400/200'; // Default Fallback

      // --- IMAGE FINDING LOGIC ---
      
      // 1. Try "enclosure" (Standard)
      if (item.enclosure && item.enclosure.url) {
        imageUrl = item.enclosure.url;
      }
      // 2. Try "media:content" (MLB/MiLB standard)
      // @ts-ignore
      else if (item.mediaContent && item.mediaContent.$?.url) {
        // @ts-ignore
        imageUrl = item.mediaContent.$.url;
      }
      // @ts-ignore
      else if (item.mediaContent && item.mediaContent.url) {
        // @ts-ignore
        imageUrl = item.mediaContent.url;
      }
      // 3. Try HTML Scrape (Rotowire often puts images in description)
      else if (item.content || item.description) {
         const html = item.content || item.description || '';
         const match = html.match(/src=["']([^"']+)["']/);
         if (match) imageUrl = match[1];
      }

      // Cleanup: Rotowire images are sometimes relative (missing https)
      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/api')) {
          // If it's just a path, it might be safer to revert to placeholder 
          // unless we know the base domain.
          imageUrl = '/api/placeholder/400/200'; 
      }

      return {
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        // Rotowire puts the actual player update in 'description', MLB uses 'contentSnippet'
        summary: item.contentSnippet || item.description || '',
        image: imageUrl
      };
    });

    // Return with "no-store" header to prevent caching same results
    return NextResponse.json({ items }, { 
      headers: { 'Cache-Control': 'no-store, max-age=0' } 
    });
    
  } catch (error) {
    console.error("RSS Error:", error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}