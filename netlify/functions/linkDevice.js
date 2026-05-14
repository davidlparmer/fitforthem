// Loftin Method — linkDevice Netlify Function
// Handles two actions:
//   generate: creates a 6-digit code tied to a deviceId (expires 10 min)
//   claim:    another device submits the code, gets back the primary deviceId
//             and the primary device's data, then re-saves under its own ID
const { getStore } = require('@netlify/blobs');

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const STORE_CONFIG = {
  name: 'loftin-userdata',
  siteID: '39d90a78-a873-4828-8237-08d0d845ac35',
  token: process.env.NETLIFY_TOKEN
};

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function sanitize(id) {
  return (id || '').replace(/[^a-zA-Z0-9-]/g, '').substring(0, 64);
}

// ── Merge Logic ───────────────────────────────────────────────
// primary = the device that generated the code (the one with your data)
// secondary = the device claiming the code (the one that needs the data)
// Result is saved under the secondary device's ID so it loads normally.
function mergeData(primary, secondary) {
  const merged = { ...primary };

  // Weight log — combine both, deduplicate by date, sort descending
  try {
    const pLog = JSON.parse(primary.fft_log || '[]');
    const sLog = JSON.parse(secondary.fft_log || '[]');
    const byDate = {};
    [...pLog, ...sLog].forEach(function(entry) {
      if (!byDate[entry.d] || entry.t > (byDate[entry.d].t || 0)) {
        byDate[entry.d] = entry;
      }
    });
    const combined = Object.values(byDate).sort(function(a, b) {
      return b.d.localeCompare(a.d);
    });
    merged.fft_log = JSON.stringify(combined);
  } catch(e) {}

  // Plan — primary always wins, no merging.
  // The device that generated the code is the source of truth for the plan.
  // Merging plans produces zero-value fields and calorie mismatches.
  try {
    merged.fft_plan = primary.fft_plan || secondary.fft_plan || '{}';
  } catch(e) {}

  // Meal prefs — merge objects, primary wins on conflict
  try {
    const pPrefs = JSON.parse(primary.fft_meal_prefs || '{}');
    const sPrefs = JSON.parse(secondary.fft_meal_prefs || '{}');
    merged.fft_meal_prefs = JSON.stringify({ ...sPrefs, ...pPrefs });
  } catch(e) {}

  // Custom meals — merge arrays, deduplicate by id
  try {
    const pCustom = JSON.parse(primary.fft_custom || '[]');
    const sCustom = JSON.parse(secondary.fft_custom || '[]');
    const byId = {};
    [...sCustom, ...pCustom].forEach(function(m) {
      byId[m.id] = m;
    });
    merged.fft_custom = JSON.stringify(Object.values(byId));
  } catch(e) {}

  // Protein swaps — merge, primary wins
  try {
    const pSwaps = JSON.parse(primary.fft_swaps || '{}');
    const sSwaps = JSON.parse(secondary.fft_swaps || '{}');
    merged.fft_swaps = JSON.stringify({ ...sSwaps, ...pSwaps });
  } catch(e) {}

  // Skipped meals — merge, primary wins
  try {
    const pSkip = JSON.parse(primary.fft_skipped || '{}');
    const sSkip = JSON.parse(secondary.fft_skipped || '{}');
    merged.fft_skipped = JSON.stringify({ ...sSkip, ...pSkip });
  } catch(e) {}

  // Scalar fields — primary always wins
  merged.fft_name     = primary.fft_name     || secondary.fft_name     || '';
  merged.fft_workmode = primary.fft_workmode || secondary.fft_workmode || 'office';
  merged.fft_age      = primary.fft_age      || secondary.fft_age      || '';
  merged.fft_summary_dismissed = primary.fft_summary_dismissed || secondary.fft_summary_dismissed || '';
  merged.fft_milestones = primary.fft_milestones || secondary.fft_milestones || '';

  return merged;
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: 'Method Not Allowed' };

  try {
    const body = JSON.parse(event.body);
    const { action, deviceId, code } = body;
    const store = getStore(STORE_CONFIG);

    // ── ACTION: generate ─────────────────────────────────────
    if (action === 'generate') {
      const safeId = sanitize(deviceId);
      if (!safeId) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid deviceId' }) };

      // Generate a random 6-digit code
      const linkCode = String(Math.floor(100000 + Math.random() * 900000));
      const codeKey = 'linkcode_' + linkCode;

      await store.setJSON(codeKey, {
        primaryDeviceId: safeId,
        createdAt: Date.now(),
        expiresAt: Date.now() + CODE_TTL_MS
      });

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ ok: true, code: linkCode, expiresIn: 600 })
      };
    }

    // ── ACTION: claim ────────────────────────────────────────
    if (action === 'claim') {
      const safeSecondaryId = sanitize(deviceId);
      const safeCode = (code || '').replace(/[^0-9]/g, '').substring(0, 6);

      if (!safeSecondaryId || safeCode.length !== 6) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid deviceId or code' }) };
      }

      // Look up the code
      const codeKey = 'linkcode_' + safeCode;
      const codeEntry = await store.get(codeKey, { type: 'json' });

      if (!codeEntry) {
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, reason: 'Code not found. Check the code and try again.' }) };
      }

      if (Date.now() > codeEntry.expiresAt) {
        // Clean up expired code
        await store.delete(codeKey).catch(function(){});
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, reason: 'Code expired. Generate a new one on the other device.' }) };
      }

      const safePrimaryId = sanitize(codeEntry.primaryDeviceId);

      if (safePrimaryId === safeSecondaryId) {
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, reason: 'This is the same device that generated the code.' }) };
      }

      // Load primary device data
      const primaryData = await store.get(safePrimaryId, { type: 'json' });
      if (!primaryData) {
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, reason: 'Primary device data not found. Make sure you\'ve opened the app on the other device recently.' }) };
      }

      // Load secondary device data (may not exist yet)
      const secondaryData = await store.get(safeSecondaryId, { type: 'json' }) || {};

      // Determine group ID — use existing group if primary already has one
      const groupId = primaryData.groupId || ('group-' + safePrimaryId);

      // Merge and save under secondary device ID
      const merged = mergeData(primaryData, secondaryData);
      merged.savedAt = new Date().toISOString();
      merged.linkedFrom = safePrimaryId;
      merged.groupId = groupId;

      await store.setJSON(safeSecondaryId, merged);

      // Update primary device with group ID (non-destructive — only adds groupId)
      const updatedPrimary = { ...primaryData, groupId, savedAt: new Date().toISOString() };
      await store.setJSON(safePrimaryId, updatedPrimary);

      // Write merged data to the shared group slot
      // This becomes the source of truth for all devices in the group
      const groupData = { ...merged, savedAt: new Date().toISOString() };
      await store.setJSON(groupId, groupData);

      // Clean up the code — single use
      await store.delete(codeKey).catch(function(){});

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ ok: true, data: merged, groupId: groupId })
      };
    }

    // ── ACTION: sync ────────────────────────────────────────
    // Devices call this periodically to push their latest data
    // to the group slot and pull any newer data from it.
    if (action === 'sync') {
      const safeId = sanitize(deviceId);
      if (!safeId) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid deviceId' }) };

      // Get the device's current data to find its groupId
      const deviceData = await store.get(safeId, { type: 'json' });
      if (!deviceData || !deviceData.groupId) {
        // Not in a group — nothing to sync
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, reason: 'not-in-group' }) };
      }

      const groupId = deviceData.groupId;
      const groupData = await store.get(groupId, { type: 'json' }) || {};

      // Merge device data into group — weight log always merges, plan uses newer version
      const { data: incomingData } = body;
      if (incomingData) {
        // Build updated group data from incoming device data
        const updatedGroup = mergeData(groupData, incomingData);
        updatedGroup.savedAt = new Date().toISOString();
        await store.setJSON(groupId, updatedGroup);

        // Also update device slot
        const updatedDevice = { ...incomingData, groupId, savedAt: new Date().toISOString() };
        await store.setJSON(safeId, updatedDevice);

        return {
          statusCode: 200,
          headers: HEADERS,
          body: JSON.stringify({ ok: true, data: updatedGroup })
        };
      }

      // No incoming data — just return current group data (pull only)
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ ok: true, data: groupData })
      };
    }

    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch(err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
