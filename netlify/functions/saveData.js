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

    // Read the existing slot before overwriting so we can preserve groupId.
    //
    // WHY: claim writes groupId as a top-level field on the device slot.
    // The linkDevice sync action uses that field to find the group.
    // But the client payload only carries fft_group_id (a prefixed data field),
    // and only when localStorage already has it — which isn't guaranteed mid-session.
    // So every saveData call was silently erasing groupId, making _doGroupSync
    // return not-in-group immediately after the first save following a link.
    //
    // Fix: read the existing slot and carry groupId forward unconditionally.
    // The extra read is fast (same datacenter) and only happens when saveData runs.
    const existing = await store.get(safeId, { type: 'json' }) || {};
    const groupId = data.fft_group_id || existing.groupId;

    const slotToWrite = {
      ...data,
      savedAt: new Date().toISOString()
    };
    if (groupId) {
      slotToWrite.groupId = groupId;
    }

    await store.setJSON(safeId, slotToWrite);

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
