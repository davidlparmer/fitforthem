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

    // Preserve groupId as a top-level field alongside the data fields.
    //
    // WHY: The linkDevice sync action identifies a device's group by looking for
    // a top-level `groupId` field in the device slot. Previously this field was
    // written by `claim` but then immediately erased on the next saveAllData call
    // because saveData only spread `data` (which contains `fft_group_id` as a
    // prefixed key, not `groupId` at the top level). Every subsequent _doGroupSync
    // would get `not-in-group` and silently fail.
    //
    // Fix: mirror fft_group_id → groupId so the slot always has the top-level
    // field no matter how many times saveAllData runs.
    const slotToWrite = {
      ...data,
      savedAt: new Date().toISOString()
    };
    if (data.fft_group_id) {
      slotToWrite.groupId = data.fft_group_id;
    }

    await store.setJSON(safeId, slotToWrite);

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
