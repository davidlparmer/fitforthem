// netlify/functions/stripe-webhook.js
// Handles Stripe events — subscription created, cancelled, payment failed
// Stores subscription status to Netlify Blobs keyed by deviceId

const stripe   = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig     = event.headers['stripe-signature'];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, secret);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return { statusCode: 400, body: 'Webhook signature verification failed' };
  }

  const store = getStore({
    name: 'subscriptions',
    siteID: process.env.SITE_ID || process.env.NETLIFY_SITE_ID,
    token:  process.env.NETLIFY_TOKEN,
  });

  try {
    switch (stripeEvent.type) {

      case 'checkout.session.completed': {
        const session  = stripeEvent.data.object;
        const deviceId = session.metadata?.deviceId || '';
        if (!deviceId) break;
        await store.setJSON('sub-' + deviceId, {
          status:     'trialing',
          deviceId,
          customerId: session.customer,
          subId:      session.subscription,
          ts:         new Date().toISOString(),
        });
        console.log('Subscription started:', deviceId);
        break;
      }

      case 'customer.subscription.updated': {
        const sub      = stripeEvent.data.object;
        const deviceId = sub.metadata?.deviceId || '';
        if (!deviceId) break;
        await store.setJSON('sub-' + deviceId, {
          status:     sub.status, // active, trialing, past_due, canceled
          deviceId,
          customerId: sub.customer,
          subId:      sub.id,
          ts:         new Date().toISOString(),
        });
        console.log('Subscription updated:', deviceId, sub.status);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub      = stripeEvent.data.object;
        const deviceId = sub.metadata?.deviceId || '';
        if (!deviceId) break;
        await store.setJSON('sub-' + deviceId, {
          status:     'canceled',
          deviceId,
          customerId: sub.customer,
          subId:      sub.id,
          ts:         new Date().toISOString(),
        });
        console.log('Subscription canceled:', deviceId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice  = stripeEvent.data.object;
        const subId    = invoice.subscription;
        // Look up subscription to get deviceId
        const sub = await stripe.subscriptions.retrieve(subId);
        const deviceId = sub.metadata?.deviceId || '';
        if (!deviceId) break;
        await store.setJSON('sub-' + deviceId, {
          status:     'past_due',
          deviceId,
          customerId: invoice.customer,
          subId,
          ts:         new Date().toISOString(),
        });
        console.log('Payment failed:', deviceId);
        break;
      }

      default:
        console.log('Unhandled event type:', stripeEvent.type);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return { statusCode: 500, body: 'Handler error' };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
