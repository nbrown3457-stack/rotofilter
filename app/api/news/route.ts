import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

type CustomItem = {
  image?: { url: string };
  mediaContent?: any;
  enclosure?: { url: string };
} & Parser.Item;

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['description', 'description'],
      ['content:encoded', 'contentEncoded'],
      ['image', 'image'], 
    ],
  },
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'updates';

  let feedUrl = '';

  // --- SIMPLIFIED SOURCES ---
  switch (type) {
    case 'updates':
      // CBS Sports (Kept for images/roster moves)
      feedUrl = 'https://www.cbssports.com/rss/headlines/mlb/'; 
      break;
    case 'prospects':
      // MLB Trade Rumors Prospects (Reliable text feed)
      feedUrl = 'https://www.mlbtraderumors.com/prospects/feed';
      break;
    case 'breaking':
    default:
      // Yahoo Sports (Good general news source)
      feedUrl = 'https://sports.yahoo.com/mlb/rss/';
      break;
  }

  try {
    const feed = await parser.parseURL(feedUrl);
    
    const items = feed.items.slice(0, 20).map((item: CustomItem) => {
      let imageUrl = null;

      // --- IMAGE LOGIC (Primarily used for 'updates' tab now) ---
      if (item.image && item.image.url) imageUrl = item.image.url;
      else if (item.enclosure && item.enclosure.url) imageUrl = item.enclosure.url;
      else if (item.mediaContent) {
         const media = Array.isArray(item.mediaContent) ? item.mediaContent[0] : item.mediaContent;
         if (media && media.$ && media.$.url) imageUrl = media.$.url;
         else if (media && media.url) imageUrl = media.url;
      }
      else if (item.content || item.contentSnippet) {
         const html = item.content || item.contentSnippet || '';
         const match = html.match(/src=["']([^"']+\.(jpg|jpeg|png))["']/i);
         if (match) imageUrl = match[1];
      }

      if (imageUrl && imageUrl.startsWith('http:')) {
         imageUrl = imageUrl.replace('http:', 'https:');
      }

      // Default fallback if needed (CBS mostly)
      if (!imageUrl && type === 'updates') {
         imageUrl = 'https://sports.cbsimg.net/images/visual/whatshot/MLB_Logo.jpg';
      }

      return {
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        summary: item.contentSnippet || item.content || '',
        image: imageUrl
      };
    });

    return NextResponse.json({ items }, { 
      headers: { 'Cache-Control': 'no-store, max-age=0' } 
    });
    
  } catch (error) {
    console.error("RSS Error:", error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}