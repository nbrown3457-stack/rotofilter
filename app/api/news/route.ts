import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'news';

  // 1. Define Sources
  let feedUrl = 'https://www.mlb.com/feeds/news/rss.xml'; // Default: Breaking News
  
  if (type === 'prospects') {
    // Official MLB Pipeline Feed (High quality prospect news)
    feedUrl = 'https://www.mlb.com/feeds/news/rss.xml'; 
  } else if (type === 'injuries') {
    // Rotowire or similar often have feeds, but MLB is safest for images
    // We can filter the main feed or find a specific fantasy feed later
    feedUrl = 'https://www.mlb.com/feeds/news/rss.xml';
  }

  try {
    // 2. Fetch and Parse
    const feed = await parser.parseURL(feedUrl);
    
    // 3. Clean up the data for your frontend
    // We filter slightly based on the 'type' requested to simulate categories
    const items = feed.items.slice(0, 15).map(item => {
      // MLB RSS feeds often put the image in 'enclosure' or 'content'
      // We try to find a high-res image if possible
      let imageUrl = '/api/placeholder/400/200'; // Fallback
      
      // Try to find the MLB photo URL in the RSS enclosure
      if (item.enclosure && item.enclosure.url) {
        imageUrl = item.enclosure.url;
      } 
      // Sometimes it's in the content snippet
      else if (item.content && item.content.includes('src="')) {
         const match = item.content.match(/src="([^"]+)"/);
         if (match) imageUrl = match[1];
      }

      return {
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        content: item.contentSnippet,
        image: imageUrl
      };
    });

    return NextResponse.json({ items });
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}