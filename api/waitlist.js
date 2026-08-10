// Vercel Serverless Function — api/waitlist.js
// Handles waitlist signups and count from Supabase

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: return waitlist count
  if (req.method === 'GET') {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/nexarb_waitlist?select=count`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'count=exact',
          }
        }
      );
      const countHeader = response.headers.get('content-range');
      const count = countHeader ? parseInt(countHeader.split('/')[1]) : 0;
      return res.status(200).json({ count: isNaN(count) ? 0 : count });
    } catch {
      return res.status(200).json({ count: 0 });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};

  if (!email || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/nexarb_waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        email: cleanEmail,
        source: 'landing_page',
        ip_address: req.headers['x-forwarded-for'] || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown'
      })
    });

    // Get updated count
    let count = 0;
    try {
      const countRes = await fetch(
        `${SUPABASE_URL}/rest/v1/nexarb_waitlist?select=count`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'count=exact',
          }
        }
      );
      const countHeader = countRes.headers.get('content-range');
      count = countHeader ? parseInt(countHeader.split('/')[1]) : 0;
    } catch { /* ignore */ }

    if (response.status === 409) {
      return res.status(200).json({
        success: true,
        message: "You're already on the list! We'll be in touch soon.",
        count: isNaN(count) ? 0 : count,
      });
    }

    if (!response.ok) throw new Error(await response.text());

    return res.status(200).json({
      success: true,
      message: "You're on the list! 3 months free when we launch.",
      count: isNaN(count) ? 0 : count,
    });

  } catch (err) {
    console.error('Waitlist error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
