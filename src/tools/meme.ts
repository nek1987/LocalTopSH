/**
 * get_meme - Fetch random meme templates from Imgflip
 * Returns popular meme templates that users can relate to
 */

export const definition = {
  type: "function" as const,
  function: {
    name: "get_meme",
    description: "Get a random meme image from popular meme templates. Returns image URL and meme name. Use when user asks for memes, fun content, or says they're bored.",
    parameters: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of memes to fetch (1-5, default 1)",
        },
      },
      required: [],
    },
  },
};

interface Meme {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
}

// Cache memes list (refreshes every hour)
let memesCache: Meme[] = [];
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getMemesList(): Promise<Meme[]> {
  const now = Date.now();
  
  // Use cache if fresh
  if (memesCache.length > 0 && now - cacheTime < CACHE_TTL) {
    return memesCache;
  }
  
  try {
    const res = await fetch('https://api.imgflip.com/get_memes', {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.success && data.data?.memes) {
      memesCache = data.data.memes;
      cacheTime = now;
      return memesCache;
    }
    
    throw new Error('Invalid response');
  } catch (e: any) {
    console.log(`[meme] API error: ${e.message}`);
    // Return cache even if stale
    if (memesCache.length > 0) {
      return memesCache;
    }
    throw e;
  }
}

export async function execute(
  args: { count?: number }
): Promise<{ success: boolean; output?: string; error?: string }> {
  const count = Math.min(Math.max(args.count || 1, 1), 5);
  
  try {
    const memes = await getMemesList();
    
    if (memes.length === 0) {
      return {
        success: false,
        error: 'No memes available',
      };
    }
    
    // Pick random memes
    const selected: Meme[] = [];
    const indices = new Set<number>();
    
    while (selected.length < count && indices.size < memes.length) {
      const idx = Math.floor(Math.random() * memes.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        selected.push(memes[idx]);
      }
    }
    
    // Format output
    const output = selected.map((m, i) => {
      const prefix = selected.length > 1 ? `#${i + 1}: ` : '';
      return `${prefix}${m.name}\n🔗 ${m.url}`;
    }).join('\n\n');
    
    return {
      success: true,
      output: `#meme\n\n${output}`,
    };
  } catch (e: any) {
    return {
      success: false,
      error: `Could not fetch memes: ${e.message}`,
    };
  }
}
