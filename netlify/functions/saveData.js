// Loftin Method — saveData Netlify Function
const { getStore } = require('@netlify/blobs');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const body = JSON.parse(event.body);
    const { deviceId, data } = body;

    if (!deviceId || !data) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing deviceId or data' }) };
    }

    const safeId = deviceId.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 64);
    if (!safeId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid deviceId' }) };
    }

    const store = getStore({
      name: 'loftin-userdata',
      siteID: '39d90a78-a873-4828-8237-08d0d845ac35',
      token: process.env.NETLIFY_TOKEN
    });

    await store.setJSON(safeId, {
      ...data,
      savedAt: new Date().toISOString()
    });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
