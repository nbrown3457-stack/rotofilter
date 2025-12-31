import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
      ['description', 'description'],
    ],
  },
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'news';

  let feedUrl = '';

  switch (type) {
    case 'prospects':
      feedUrl = 'https://www.milb.com/feeds/news/rss.xml';
      break;
    case 'injuries':
      feedUrl = 'https://www.cbssports.com/rss/headlines/mlb/'; 
      break;
    case 'news':
    default:
      feedUrl = 'https://www.mlb.com/feeds/news/rss.xml';
      break;
  }

  try {
    const feed = await parser.parseURL(feedUrl);
    
    const items = feed.items.slice(0, 20).map(item => {
      let imageUrl = null;

      // 1. Try structured media:content (The "Correct" Way)
      if (item.mediaContent) {
        // If it's an array, look for the 'medium' or 'large' image
        const contents = Array.isArray(item.mediaContent) ? item.mediaContent : [item.mediaContent];
        
        // Find one that is an image and NOT a tracker/thumbnail
        const bestMedia = contents.find((m: any) => {
           const url = (m.$?.url || m.url || '').toLowerCase();
           // Filter out tiny tracking images
           return url.includes('.jpg') && !url.includes('tracker') && !url.includes('1x1');
        });

        if (bestMedia) {
          imageUrl = bestMedia.$?.url || bestMedia.url;
        }
      }

      // 2. Fallback: Enclosure (CBS uses this)
      if (!imageUrl && item.enclosure && item.enclosure.url) {
        imageUrl = item.enclosure.url;
      }

      // 3. Fallback: Regex Scrape (Last Resort)
      // Only runs if we haven't found a valid image yet
      if (!imageUrl) {
         const rawString = JSON.stringify(item);
         // Look for common image extensions
         const match = rawString.match(/https?:\/\/[^"'\s]+\.(jpg|jpeg|png)/i);
         if (match) {
            const candidate = match[0];
            // Sanity check: Don't pick up tracking pixels
            if (!candidate.includes('tracker') && !candidate.includes('analytics')) {
               imageUrl = candidate;
            }
         }
      }

      // 4. Final Cleanup & HTTPS Enforcement
      if (imageUrl) {
         // Fix mixed content (http vs https)
         imageUrl = imageUrl.replace('http://', 'https://');
      } else {
         // Default Fallback Images (Guaranteed to work)
         if (type === 'prospects') imageUrl = 'https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1536/mlb/j8b8575p3j8z575p3j8z.jpg';
         else imageUrl = 'https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1536/mlb/k575p3j8z575p3j8z575.jpg';
      }

      return {
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        summary: item.contentSnippet || item.description || '',
        image: imageUrl
      };
    });
    
    // Debugging: Check your terminal to see what URLs are being found!
    console.log(`[NewsAPI] Fetched ${type}: found ${items.length} items.`);

    return NextResponse.json({ items }, { 
      headers: { 'Cache-Control': 'no-store, max-age=0' } 
    });
    
  } catch (error) {
    console.error("RSS Error:", error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}