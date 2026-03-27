/**
 * TranscriptPro – script.js
 * YouTube Transcript Extractor
 *
 * Strategy (in order):
 * 1. youtube-transcript.netlify.app  — free public transcript API
 * 2. Tactiq's public API             — another free source
 * 3. YT page scrape via proxy        — fallback: fetch YT page, extract captionTracks JSON,
 *    then fetch the actual caption XML/JSON3 through proxy
 *
 * CORS bypass: allorigins → corsproxy.io → thingproxy
 */

'use strict';

/* ── DOM References ── */
const urlInput       = document.getElementById('youtube-url');
const extractBtn     = document.getElementById('extract-btn');
const clearBtn       = document.getElementById('clear-btn');
const errorMsg       = document.getElementById('error-msg');
const loadingSection = document.getElementById('loading-section');
const resultSection  = document.getElementById('result-section');
const loaderText     = document.getElementById('loader-text');

const videoThumb     = document.getElementById('video-thumb');
const videoTitle     = document.getElementById('video-title');
const videoChannel   = document.getElementById('video-channel');
const wordCountEl    = document.getElementById('transcript-word-count');
const durationEl     = document.getElementById('transcript-duration');

const transcriptPlain = document.getElementById('transcript-plain');
const transcriptTs    = document.getElementById('transcript-timestamp');
const tabPlain        = document.getElementById('tab-plain');
const tabTimestamp    = document.getElementById('tab-timestamp');

const copyPlainBtn   = document.getElementById('copy-plain-btn');
const copyTsBtn      = document.getElementById('copy-ts-btn');
const downloadBtn    = document.getElementById('download-btn');
const newBtn         = document.getElementById('new-btn');
const searchInput    = document.getElementById('transcript-search');
const toast          = document.getElementById('toast');

/* ── State ── */
let plainText      = '';
let timestampText  = '';
let currentTab     = 'plain';
let currentVideoId = '';
let toastTimer     = null;
let searchDebounce = null;

/* ── Footer Year ── */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ─────────────────────────────────────────
   URL UTILITIES
───────────────────────────────────────── */
function extractVideoId(url) {
  url = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function formatTime(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* ─────────────────────────────────────────
   UI HELPERS
───────────────────────────────────────── */
function showError(msg) {
  errorMsg.textContent = '⚠ ' + msg;
  errorMsg.style.display = 'block';
}
function hideError() {
  errorMsg.style.display = 'none';
}

function setLoading(visible, message = 'Fetching transcript…') {
  loadingSection.style.display = visible ? 'block' : 'none';
  loaderText.textContent = message;
}

function showResult() {
  resultSection.style.display = 'block';
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideResult() {
  resultSection.style.display = 'none';
}

function showToast(msg, type = '') {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

function setExtractBtnLoading(on) {
  extractBtn.classList.toggle('loading', on);
  extractBtn.querySelector('.btn-text').textContent = on ? 'Extracting…' : 'Extract';
  extractBtn.querySelector('.btn-icon').textContent = on ? '⏳' : '→';
}

/* ─────────────────────────────────────────
   INPUT EVENTS
───────────────────────────────────────── */
urlInput.addEventListener('input', () => {
  clearBtn.style.display = urlInput.value ? 'inline-flex' : 'none';
  hideError();
});

clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearBtn.style.display = 'none';
  urlInput.focus();
  hideError();
});

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') extractBtn.click();
});

/* Paste detection: auto-trigger if URL pasted */
urlInput.addEventListener('paste', () => {
  setTimeout(() => {
    const val = urlInput.value.trim();
    if (extractVideoId(val)) {
      extractBtn.click();
    }
  }, 50);
});

