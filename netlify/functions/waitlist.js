// netlify/functions/waitlist.js
// Stores waitlist signups to Netlify Blobs
// Each entry stored as: waitlist/<timestamp>-<sanitized-email>

const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const name  = (body.name  || '').trim().slice(0, 100);
    const email = (body.email || '').trim().toLowerCase().slice(0, 200);

    // Basic validation
    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Valid email required' })
      };
    }

    // Build the entry
    const ts    = new Date().toISOString();
    const entry = { name, email, ts };

    // Store in Netlify Blobs
    // Key: waitlist/<timestamp>-<email> — one blob per signup, easy to list later
    const store = getStore({
      name: 'waitlist',
      siteID:  process.env.SITE_ID   || process.env.NETLIFY_SITE_ID,
      token:   process.env.NETLIFY_TOKEN,
    });

    // Use email as the primary key so duplicate submissions overwrite cleanly
    const key = 'signup-' + email.replace(/[^a-z0-9]/g, '-');
    await store.setJSON(key, entry);

    console.log('Waitlist signup saved:', email);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error('Waitlist error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};
