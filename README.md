# 📚 Study Portal – Watch Free Lectures

A complete, self-contained study portal that fetches batch data and plays lectures using Shaka Player with `vidcloud.eu.org` as the video proxy.

## Features

- 🔍 Search batches by name, exam, or description
- 📂 Expand batches → subjects → topics → lectures
- ▶️ Watch lectures using Shaka Player (DASH/HLS)
- 🌙 Dark theme with smooth animations
- 📱 Fully responsive

## How It Works

1. Fetches batches from your `batches.json` (GitHub)
2. Expands to show subjects, topics, and lectures
3. Uses `vidcloud.eu.org/play.php` as a proxy to get signed video URLs
4. Plays videos using Shaka Player

## Deployment

Just upload these files to any static hosting:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

No backend needed – everything runs client-side.

## Files

- `index.html` – Main structure
- `style.css` – Complete dark theme
- `script.js` – All logic (fetch, render, play)

## Credits

- Video proxy: [vidcloud.eu.org](https://vidcloud.eu.org)
- Player: [Shaka Player](https://github.com/shaka-project/shaka-player)