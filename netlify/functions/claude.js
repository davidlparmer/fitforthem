// Fit For Them — Netlify Function
// Handles Claude AI calls and Google Places API calls server-side

exports.handler = async function(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body);
    const action = body.action || 'claude';

    // ── DEBUG — check what env vars are available ────────────────
    if (action === 'debug') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
          anthropicKeyLength: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0,
          anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 10) : 'NOT SET',
          hasGoogleKey: !!process.env.GOOGLE_PLACES_KEY,
          googleKeyLength: process.env.GOOGLE_PLACES_KEY ? process.env.GOOGLE_PLACES_KEY.length : 0,
          nodeVersion: process.version,
          allEnvKeys: Object.keys(process.env).filter(k => k.includes('ANTHROPIC') || k.includes('GOOGLE') || k.includes('API'))
        })
      };
    }

    // ── NEARBY RESTAURANTS ──────────────────────────────────────
    if (action === 'nearby') {
      const googleKey = process.env.GOOGLE_PLACES_KEY;
      if (!googleKey) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Google key not configured' }) };
      }
      const { lat, lng, radius } = body;
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius||2000}&type=restaurant&key=${googleKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        return { statusCode: 500, headers, body: JSON.stringify({ error: data.status }) };
      }
      const restaurants = (data.results || []).slice(0, 20).map(r => ({
        place_id: r.place_id,
        name: r.name,
        vicinity: r.vicinity,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        rating: r.rating || null,
        price_level: r.price_level || null,
        open_now: r.opening_hours ? r.opening_hours.open_now : null,
        types: r.types || []
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ restaurants }) };
    }

    // ── CLAUDE AI (with retry) ───────────────────────────────────
    if (action === 'claude' || body.prompt) {
      const { prompt } = body;
      if (!prompt) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No prompt provided' }) };
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Anthropic key not configured', debug: 'process.env.ANTHROPIC_API_KEY is empty or undefined' }) };
      }

      let lastError = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 25000);

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1200,
              system: 'You are a nutrition database assistant for Fit For Them. Respond ONLY with valid JSON. No markdown, no backticks, no explanation. Raw JSON only.',
              messages: [{ role: 'user', content: prompt }]
            }),
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (!response.ok) {
            const errorText = await response.text();
            lastError = `API ${response.status}: ${errorText}`;
            if (response.status >= 400 && response.status < 500) break;
            continue;
          }

          const data = await response.json();
          const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
          return { statusCode: 200, headers, body: JSON.stringify({ result: text }) };

        } catch (fetchErr) {
          lastError = fetchErr.message;
          if (attempt < 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Request failed after retries', details: lastError })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