/* ─────────────────────────────────────────
   TABS
───────────────────────────────────────── */
function switchTab(tab) {
  currentTab = tab;
  if (tab === 'plain') {
    tabPlain.classList.add('active');
    tabTimestamp.classList.remove('active');
    transcriptPlain.classList.remove('hidden');
    transcriptTs.classList.add('hidden');
    tabPlain.setAttribute('aria-selected', 'true');
    tabTimestamp.setAttribute('aria-selected', 'false');
  } else {
    tabTimestamp.classList.add('active');
    tabPlain.classList.remove('active');
    transcriptTs.classList.remove('hidden');
    transcriptPlain.classList.add('hidden');
    tabTimestamp.setAttribute('aria-selected', 'true');
    tabPlain.setAttribute('aria-selected', 'false');
  }
  // Re-apply search if active
  if (searchInput.value.trim()) performSearch(searchInput.value.trim());
}

tabPlain.addEventListener('click', () => switchTab('plain'));
tabTimestamp.addEventListener('click', () => switchTab('timestamp'));

/* ─────────────────────────────────────────
   SEARCH
───────────────────────────────────────── */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const re = new RegExp('(' + escapeRegex(query) + ')', 'gi');
  return escapeHtml(text).replace(re, '<mark>$1</mark>');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function performSearch(query) {
  if (currentTab === 'plain') {
    transcriptPlain.innerHTML = highlightText(plainText, query);
  } else {
    renderTimestampedWithSearch(query);
  }
}

function renderTimestampedWithSearch(query) {
  // Re-render timestamp lines with highlights
  const lines = timestampText.split('\n').filter(l => l.trim());
  transcriptTs.innerHTML = lines.map(line => {
    const match = line.match(/^\[(\d+:\d+(?::\d+)?)\] (.*)$/);
    if (!match) return '';
    const [, ts, text] = match;
    return `<div class="ts-line">
      <span class="ts-badge">${escapeHtml(ts)}</span>
      <span class="ts-text">${highlightText(text, query)}</span>
    </div>`;
  }).join('');
}

searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    const q = searchInput.value.trim();
    performSearch(q);
    if (!q) {
      // Restore clean render
      if (currentTab === 'plain') {
        transcriptPlain.textContent = plainText;
      } else {
        renderTimestampLines();
      }
    }
  }, 220);
});

/* ─────────────────────────────────────────
   RENDER TRANSCRIPT
───────────────────────────────────────── */
function renderTimestampLines() {
  const lines = timestampText.split('\n').filter(l => l.trim());
  transcriptTs.innerHTML = lines.map(line => {
    const match = line.match(/^\[(\d+:\d+(?::\d+)?)\] (.*)$/);
    if (!match) return '';
    const [, ts, text] = match;
    return `<div class="ts-line">
      <span class="ts-badge">${escapeHtml(ts)}</span>
      <span class="ts-text">${escapeHtml(text)}</span>
    </div>`;
  }).join('');
}

/* ─────────────────────────────────────────
   COPY & DOWNLOAD
───────────────────────────────────────── */
async function copyToClipboard(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('✓ ' + label + ' copied!', 'success');
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✓ ' + label + ' copied!', 'success');
  }
}

copyPlainBtn.addEventListener('click', () => copyToClipboard(plainText, 'Plain text'));
copyTsBtn.addEventListener('click', () => copyToClipboard(timestampText, 'Timestamped transcript'));

