// netlify/functions/create-checkout.js
// Creates a Stripe Checkout session with 7-day free trial

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const deviceId = body.deviceId || '';
    const email    = body.email    || '';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { deviceId },
      },
      metadata: { deviceId },
      customer_email: email || undefined,
      success_url: 'https://fitforthem.app/app.html?subscribed=true',
      cancel_url:  'https://fitforthem.app/app.html?subscribed=false',
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error('Stripe checkout error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
