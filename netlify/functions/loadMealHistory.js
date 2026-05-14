// netlify/functions/loadMealHistory.js
// Loads meal history snapshots for a device
// Returns last N days of meal snapshots

const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { deviceId, days = 30 } = body;

    if (!deviceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'deviceId required' })
      };
    }

    const store = getStore({
      name: 'meal-history',
      siteID: process.env.SITE_ID || process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_TOKEN,
    });

    // List all keys for this device
    const { blobs } = await store.list({ prefix: deviceId + '/' });

    if (!blobs || blobs.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: [] })
      };
    }

    // Sort by date descending, take last N days
    const sorted = blobs
      .map(b => b.key)
      .filter(k => k.startsWith(deviceId + '/'))
      .map(k => k.replace(deviceId + '/', ''))
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort()
      .reverse()
      .slice(0, days);

    // Fetch each snapshot
    const history = await Promise.all(
      sorted.map(async function(date) {
        try {
          const data = await store.get(deviceId + '/' + date, { type: 'json' });
          return data;
        } catch (e) {
          return null;
        }
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: history.filter(Boolean)
      })
    };

  } catch (err) {
    console.error('loadMealHistory error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