downloadBtn.addEventListener('click', () => {
  const content = `YouTube Transcript\nVideo: https://www.youtube.com/watch?v=${currentVideoId}\n\n${'─'.repeat(50)}\n\n${timestampText}\n\n${'─'.repeat(50)}\n\nPlain Text:\n\n${plainText}`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transcript-${currentVideoId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Transcript downloaded!', 'success');
});

newBtn.addEventListener('click', () => {
  hideResult();
  urlInput.value = '';
  clearBtn.style.display = 'none';
  plainText = '';
  timestampText = '';
  searchInput.value = '';
  urlInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ─────────────────────────────────────────
   VIDEO METADATA (noembed)
───────────────────────────────────────── */
async function fetchVideoMeta(videoId) {
  try {
    const res = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
    );
    if (!res.ok) throw new Error('meta fetch failed');
    const data = await res.json();
    return {
      title:     data.title   || 'YouTube Video',
      channel:   data.author_name || 'Unknown Channel',
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    };
  } catch {
    return {
      title:     'YouTube Video',
      channel:   'Unknown Channel',
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    };
  }
}

function decodeHtmlEntities(str) {
  const map = {
    '&amp;':  '&',
    '&lt;':   '<',
    '&gt;':   '>',
    '&quot;': '"',
    '&#39;':  "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
  };
  return str
    .replace(/&[a-z0-9#]+;/gi, entity => map[entity] || entity)
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Build clean text outputs from caption entries */
function buildTranscripts(entries) {
  let plain = '';
  let withTs = '';

  entries.forEach(({ start, text }) => {
    plain  += text + ' ';
    withTs += `[${formatTime(start)}] ${text}\n`;
  });

  return {
    plain:     plain.trim(),
    withTs:    withTs.trim(),
    lastTime:  entries.length ? entries[entries.length - 1].start : 0,
  };
}

/* Proxy list — CORS proxies to bypass browser restrictions */
const PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function fetchWithProxy(targetUrl, timeoutMs = 9000) {
  // Try proxies in order
  for (const makeUrl of PROXIES) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), timeoutMs);
      const r = await fetch(makeUrl(targetUrl), { signal: controller.signal });
      clearTimeout(tid);
      if (r.ok) {
        const text = await r.text();
        if (text && text.trim().length > 30) return text;
      }
    } catch { /* try next */ }
  }
  throw new Error('proxy_fail');
}

/* ─────────────────────────────────────────
   STRATEGY 1: Public Transcript APIs
   (third-party services that serve YT transcripts)
───────────────────────────────────────── */

// Uses youtubetranscript.com API (free, no key)
async function tryPublicApi1(videoId) {
  const url = `https://www.youtubetranscript.com/?server_vid2=${videoId}`;
  const html = await fetchWithProxy(url, 10000);
  // Response is an HTML fragment with <text> tags
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const texts = doc.querySelectorAll('text');
  if (!texts.length) return null;
  const entries = [];
  texts.forEach(node => {
    const start = parseFloat(node.getAttribute('start') || '0');
    const raw   = node.textContent || '';
    const text  = decodeHtmlEntities(raw).trim();
    if (text) entries.push({ start, text });
  });
  return entries.length ? entries : null;
}

// Uses get-youtube-subtitle npm-compatible REST endpoint
async function tryPublicApi2(videoId) {
  const url = `https://yt-subtitle-fetch.vercel.app/api/transcript?id=${videoId}`;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!r.ok) return null;
    const data = await r.json();
    if (!Array.isArray(data) || !data.length) return null;
    return data.map(item => ({
      start: parseFloat(item.offset || item.start || 0) / 1000,
      text:  decodeHtmlEntities((item.text || '').trim()),
    })).filter(e => e.text);
  } catch { return null; }
}

/* ─────────────────────────────────────────
   STRATEGY 2: YouTube page scrape + caption XML
───────────────────────────────────────── */

function parseXmlCaptions(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const texts = doc.querySelectorAll('text');
  const entries = [];
  texts.forEach(node => {
    const start = parseFloat(node.getAttribute('start') || '0');
    const raw   = node.textContent || '';
    const text  = decodeHtmlEntities(raw).trim();
    if (text) entries.push({ start, text });
  });
  return entries;
}

function parseJson3Captions(jsonText) {
  try {
    const data   = JSON.parse(jsonText);
    const events = data.events || [];
    const entries = [];
    events.forEach(ev => {
      if (!ev.segs) return;
      const start = (ev.tStartMs || 0) / 1000;
      const text  = ev.segs.map(s => s.utf8 || '').join('').trim();
      if (text && text !== '\n') {
        entries.push({ start, text: decodeHtmlEntities(text) });
      }
    });
    return entries;
  } catch { return []; }
}

