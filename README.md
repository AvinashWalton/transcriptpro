# ▶ TranscriptPro — YouTube Transcript Extractor

> **Instantly extract full transcripts from any YouTube video — plain text or with timestamps — for free.**

Built by **[Avinash Walton](https://github.com/avinashwalton)**

---

## 🌐 Live Demo

👉 **[transcriptpro.github.io](https://avinashwalton.github.io/transcriptpro)**

---

## ✨ Features

| Feature | Description |
|---|---|
| 📄 **Plain Text Copy** | पूरा transcript बिना timestamps के copy करें |
| 🕐 **Timestamp Copy** | हर line के साथ `[MM:SS]` format में copy करें |
| 📥 **Download .txt** | Transcript file को download करें offline use के लिए |
| 🔍 **Live Search** | Transcript में कोई भी word instantly search करें |
| 🖼 **Video Metadata** | Thumbnail, title, channel, word count automatically दिखाए |
| ⚡ **Auto Paste Detect** | URL paste करते ही automatically extract हो जाता है |
| ⌨️ **Keyboard Shortcut** | `Ctrl+K` / `Cmd+K` से URL input पर instantly focus |
| 📱 **Fully Responsive** | Mobile, tablet और desktop — सब पर perfectly काम करता है |
| 🔒 **No Login Required** | 100% free, कोई account नहीं, कोई payment नहीं |
| 🌐 **SEO Optimized** | Meta tags, Open Graph, Schema.org structured data |

---

## 📸 Preview

```
┌─────────────────────────────────────────────────┐
│  ▶ TranscriptPro                                │
│─────────────────────────────────────────────────│
│                                                 │
│   YouTube Transcript Extractor                  │
│                                                 │
│   [ 🔗 YouTube URL paste करें...    ] [Extract →] │
│                                                 │
│   ┌─────────────────────────────────────────┐  │
│   │ 📄 Plain Text  │ 🕐 With Timestamps      │  │
│   │─────────────────────────────────────────│  │
│   │ [00:00] Hello and welcome to this...    │  │
│   │ [00:05] Today we are going to talk...   │  │
│   └─────────────────────────────────────────┘  │
│                                                 │
│  [Copy Plain] [Copy Timestamps] [Download] [↺]  │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Option 1 — GitHub Pages (Recommended)

1. इस repository को **Fork** करें
2. **Settings → Pages → Source → main branch** select करें
3. Save करें — कुछ minutes में live हो जाएगा ✅

### Option 2 — Local Use

```bash
# Clone the repo
git clone https://github.com/avinashwalton/transcriptpro.git

# Folder open करें
cd transcriptpro

# index.html को browser में open करें
# (किसी server की जरूरत नहीं — directly open हो जाता है)
open index.html
```

---

## 📁 File Structure

```
transcriptpro/
│
├── index.html        # Main HTML — SEO optimized, semantic structure
├── style.css         # Dark editorial design, responsive layout
├── script.js         # Transcript fetch logic, copy/download, search
└── README.md         # This file
```

---

## 🔧 How It Works (Technical)

```
User enters YouTube URL
        ↓
Extract Video ID from URL
        ↓
Fetch Video Metadata (noembed API)
        ↓
Try YouTube Timedtext API
  ├── json3 format (primary)
  ├── srv3 / vtt format (fallback)
  └── Page scan for caption track URL (last resort)
        ↓
Parse caption entries → timestamps + text
        ↓
Render Plain Text + Timestamped views
        ↓
User can Copy / Download
```

### Caption Formats Supported
- `json3` — YouTube's JSON caption format
- `srv3` — Structured XML captions
- `vtt` — WebVTT subtitles
- Auto-generated captions ✅
- Manual/uploaded captions ✅

### CORS Proxy Chain
Browser same-origin policy bypass के लिए multiple proxies use होते हैं:
1. `api.allorigins.win`
2. `corsproxy.io`
3. `cors-anywhere.herokuapp.com`

---

## 📋 Supported URL Formats

```
✅ https://www.youtube.com/watch?v=VIDEO_ID
✅ https://youtu.be/VIDEO_ID
✅ https://youtube.com/shorts/VIDEO_ID
✅ https://youtube.com/embed/VIDEO_ID
✅ VIDEO_ID (direct)
```

---

## ⚠️ Limitations

- **Private videos** — transcript नहीं मिलता (YouTube allow नहीं करता)
- **Age-restricted videos** — captions publicly accessible नहीं होते
- **Captions disabled videos** — अगर creator ने captions off किए हों
- **CORS dependency** — third-party proxies पर depend करता है; occasionally slow हो सकता है

---

## 🎨 Design

- **Theme:** Dark editorial with amber/orange accent
- **Fonts:** Syne (display) · DM Sans (body) · DM Mono (timestamps)
- **Color Palette:**
  - Background: `#0a0a0b`
  - Accent: `#f5a623` (amber)
  - Secondary accent: `#ff6b35` (orange)
- **Animations:** CSS-only orbs, loader bars, scroll reveals, toast notifications

---

## 🔍 SEO Features

- ✅ Title, meta description, keywords
- ✅ Open Graph tags (Facebook, LinkedIn)
- ✅ Twitter Card
- ✅ Schema.org `WebApplication` structured data
- ✅ Canonical URL
- ✅ Semantic HTML5 (header, main, nav, section, article, footer)
- ✅ ARIA labels for accessibility
- ✅ `robots: index, follow`

---

## 🛠 Technologies Used

- **HTML5** — Semantic markup
- **CSS3** — Custom properties, Grid, Flexbox, animations
- **Vanilla JavaScript** — No frameworks, no dependencies
- **Google Fonts** — Syne, DM Sans, DM Mono
- **YouTube Timedtext API** — Caption extraction
- **noembed API** — Video metadata
- **AllOrigins / CORSProxy** — CORS bypass

---

## 📜 License

MIT License — free to use, modify, and distribute.

```
MIT License

Copyright (c) 2025 Avinash Walton

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
```

---

## 🙏 Credits & Disclaimer

- Built by **Avinash Walton**
- Not affiliated with YouTube, Google, or Alphabet Inc.
- YouTube captions/transcripts are the property of their respective creators.
- This tool only accesses publicly available caption data via YouTube's public API.

---

## 📬 Contact

**Avinash Walton**
- GitHub: [@avinashwalton](https://github.com/avinashwalton)

---

<p align="center">
  Made with ❤️ by <strong>Avinash Walton</strong>
</p>
