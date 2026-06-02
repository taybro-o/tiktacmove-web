// Vercel Serverless Function Proxy for Matchmaking
// This bypasses browser CORS issues and rate limits from free API storage providers.

const BIN_URL = 'https://extendsclass.com/api/json-storage/bin/bbecdec';

export default async function handler(req, res) {
  // CORS Headers for the browser
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const response = await fetch(BIN_URL + '?nocache=' + Date.now(), {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const rawData = await response.json();
      let parsedQueue = null;
      if (rawData && rawData.data) {
         try {
             parsedQueue = JSON.parse(rawData.data);
         } catch(e) {}
      }
      res.status(200).json({ data: parsedQueue || { queue: null } });
    } else if (req.method === 'PUT') {
      const response = await fetch(BIN_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body.data || { queue: null })
      });
      const data = await response.json();
      res.status(200).json(data);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Matchmaking proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
