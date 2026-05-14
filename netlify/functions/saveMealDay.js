// netlify/functions/saveMealDay.js
// Saves a daily meal snapshot to Netlify Blobs
// Key: meal-history/<deviceId>/<YYYY-MM-DD>

const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { deviceId, date, snapshot } = body;

    if (!deviceId || !date || !snapshot) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'deviceId, date, and snapshot required' })
      };
    }

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid date format' })
      };
    }

    const store = getStore({
      name: 'meal-history',
      siteID: process.env.SITE_ID || process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_TOKEN,
    });

    const key = deviceId + '/' + date;
    await store.setJSON(key, {
      ...snapshot,
      date,
      savedAt: new Date().toISOString(),
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error('saveMealDay error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