function parseVttCaptions(vttText) {
  const entries = [];
  const blocks  = vttText.split(/\n\n+/);
  blocks.forEach(block => {
    const lines = block.trim().split('\n');
    // Find timing line
    const timingIdx = lines.findIndex(l => l.includes('-->'));
    if (timingIdx === -1) return;
    const timePart = lines[timingIdx].split('-->')[0].trim();
    const parts    = timePart.split(':').map(parseFloat);
    let start = 0;
    if (parts.length === 3) start = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) start = parts[0] * 60 + parts[1];
    const textLines = lines.slice(timingIdx + 1).join(' ')
      .replace(/<[^>]+>/g, '').trim();
    if (textLines) entries.push({ start, text: decodeHtmlEntities(textLines) });
  });
  return entries;
}

async function tryPageScrape(videoId) {
  setLoading(true, 'Fetching video page…');
  const ytUrl   = `https://www.youtube.com/watch?v=${videoId}`;
  const pageHtml = await fetchWithProxy(ytUrl, 15000);

  // Try to find captionTracks in ytInitialPlayerResponse
  const patterns = [
    /"captionTracks":\s*(\[[\s\S]*?\])\s*,\s*"audioTracks"/,
    /"captionTracks":\s*(\[[\s\S]*?\])\s*,\s*"translationLanguages"/,
    /"captionTracks":\s*(\[[\s\S]*?\])/,
  ];

  let tracks = null;
  for (const re of patterns) {
    const m = pageHtml.match(re);
    if (m) {
      try {
        tracks = JSON.parse(m[1]);
        if (tracks.length) break;
      } catch { /* try next pattern */ }
    }
  }

  if (!tracks || !tracks.length) return null;

  // Prefer English, then Hindi, then first available
  const preferred = tracks.find(t => t.languageCode === 'en')
    || tracks.find(t => t.languageCode === 'hi')
    || tracks[0];

  const baseUrl = preferred.baseUrl;
  if (!baseUrl) return null;

  // Try json3 first, then xml
  setLoading(true, 'Downloading captions…');
  const fmts = [
    { url: baseUrl + '&fmt=json3', parser: parseJson3Captions },
    { url: baseUrl,                parser: parseXmlCaptions   },
    { url: baseUrl + '&fmt=vtt',   parser: parseVttCaptions   },
  ];

  for (const { url, parser } of fmts) {
    try {
      const raw     = await fetchWithProxy(url, 10000);
      const entries = parser(raw);
      if (entries.length) return entries;
    } catch { /* try next */ }
  }

  return null;
}

/* ─────────────────────────────────────────
   STRATEGY 3: Direct timedtext API
───────────────────────────────────────── */
async function tryTimedtextApi(videoId) {
  const base  = 'https://www.youtube.com/api/timedtext';
  const langs = ['en', 'hi', 'en-US', 'en-GB', 'a.en'];
  const kinds = ['asr', ''];

  for (const lang of langs) {
    for (const kind of kinds) {
      for (const fmt of ['json3', 'srv3']) {
        const url = `${base}?v=${videoId}&lang=${lang}&fmt=${fmt}${kind ? '&kind=' + kind : ''}`;
        try {
          setLoading(true, `Trying captions (${lang})…`);
          const raw     = await fetchWithProxy(url, 8000);
          if (!raw || raw.length < 50) continue;
          const entries = fmt === 'json3' ? parseJson3Captions(raw) : parseXmlCaptions(raw);
          if (entries.length) return entries;
        } catch { /* continue */ }
      }
    }
  }
  return null;
}

