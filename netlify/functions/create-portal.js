// netlify/functions/create-portal.js
// Creates a Stripe customer portal session so users can manage/cancel their subscription

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const deviceId = body.deviceId || '';

    if (!deviceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'deviceId required' })
      };
    }

    // Look up the customer ID from the subscription record
    const store = getStore({
      name: 'subscriptions',
      siteID: process.env.SITE_ID || process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_TOKEN,
    });

    const data = await store.get('sub-' + deviceId, { type: 'json' });

    if (!data || !data.customerId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No subscription found for this device' })
      };
    }

    // Create a portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: data.customerId,
      return_url: 'https://fitforthem.app/app.html',
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error('Portal error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
