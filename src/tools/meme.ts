/**
 * get_meme - Fetch random memes from Reddit
 * Sources: r/memes, r/dankmemes, r/me_irl, r/Pikabu (Russian)
 */

export const definition = {
  type: "function" as const,
  function: {
    name: "get_meme",
    description: "Get a random meme from Reddit. Returns image URL, title, and subreddit. Use this when user asks for memes, fun content, or says they're bored. After getting URL, you can share it directly or describe what's in the meme.",
    parameters: {
      type: "object",
      properties: {
        subreddit: {
          type: "string",
          description: "Subreddit to get meme from. Options: 'memes' (default), 'dankmemes', 'me_irl', 'wholesomememes', 'Pikabu' (Russian). Leave empty for random.",
          enum: ["memes", "dankmemes", "me_irl", "wholesomememes", "Pikabu", "random"],
        },
        count: {
          type: "number",
          description: "Number of memes to fetch (1-5, default 1)",
        },
      },
      required: [],
    },
  },
};

interface MemeResult {
  title: string;
  url: string;
  subreddit: string;
  author: string;
  postLink: string;
  nsfw: boolean;
}

// Multiple API endpoints for redundancy
const MEME_APIS = [
  // Primary: meme-api.com
  async (sub: string): Promise<MemeResult | null> => {
    try {
      const url = sub === 'random' 
        ? 'https://meme-api.com/gimme'
        : `https://meme-api.com/gimme/${sub}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        title: data.title || 'Meme',
        url: data.url,
        subreddit: data.subreddit,
        author: data.author,
        postLink: data.postLink,
        nsfw: data.nsfw || false,
      };
    } catch {
      return null;
    }
  },
  // Fallback: Reddit JSON directly
  async (sub: string): Promise<MemeResult | null> => {
    try {
      const subreddit = sub === 'random' ? 'memes' : sub;
      const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=50`;
      const res = await fetch(url, { 
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'MemeBot/1.0' }
      });
      if (!res.ok) return null;
      const data = await res.json();
      
      // Filter for image posts
      const posts = data.data?.children?.filter((p: any) => {
        const post = p.data;
        return post.url && 
               (post.url.endsWith('.jpg') || post.url.endsWith('.png') || post.url.endsWith('.gif')) &&
               !post.over_18;
      }) || [];
      
      if (posts.length === 0) return null;
      
      const post = posts[Math.floor(Math.random() * posts.length)].data;
      return {
        title: post.title,
        url: post.url,
        subreddit: post.subreddit,
        author: post.author,
        postLink: `https://reddit.com${post.permalink}`,
        nsfw: post.over_18,
      };
    } catch {
      return null;
    }
  },
];

export async function execute(
  args: { subreddit?: string; count?: number }
): Promise<{ success: boolean; output?: string; error?: string }> {
  const sub = args.subreddit || 'memes';
  const count = Math.min(Math.max(args.count || 1, 1), 5);
  
  const results: MemeResult[] = [];
  
  for (let i = 0; i < count; i++) {
    let meme: MemeResult | null = null;
    
    // Try each API until one works
    for (const api of MEME_APIS) {
      meme = await api(sub);
      if (meme && !meme.nsfw) break;
    }
    
    if (meme && !meme.nsfw) {
      results.push(meme);
    }
  }
  
  if (results.length === 0) {
    return {
      success: false,
      error: 'Could not fetch memes. Reddit might be slow, try again.',
    };
  }
  
  // Format output
  const output = results.map((m, i) => {
    const prefix = results.length > 1 ? `#${i + 1}: ` : '';
    return `${prefix}${m.title}\n🔗 ${m.url}\n📍 r/${m.subreddit} by u/${m.author}`;
  }).join('\n\n');
  
  return {
    success: true,
    output: `#meme\n\n${output}`,
  };
}