/* ─────────────────────────────────────────
   MAIN FETCH TRANSCRIPT ORCHESTRATOR
───────────────────────────────────────── */
async function fetchTranscript(videoId) {
  let entries = null;

  // 1. Public API 1
  try {
    setLoading(true, 'Fetching transcript (1/3)…');
    entries = await tryPublicApi1(videoId);
  } catch { /* fall through */ }
  if (entries && entries.length) return buildTranscripts(entries);

  // 2. Public API 2
  try {
    setLoading(true, 'Fetching transcript (2/3)…');
    entries = await tryPublicApi2(videoId);
  } catch { /* fall through */ }
  if (entries && entries.length) return buildTranscripts(entries);

  // 3. Page scrape
  try {
    setLoading(true, 'Scanning video page (3/3)…');
    entries = await tryPageScrape(videoId);
  } catch { /* fall through */ }
  if (entries && entries.length) return buildTranscripts(entries);

  // 4. Direct timedtext API
  try {
    entries = await tryTimedtextApi(videoId);
  } catch { /* fall through */ }
  if (entries && entries.length) return buildTranscripts(entries);

  // All failed
  throw new Error(
    'इस video का transcript नहीं मिला।\n\n' +
    'संभावित कारण:\n' +
    '• Video में captions/subtitles disabled हैं\n' +
    '• Video private या age-restricted है\n' +
    '• CORS proxy temporarily unavailable है — 1 minute बाद retry करें\n\n' +
    'Tip: English captions वाले videos पर best काम करता है।'
  );
}

/* ─────────────────────────────────────────
   MAIN EXTRACT HANDLER
───────────────────────────────────────── */
extractBtn.addEventListener('click', async () => {
  const raw = urlInput.value.trim();
  if (!raw) {
    showError('कृपया एक YouTube URL डालें।');
    urlInput.focus();
    return;
  }

  const videoId = extractVideoId(raw);
  if (!videoId) {
    showError('Invalid YouTube URL। कृपया सही link डालें।');
    return;
  }

  // Reset UI
  hideError();
  hideResult();
  searchInput.value = '';
  currentVideoId = videoId;

  setExtractBtnLoading(true);
  setLoading(true, 'Fetching transcript…');

  try {
    // Parallel: meta + transcript
    const [meta, result] = await Promise.all([
      fetchVideoMeta(videoId),
      fetchTranscript(videoId),
    ]);

    // Store
    plainText     = result.plain;
    timestampText = result.withTs;

    // Populate video info
    videoThumb.src = meta.thumbnail;
    videoThumb.alt = meta.title;
    videoTitle.textContent = meta.title;

    const svgChannel = videoChannel.querySelector('svg').outerHTML;
    videoChannel.innerHTML = `${svgChannel} ${meta.channel}`;

    const wc = wordCount(plainText);
    const svgDoc = wordCountEl.querySelector('svg').outerHTML;
    wordCountEl.innerHTML = `${svgDoc} ${wc.toLocaleString()} words`;

    const dur = result.lastTime;
    const svgClock = durationEl.querySelector('svg').outerHTML;
    durationEl.innerHTML = `${svgClock} ${formatTime(dur)} video`;

    // Render transcript
    transcriptPlain.textContent = plainText;
    renderTimestampLines();

    // Switch to plain tab by default
    switchTab('plain');

    // Show result
    setLoading(false);
    showResult();
    showToast('✓ Transcript ready!', 'success');

  } catch (err) {
    setLoading(false);
    showError(err.message || 'कुछ गड़बड़ हुई। दोबारा try करें।');
  } finally {
    setExtractBtnLoading(false);
  }
});

/* ─────────────────────────────────────────
   KEYBOARD SHORTCUT
   Ctrl+K / Cmd+K → Focus URL input
───────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    urlInput.focus();
    urlInput.select();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

/* ─────────────────────────────────────────
   INTERSECTION OBSERVER – Animate sections on scroll
───────────────────────────────────────── */
const observerOptions = { threshold: 0.12 };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'fadeInUp 0.55s ease both';
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.step-card, .feature-card, .faq-item').forEach(el => {
  el.style.opacity = '0';
  observer.observe(el);
});
