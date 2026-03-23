# Lesen

A mobile-first Progressive Web App for learning German through reading. Import texts, tap words to translate, and track your vocabulary as it grows.

**Lesen** is German for "to read."

## How It Works

1. **Import** a German text — paste it directly, or upload a `.txt`, `.epub`, or `.pdf` file
2. **Read** through the text, tapping any word you don't know
3. **Translate** words instantly via DeepL, with the dictionary form (lemma) shown automatically
4. **Track** your progress as words move from New → Learning → Known

As you learn more words, the amber highlights gradually fade away, leaving clean readable text. That visual progression is the core motivation loop.

## Features

- **Tappable word reader** — every word is color-coded by learning status (amber = new, orange = learning, clear = known)
- **Smart lemmatization** — marks "sprach" as known? "sprechen", "gesprochen", and "spricht" are all marked too
- **DeepL translation** — word and full-sentence translation with local caching
- **EPUB support** — auto-extracts chapters and cover images
- **PDF support** — text extraction with automatic chapter splitting
- **Vocabulary browser** — search, filter by level, grouped by lemma, with virtual scrolling
- **Fully offline** — PWA with service worker caching, all data stored locally in IndexedDB
- **No backend** — no accounts, no servers, no tracking. Your data stays on your device.

## Screenshots

*Import a text → Read with highlights → Tap to translate → Watch the highlights fade*

## Getting Started

### Prerequisites

- Node.js 18+
- A free [DeepL API key](https://www.deepl.com/pro-api) (optional, for translations)

### Setup

```bash
git clone https://github.com/yourusername/lesen.git
cd lesen
npm install
```

Create a `.env` file:

```
VITE_DEEPL_API_KEY=your_deepl_api_key_here
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

This is a fully static app — no backend needed.

1. Push to GitHub
2. Connect the repo to [Vercel](https://vercel.com)
3. Set framework preset to **Vite**
4. Add `VITE_DEEPL_API_KEY` in Vercel's Environment Variables
5. Deploy

Then open the URL on your phone, tap "Add to Home Screen", and you have a native-feeling reading app.

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui components
- Dexie.js (IndexedDB)
- vite-plugin-pwa
- epub.js + pdfjs-dist (lazy-loaded)
- Lucide React icons
- Lora (serif) + DM Sans (UI) from Google Fonts

## Data & Privacy

All data lives in your browser's IndexedDB. Nothing is sent to any server except DeepL's API when you translate a word for the first time (cached locally after that). You can export/import your data as JSON from Settings.

## License

MIT
