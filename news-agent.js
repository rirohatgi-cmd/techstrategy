#!/usr/bin/env node
/**
 * News Agent - Top 5 Tech & Business News for Deloitte Tech Strategy Consultants
 *
 * Uses Claude API with web_search tool to fetch and curate news
 * relevant to enterprise tech strategy, AI, and digital transformation.
 *
 * Usage:
 *   node news-agent.js
 *   node news-agent.js --format html   (outputs HTML)
 *   node news-agent.js --profile "your role description"
 */

const https = require('https');

const DEFAULT_PROFILE = `
  Tech strategy consultant at Deloitte. Focus areas:
  - Enterprise AI adoption and agentic systems
  - Digital transformation strategy and ROI
  - Cloud, data, and infrastructure modernization
  - Emerging tech trends affecting large enterprises
  - Business strategy at the intersection of tech and operations
`;

const args = process.argv.slice(2);
const formatHTML = args.includes('--format') && args[args.indexOf('--format') + 1] === 'html';
const profileIdx = args.indexOf('--profile');
const profile = profileIdx !== -1 ? args[profileIdx + 1] : DEFAULT_PROFILE;

const SYSTEM_PROMPT = `You are a senior tech strategy analyst. Your job is to curate exactly 5 news items
that are most relevant and actionable for the given professional profile.

For each news item return a JSON object with:
- title: clear headline
- source: publication name
- date: publication date
- summary: 2-3 sentence business-relevant summary
- why_relevant: 1 sentence on why this matters for the profile
- url: source URL
- category: one of "AI & Automation", "Digital Transformation", "Enterprise Tech", "Business Strategy", "Regulation & Governance"
- impact: "High" | "Medium" | "Low" (impact on the profile's work)

Return ONLY a valid JSON array of exactly 5 objects. No markdown, no extra text.`;

