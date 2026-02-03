/**
 * API Proxy - isolates secrets from agent container
 * Reads secrets from /run/secrets/ (Docker Secrets)
 * Agent sees only http://proxy:3200, no API keys
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const { URL } = require('url');

const PORT = process.env.PROXY_PORT || 3200;

/**
 * Read secret from file (Docker Secrets mount at /run/secrets/)
 */
function readSecret(name) {
  const paths = [
    `/run/secrets/${name}`,
    `/run/secrets/${name}.txt`,
    `./secrets/${name}.txt`,
    `/app/secrets/${name}.txt`,
  ];
  
  for (const path of paths) {
    try {
      const value = fs.readFileSync(path, 'utf-8').trim();
      if (value) {
        console.log(`[proxy] Secret '${name}' loaded from ${path}`);
        return value;
      }
    } catch {
      // Try next path
    }
  }
  
  const envName = name.toUpperCase();
  if (process.env[envName]) {
    console.log(`[proxy] Secret '${name}' loaded from env (INSECURE)`);
    return process.env[envName];
  }
  
  console.warn(`[proxy] WARNING: Secret '${name}' not found!`);
  return null;
}

// Load secrets
const LLM_BASE_URL = readSecret('base_url');
const LLM_API_KEY = readSecret('api_key');
const ZAI_API_KEY = readSecret('zai_api_key');

console.log('[proxy] Starting API proxy...');
console.log('[proxy] LLM endpoint:', LLM_BASE_URL ? '✓ configured' : '✗ NOT SET');
console.log('[proxy] ZAI API:', ZAI_API_KEY ? '✓ configured' : '✗ NOT SET');

/**
 * Forward request to target with auth (for streaming/LLM)
 */
function proxyRequest(req, res, targetUrl, authHeader) {
  const url = new URL(targetUrl);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;
  
  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: url.host,
      ...authHeader,
    },
  };
  
  delete options.headers['connection'];
  
  const proxyReq = client.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (e) => {
    console.error('[proxy] Request error:', e.message);
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'Proxy error', message: e.message }));
  });
  
  req.pipe(proxyReq);
}

/**
 * Make POST request to Z.AI API
 */
function zaiRequest(endpoint, body, callback) {
  const postData = JSON.stringify(body);
  
  const options = {
    hostname: 'api.z.ai',
    port: 443,
    path: `/api/paas/v4/${endpoint}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${ZAI_API_KEY}`,
    },
  };
  
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        callback(null, res.statusCode, JSON.parse(data));
      } catch (e) {
        callback(null, res.statusCode, { raw: data });
      }
    });
  });
  
  req.on('error', (e) => callback(e));
  req.write(postData);
  req.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', llm: !!LLM_BASE_URL, zai: !!ZAI_API_KEY }));
    return;
  }
  
  // LLM API proxy: /v1/* -> BASE_URL/*
  if (url.pathname.startsWith('/v1/')) {
    if (!LLM_BASE_URL) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'LLM not configured' }));
      return;
    }
    
    const targetPath = url.pathname;
    const targetUrl = LLM_BASE_URL.replace(/\/v1$/, '') + targetPath + url.search;
    
    console.log(`[proxy] LLM: ${req.method} ${url.pathname}`);
    
    proxyRequest(req, res, targetUrl, {
      'Authorization': `Bearer ${LLM_API_KEY}`,
    });
    return;
  }
  
  // Z.AI Web Search: /zai/search?q=...
  if (url.pathname === '/zai/search') {
    if (!ZAI_API_KEY) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'ZAI not configured' }));
      return;
    }
    
    const query = url.searchParams.get('q') || '';
    console.log(`[proxy] ZAI search: "${query.slice(0, 50)}..."`);
    
    zaiRequest('web_search', {
      search_engine: 'search-prime',
      search_query: query,
      count: 10,
    }, (err, status, data) => {
      if (err) {
        console.error('[proxy] ZAI error:', err.message);
        res.writeHead(502);
        res.end(JSON.stringify({ error: 'ZAI request failed', message: err.message }));
        return;
      }
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    });
    return;
  }
  
  // Z.AI Web Reader: /zai/read?url=...
  if (url.pathname === '/zai/read') {
    if (!ZAI_API_KEY) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'ZAI not configured' }));
      return;
    }
    
    const pageUrl = url.searchParams.get('url') || '';
    console.log(`[proxy] ZAI read: "${pageUrl.slice(0, 50)}..."`);
    
    zaiRequest('reader', {
      url: pageUrl,
      return_format: 'markdown',
      retain_images: false,
      timeout: 30,
    }, (err, status, data) => {
      if (err) {
        console.error('[proxy] ZAI error:', err.message);
        res.writeHead(502);
        res.end(JSON.stringify({ error: 'ZAI request failed', message: err.message }));
        return;
      }
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    });
    return;
  }
  
  // Unknown route
  res.writeHead(404);
  res.end(JSON.stringify({ 
    error: 'Not found',
    routes: ['/v1/*', '/zai/search?q=...', '/zai/read?url=...', '/health']
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[proxy] Listening on port ${PORT}`);
});
