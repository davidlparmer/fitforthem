// netlify/functions/check-subscription.js
// Returns subscription status for a given deviceId

const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const deviceId = event.queryStringParameters?.deviceId || '';
  if (!deviceId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'deviceId required' })
    };
  }

  try {
    const store = getStore({
      name: 'subscriptions',
      siteID: process.env.SITE_ID || process.env.NETLIFY_SITE_ID,
      token:  process.env.NETLIFY_TOKEN,
    });

    const data = await store.get('sub-' + deviceId, { type: 'json' });

    if (!data) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'none' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: data.status })
    };

  } catch (err) {
    console.error('Check subscription error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};