const USER_PROMPT = `Professional profile:
${profile}

Search for today's top tech and business news (July 2026). Find the 5 most relevant
and impactful stories for this profile. Focus on:
1. Enterprise AI / agentic systems developments
2. Digital transformation strategy trends
3. Major tech business moves affecting consulting clients
4. Regulatory/governance changes in tech
5. Infrastructure or platform shifts at enterprise scale

Today's date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

function callClaude(apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: USER_PROMPT }],
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          resolve(parsed);
        } catch (e) {
          reject(new Error('Failed to parse API response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function extractJSON(response) {
  const textBlock = response.content?.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('No text in response');
  const text = textBlock.text.trim();
  // Strip markdown code fences if present
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(clean);
}

function printConsole(articles) {
  const categoryColors = {
    'AI & Automation': '\x1b[35m',
    'Digital Transformation': '\x1b[34m',
    'Enterprise Tech': '\x1b[36m',
    'Business Strategy': '\x1b[33m',
    'Regulation & Governance': '\x1b[31m',
  };
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const dim = '\x1b[2m';
  const impactColor = { High: '\x1b[31m', Medium: '\x1b[33m', Low: '\x1b[32m' };

  console.log(`\n${bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}`);
  console.log(`${bold}  TOP 5 TECH & BUSINESS NEWS — Deloitte Tech Strategy${reset}`);
  console.log(`${bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}\n`);

  articles.forEach((a, i) => {
    const cat = categoryColors[a.category] || '';
    const imp = impactColor[a.impact] || '';
    console.log(`${bold}${i + 1}. ${a.title}${reset}`);
    console.log(`   ${cat}${a.category}${reset}  ${imp}[${a.impact} Impact]${reset}  ${dim}${a.source} · ${a.date}${reset}`);
    console.log(`   ${a.summary}`);
    console.log(`   ${bold}Why it matters:${reset} ${a.why_relevant}`);
    if (a.url) console.log(`   ${dim}${a.url}${reset}`);
    console.log();
  });

  console.log(`${dim}Generated by News Agent · Profile: Deloitte Tech Strategy Consultant${reset}\n`);
}

function printHTML(articles) {
  const categoryColors = {
    'AI & Automation': '#8b5cf6',
    'Digital Transformation': '#3b82f6',
    'Enterprise Tech': '#06b6d4',
    'Business Strategy': '#f59e0b',
    'Regulation & Governance': '#ef4444',
  };
  const impactBg = { High: '#fee2e2', Medium: '#fef3c7', Low: '#d1fae5' };
  const impactColor = { High: '#b91c1c', Medium: '#92400e', Low: '#065f46' };

  const cards = articles.map((a, i) => {
    const catColor = categoryColors[a.category] || '#6b7280';
    const iBg = impactBg[a.impact] || '#f3f4f6';
    const iColor = impactColor[a.impact] || '#374151';
    return `
    <div class="card">
      <div class="card-header">
        <span class="num">${i + 1}</span>
        <div class="badges">
          <span class="badge" style="background:${catColor}20;color:${catColor};border:1px solid ${catColor}40">${a.category}</span>
          <span class="badge impact" style="background:${iBg};color:${iColor}">${a.impact} Impact</span>
        </div>
      </div>
      <h2 class="title"><a href="${a.url || '#'}" target="_blank">${a.title}</a></h2>
      <p class="meta">${a.source} &middot; ${a.date}</p>
      <p class="summary">${a.summary}</p>
      <div class="relevance">
        <span class="relevance-label">Why it matters</span>
        <span>${a.why_relevant}</span>
      </div>
    </div>`;
  }).join('\n');

  console.log(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Top 5 Tech & Business News</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; min-height: 100vh; }
  .header { background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); color: white; padding: 2rem; text-align: center; }
  .header h1 { font-size: 1.6rem; font-weight: 700; letter-spacing: -0.02em; }
  .header p { color: #94a3b8; margin-top: 0.4rem; font-size: 0.9rem; }
  .container { max-width: 800px; margin: 2rem auto; padding: 0 1rem; display: flex; flex-direction: column; gap: 1rem; }
  .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
  .card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
  .num { width: 28px; height: 28px; background: #1e3a5f; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
  .badges { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .badge { padding: 2px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
  .title { font-size: 1.05rem; font-weight: 700; line-height: 1.4; margin-bottom: 0.3rem; }
  .title a { color: #1e293b; text-decoration: none; }
  .title a:hover { color: #1e3a5f; text-decoration: underline; }
  .meta { font-size: 0.78rem; color: #64748b; margin-bottom: 0.75rem; }
  .summary { font-size: 0.88rem; line-height: 1.6; color: #334155; margin-bottom: 0.75rem; }
  .relevance { background: #f8fafc; border-left: 3px solid #1e3a5f; padding: 0.6rem 0.8rem; border-radius: 0 6px 6px 0; font-size: 0.82rem; color: #334155; display: flex; gap: 0.5rem; }
  .relevance-label { font-weight: 700; color: #1e3a5f; white-space: nowrap; }
  .footer { text-align: center; color: #94a3b8; font-size: 0.78rem; padding: 2rem; }
  @media (prefers-color-scheme: dark) {
    body { background: #0f172a; color: #e2e8f0; }
    .card { background: #1e293b; border-color: #334155; }
    .title a { color: #e2e8f0; }
    .summary { color: #cbd5e1; }
    .relevance { background: #0f172a; }
    .meta { color: #94a3b8; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>Top 5 Tech &amp; Business News</h1>
  <p>Curated for Deloitte Tech Strategy Consultants &middot; ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
</div>
<div class="container">${cards}
</div>
<div class="footer">Generated by News Agent &middot; Powered by Claude</div>
</body>
</html>`);
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required.');
    console.error('Set it with: export ANTHROPIC_API_KEY=your_key_here');
    process.exit(1);
  }

  if (!formatHTML) {
    console.log('Fetching top news for your profile...');
  }

  try {
    const response = await callClaude(apiKey);
    const articles = extractJSON(response);

    if (!Array.isArray(articles) || articles.length === 0) {
      throw new Error('No articles returned from agent');
    }

    if (formatHTML) {
      printHTML(articles);
    } else {
      printConsole(articles);
    }
  } catch (err) {
    console.error('News agent error:', err.message);
    process.exit(1);
  }
}

main();
