# Lesen — Mobile-First German Reading App

## What This Is

Build a **PWA** (Progressive Web App) for learning German through reading. This is a personal tool — single user, no auth, no backend, fully local storage. Think of it as a mobile-native version of tools like LWT, Lute, or LinguaCafe, but stripped down to just what matters: importing texts, reading them word-by-word, tapping to translate, and tracking vocabulary over time.

The name is **Lesen** (German for "to read").

---

## Prerequisites (Before You Start Building)

1. **Download the German lemma file:** Go to `https://github.com/michmech/lemmatization-lists` and download `lemmatization-de.txt`. Rename it to `lemma-de.tsv` and place it in the `public/` directory.
2. **Get a DeepL API key:** Sign up at `https://www.deepl.com/pro-api` for a free account. Copy your API key — you'll set it as `VITE_DEEPL_API_KEY` in your `.env` file and later in Vercel's environment variables.

---

## Tech Stack

- **React 18 + Vite** (SPA, no SSR, no server)
- **TypeScript**
- **Tailwind CSS + shadcn/ui** for components
- **Lucide React** for all icons (bottom tabs, buttons, actions, etc.)
- **Dexie.js** for local storage (IndexedDB wrapper)
- **vite-plugin-pwa** for service worker + offline support
- **epub.js** or a lightweight epub parser for ebook import
- **pdf.js** for PDF text extraction
- No backend. No database server. No auth. No Docker.

---

## Tooling & MCP Servers

**This project has the following MCP servers available. Use them.**

1. **Context7 (`context7`)** — **Always use Context7 to look up library documentation before using any library.** This includes React, Vite, Tailwind, Dexie.js, shadcn/ui, epub.js, pdf.js, vite-plugin-pwa, Lucide React, and any other dependency. Do not rely on memory for API signatures or config options — look them up via Context7 first.

2. **shadcn/ui MCP** — Use the shadcn MCP server to add shadcn/ui components as needed. When you need a Button, Sheet, Dialog, Input, Tabs, or any other UI primitive, pull it in via the shadcn MCP rather than building from scratch.

**Icons:** Use `lucide-react` for all iconography. Import icons individually: `import { BookOpen, Plus, Search, Settings, ArrowLeft } from 'lucide-react'`. Do not use any other icon library.

---

## Design Direction

**Aesthetic: Warm minimalism meets Kindle.** Think of a well-designed reading app, not a data dashboard. The UI should feel calm, bookish, and touch-friendly.

- **Mobile-first.** Every screen is designed for a phone held in one hand. Desktop is a nice-to-have, not a priority.
- **Color palette:** Warm neutrals — cream/off-white backgrounds (`#FAF8F5` or similar), dark brown/charcoal text, muted accent colors for word levels. No harsh whites, no blue-gray corporate vibes.
- **Typography:** Use a beautiful serif font for reading text (e.g., Lora, Merriweather, or Literata from Google Fonts). Use a clean sans-serif for UI chrome (e.g., DM Sans or Plus Jakarta Sans). The reading experience should feel like reading a book.
- **Touch targets:** Every tappable word, button, or control must be at minimum 44px touch target. Words in the reader should have generous line-height (1.8-2.0) and comfortable spacing so fat-finger taps work reliably.
- **Bottom sheet pattern:** Word lookups use a bottom sheet that slides up from the bottom of the screen (like Google Maps or iOS share sheets). This is the primary interaction pattern.
- **Smooth transitions:** Page/screen transitions should use subtle slide or fade animations. The bottom sheet should have spring physics or at least a smooth ease-out.

### Word Level Colors (used in the reader and vocab list)

These are background highlight colors applied to each word in the reader based on its learning status:

| Level | Color | Meaning |
|-------|-------|---------|
| New | Warm amber/gold (`#F6D889`) | Never encountered before — first time seeing this word |
| Learning | Soft orange (`#F0B86E`) | You've looked it up at least once, actively learning |
| Known | No highlight (transparent) | You know this word, it blends into the text naturally |
| Ignored | No highlight (transparent), slightly dimmed text | Numbers, proper nouns, junk — excluded from stats |

The idea: as you learn more words, the text gradually "clears up" — moving from a sea of amber highlights to clean, readable text. This visual progression is the core motivation loop.

---

## App Structure

**3 bottom tabs only:**

1. **Library** (book icon) — your imported texts
2. **Vocabulary** (文/A icon or dictionary icon) — all tracked words
3. **Settings** (gear icon) — minimal config

No burger menu. No sidebar on mobile. Keep navigation dead simple.

---

## Screen-by-Screen Spec

### 1. Library (Home Tab)

**Layout: Vertical card list**, not a table. Each card shows:
- Book cover thumbnail on the left — displayed at **60×90px** (2:3 ratio). If no cover was uploaded or extracted, show a generated placeholder: a rounded rectangle with a warm color (seeded from the title hash so each book gets a unique color) and the first 1-2 letters of the title in large serif text.
- Title (bold, truncated to 2 lines)
- Progress indicator: a thin progress bar showing `% known words` out of total unique words
- Subtle metadata: "4,165 words · 12 chapters" in small muted text

**Sorting:** Default to most recently opened. No complex sort UI needed — just show them in last-read order.

**Import button:** A floating action button (FAB) in the bottom-right corner, `+` icon. Tapping it opens the import flow.

**Empty state:** When no books are imported, show a friendly illustration or icon with "Tap + to import your first text" message.

### 2. Import Flow (Modal/Full-Screen Sheet)

**This is NOT a multi-step wizard.** It's a single screen:

- **Title input** at the top (auto-populated from filename if a file is uploaded)
- **Cover image area:** A tappable placeholder (book icon + "Add cover") that opens the device's image picker. Display dimensions in the UI: **120×180px thumbnail** in the import form (2:3 aspect ratio). The stored image should be resized/compressed to **240×360px** max as a data URL in IndexedDB — no need for full-resolution images.
  - **For EPUBs:** Auto-extract the embedded cover image if one exists and pre-populate this field. The user can still tap to replace it with their own image.
  - **For all other formats:** The placeholder stays empty unless the user uploads one.
  - **If no cover is provided:** The library card shows a generated placeholder — a rounded rectangle with the book's background color (seeded from title hash for variety) and the first 1-2 letters of the title in large serif text.
- **Two options presented as large tap targets:**
  - **Paste Text** — opens a textarea where you paste raw text
  - **Upload File** — file picker that accepts: `.txt`, `.epub`, `.pdf`, `.mobi`
- **Import button** at the bottom

**On import:**
- The app auto-splits the text into chapters based on a character limit (~3000-5000 characters per chapter, configurable in settings but defaulting to sensible value).
- For EPUBs: respect the book's existing chapter structure if available. Extract the cover image from EPUB metadata if present.
- For PDFs: extract text page-by-page, then chunk into chapters.
- For plain text: split by double-newline paragraphs first, then group paragraphs into chapters up to the character limit.
- Every unique word in the text is added to the vocabulary database with status "New".
- Numbers (pure digits like "10", "1000", "10:00") should be auto-set to "Ignored" on import.

### 3. Book Detail Screen

**Accessed by tapping a book card in the Library.**

**Layout:**
- Cover image at the top (centered, displayed at **120×180px**, or the generated placeholder if none)
- Book title below the cover (large)
- Stats row: "X unique words · Y% known" — simple, not a table
- **Chapter list:** Vertical list of chapters, each showing:
  - Chapter name/number
  - A mini progress bar (% known words in that chapter)
  - Tap to open the reader for that chapter

**Back navigation:** Top-left back arrow returns to Library.

### 4. Reader Screen (THE CORE)

**This is where the user spends 95% of their time. It must feel great.**

**Text rendering:**
- The chapter text is rendered as a continuous flow of tappable `<span>` elements, one per word.
- Punctuation is attached to the preceding word (no orphaned periods or commas).
- Each word's background color reflects its learning level (see color table above).
- Line height should be generous (1.8-2.0) so tapping individual words is easy.
- Use the serif reading font here. This should feel like reading a book, not a code editor.
- Paragraphs should be visually separated with spacing.

**Tapping a word opens the bottom sheet:**

The bottom sheet is the lookup/interaction panel. It slides up from the bottom and contains:

1. **The word itself** displayed prominently at the top of the sheet (large text)
2. **Lemma** — show the base/dictionary form looked up from the bundled lemma mapping file (see Lemmatization section below). E.g., tapping "sprach" shows "sprach → sprechen", tapping "größten" shows "größten → groß". If no lemma mapping is found, just show the word as-is.
3. **Translation area:**
   - Auto-lookup the word via DeepL (see Dictionary section below)
   - Show the translation(s)
   - If no result found, show a "No translation found" message with a button to search on dict.cc
4. **"Translate sentence" button:** A secondary button below the word translation that says "Translate full sentence". Tapping it detects the sentence boundaries around the tapped word (from the previous sentence-ending punctuation `.?!` to the next one), sends the full sentence to DeepL, and displays the sentence translation below the word translation in the same bottom sheet. This is useful for understanding words in context, idioms, and compound expressions. The sentence translation should be visually distinct (e.g., in a muted card/box below the word translation, with the original German sentence shown above and the English translation below).
5. **Level selector:** Four buttons in a row: `New` | `Learning` | `Known` | `Ignored` — the current level is highlighted. Tap to change. This should immediately update the word's color in the text above. **Important:** When changing a word's level, apply the change to ALL forms that share the same lemma. E.g., marking "sprach" as Known should also mark "sprechen", "gesprochen", "spricht" etc. as Known (if they exist in the vocabulary database).
6. **Dismiss:** Tap outside the sheet or swipe down to close.

**Top toolbar in reader (minimal):**
- Back arrow (returns to book detail)
- Chapter title (centered)
- A small button to jump to next/previous chapter

**"Mark all known" gesture:** A button (maybe in the top toolbar or at the bottom of the chapter text) that marks ALL remaining "New" words in the chapter as "Known". This is a power-user feature for when you're reading easy text and want to quickly clear it.

### 5. Vocabulary Tab

**A searchable, filterable list of all words you've encountered.**

**Top section:**
- Search bar (filters words as you type)
- Filter pills/tabs: `All` | `New` | `Learning` | `Known` | `Ignored` — tap to filter. Show count on each pill.

**Word list:**
- Words are **grouped by lemma**. Each row shows the lemma as the primary text, with all encountered inflected forms shown as subtle sub-text below it (e.g., the row for "sprechen" would show "sprach, spricht, gesprochen" underneath in smaller muted text).
- Translation (if looked up) shown on the right side
- A colored dot/badge indicating its level
- Tap a word/lemma group to open an edit sheet where you can:
  - See/edit the translation
  - Change the level (applies to all forms under the same lemma)
  - See all inflected forms encountered
  - See which book(s) it appeared in

**Sorting:** Alphabetical by default, with option to sort by "most recently looked up" or "level".

**Pagination or virtual scroll:** If there are thousands of words, use virtual scrolling (e.g., `react-window` or `@tanstack/react-virtual`) to keep performance smooth.

### 6. Settings Tab

**Keep this dead simple:**

- **Chapter size:** Slider or input for default characters-per-chapter when auto-splitting (default: 3000)
- **Font size:** Slider for reader text size
- **Export data:** Button to export all vocabulary + books as a JSON file (for backup)
- **Import data:** Button to import a previously exported JSON backup
- **Clear all data:** Danger button with confirmation dialog
- **About:** App name, version, and a one-liner description

**No dictionary settings needed.** The dictionary is baked into the app (see below).

---

## Dictionary / Translation System

**Approach: DeepL Free API + local cache.**

For German → English translation, use this strategy:

1. **Primary: DeepL Free API.** Sign up at [https://www.deepl.com/pro-api](https://www.deepl.com/pro-api) for a free API key (500,000 characters/month — more than enough for personal use). DeepL has significantly better German translation quality than free alternatives.
   - Endpoint: `https://api-free.deepl.com/v2/translate`
   - Auth: `Authorization: DeepL-Auth-Key YOUR_KEY`
   - Body: `{ "text": ["word"], "source_lang": "DE", "target_lang": "EN" }`
   - The API key should be stored in a `.env` file as `VITE_DEEPL_API_KEY` and injected at build time. Since this is a personal app deployed to your own Vercel, this is fine — the key is technically visible in the client bundle but it's your free-tier key on your private app.

2. **Cache every lookup:** When a word is looked up, store the translation in Dexie alongside the word record. Next time that word is tapped, show the cached translation instantly without hitting the API. This means you'll only ever call DeepL once per unique word.

3. **Fallback:** If the API fails, the key isn't set, or it returns nothing useful, show a "Search online" button that opens `https://www.dict.cc/?s={word}` in a new tab.

4. **No offline dictionary bundle needed.** Over time, the cache builds up and most words you encounter will have cached translations. For a personal reading app, this is plenty.

---

## Lemmatization (Word Form → Base Form Mapping)

**Approach: Bundled static lookup table.**

German is heavily inflected — a single verb like "gehen" appears as "gehe", "gehst", "geht", "ging", "gegangen", "gingen", etc. Without lemmatization, each of these would be a separate vocabulary entry that you'd have to learn independently. With lemmatization, they're all grouped under "gehen".

**Data source:** Use the German lemma list from the `michmech/lemmatization-lists` repository on GitHub:
- URL: `https://github.com/michmech/lemmatization-lists`
- File: `lemmatization-de.txt`
- Format: `lemma[TAB]inflected_form` — one pair per line (e.g., `sprechen\tsprach`)
- Size: 358,473 pairs (~3-4MB raw, smaller compressed)
- License: Open Database License (free to use)

**Implementation:**

1. **Bundle the file** as a static asset in `public/lemma-de.tsv` (or similar).
2. **On first app load**, parse the TSV into a `Map<string, string>` where the key is the lowercased inflected form and the value is the lemma. Store this map in memory. Since the file is ~3-4MB, this loads fast and the map consumes reasonable memory. Optionally, parse it once and store the map in IndexedDB for faster subsequent loads, but in-memory parsing on each load is likely fast enough.
3. **On word lookup (tap):** When a word is tapped in the reader, look up its lowercase form in the lemma map. If found, populate the `lemma` field on the Word record. Display both the inflected form and the lemma in the bottom sheet (e.g., "sprach → sprechen").
4. **On import:** When a book is imported and words are extracted, look up each word's lemma and store it on the Word record. This allows immediate grouping in the vocabulary view.
5. **Level changes propagate by lemma:** When the user changes a word's level (e.g., marks "sprach" as Known), find all other Word records that share the same lemma and update their levels too. This means learning one form of a word effectively learns all forms.
6. **Vocab grouping:** In the Vocabulary tab, words are grouped by lemma. A single row represents the lemma, with all encountered inflected forms listed as sub-text.
7. **Graceful fallback:** If a word isn't found in the lemma map (rare words, compound nouns, neologisms), just use the word itself as its own lemma. Everything still works — it just won't be grouped with other forms.

**Important edge case:** Some inflected forms map to multiple possible lemmas (e.g., "ging" could theoretically have multiple roots, though in practice it's almost always "gehen"). The TSV file may have duplicate inflected forms with different lemmas. For simplicity, use the FIRST match. This is good enough for a reading app.

---

## Data Model (Dexie/IndexedDB)

```typescript
// Books table
interface Book {
  id?: number;          // auto-increment
  title: string;
  coverUrl?: string;    // stored as data URL (base64), max 240x360px. Extracted from EPUB or uploaded manually.
  totalWords: number;
  uniqueWords: number;
  createdAt: Date;
  lastOpenedAt: Date;
}

// Chapters table
interface Chapter {
  id?: number;
  bookId: number;       // foreign key to Book
  title: string;        // "Chapter 1", "Chapter 2", etc.
  orderIndex: number;   // for sorting
  content: string;      // the raw text content
  wordCount: number;
}

// Words table (global vocabulary)
interface Word {
  id?: number;
  text: string;            // the word as it appears (lowercase)
  lemma: string;            // base/dictionary form from lemma mapping file. Falls back to the word itself if no mapping found.
  translation?: string;    // cached translation
  level: 'new' | 'learning' | 'known' | 'ignored';
  bookIds: number[];       // which books this word appears in
  lookupCount: number;     // how many times tapped
  lastLookedUp?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Important indexing:** The `Word.text` field must be indexed for fast lookup when rendering the reader. The `Word.lemma` field must also be indexed for grouping in the vocabulary view and for propagating level changes across word forms. When the reader renders a chapter, it needs to look up every word's level to apply the correct color. This should be batched — load all words for a chapter in one query, not one-by-one.

---

## PWA Configuration

Using `vite-plugin-pwa`:

- **App name:** Lesen
- **Theme color:** Match the warm cream palette
- **Icons:** Generate a simple book/reading icon in required sizes
- **Offline support:** Cache the app shell and all assets. The app should work fully offline (except for dictionary API lookups, which gracefully fallback to cached translations or the "search online" button).
- **Install prompt:** Show an "Add to Home Screen" banner on first visit (standard PWA behavior).

---

## Hosting & Deployment

**This is a fully static app. There is no backend.**

- **Host on Vercel** (free tier). The app is just HTML, JS, CSS, and assets — Vercel serves it as static files.
- **Deploy via GitHub:** Push the repo to GitHub, connect it to Vercel, and every push to `main` auto-deploys.
- **Vercel config:** Framework preset = Vite. Build command = `npm run build`. Output directory = `dist`.
- **Environment variable:** Set `VITE_DEEPL_API_KEY` in Vercel's environment variables dashboard (Settings → Environment Variables). This gets baked into the JS bundle at build time.

**How the user accesses it:**
1. Visit the Vercel URL on your phone (Chrome on Android)
2. Chrome shows an "Add to Home Screen" prompt (or use the browser menu → "Install app")
3. The app icon appears on your home screen like a native app
4. From then on, it opens full-screen (no browser chrome) and works offline

**Where data lives:**
- ALL data (books, chapters, vocabulary, translations) is stored in **IndexedDB on the device's browser**.
- Nothing is sent to any server. Vercel only serves the app code — it never sees your data.
- The only outbound network call is to DeepL's API when translating a word for the first time. That translation is then cached locally forever.
- **Caveat:** If you clear your browser data or uninstall Chrome, your data is gone. The export/import JSON feature in Settings is your backup strategy.

---

## File Structure

```
lesen/
├── public/
│   ├── lemma-de.tsv          # German lemma mapping file (from michmech/lemmatization-lists)
│   └── (PWA icons, manifest handled by vite-plugin-pwa)
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── Library/
│   │   │   ├── BookCard.tsx
│   │   │   ├── ImportModal.tsx
│   │   │   └── LibraryView.tsx
│   │   ├── Reader/
│   │   │   ├── ReaderView.tsx
│   │   │   ├── WordSpan.tsx
│   │   │   └── WordBottomSheet.tsx
│   │   ├── Vocabulary/
│   │   │   └── VocabularyView.tsx
│   │   ├── BookDetail/
│   │   │   └── BookDetailView.tsx
│   │   └── Settings/
│   │       └── SettingsView.tsx
│   ├── db/
│   │   └── database.ts       # Dexie setup and schema
│   ├── services/
│   │   ├── dictionary.ts     # DeepL API lookup + caching
│   │   ├── lemmatizer.ts     # Load + query the lemma-de.tsv mapping file
│   │   ├── importer.ts       # Text/epub/pdf parsing + chunking
│   │   └── textProcessor.ts  # Tokenize text into words
│   ├── hooks/
│   │   ├── useBooks.ts
│   │   ├── useWords.ts
│   │   └── useChapters.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css             # Tailwind + global styles + font imports
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Build Order (Suggested Phases)

### Phase 1: Foundation
- Vite + React + TypeScript + Tailwind + shadcn/ui setup
- PWA plugin config
- Dexie database setup with schema
- Lemmatizer service: load and parse `lemma-de.tsv` into a Map
- Bottom tab navigation (Library / Vocabulary / Settings)
- Basic routing (use simple state-based navigation or react-router)

### Phase 2: Import + Library
- Import modal: paste text and upload .txt files
- Cover image upload (with auto-extract from EPUB)
- Text chunking into chapters
- Book + Chapter creation in Dexie
- Word extraction with lemma lookup on import
- Library view with book cards (cover thumbnails, progress bars)
- Book detail view with chapter list

### Phase 3: Reader (the big one)
- Chapter text rendering as tappable word spans
- Word color-coding by level
- Bottom sheet on word tap (with lemma display)
- DeepL API integration for word translation
- "Translate sentence" button in bottom sheet
- Translation caching
- Level changing (tap to set New/Learning/Known/Ignored) — propagates to all forms sharing the same lemma
- Chapter navigation (next/prev)
- "Mark all known" button

### Phase 4: Vocabulary
- Searchable word list grouped by lemma
- Filter by level
- Tap to edit word/lemma group details
- Virtual scrolling for performance

### Phase 5: Polish
- EPUB import (using epub.js or similar)
- PDF import (using pdf.js)
- Settings screen
- Export/import data as JSON
- Empty states, loading states, error states
- Animations and transitions
- Final PWA optimization (caching, offline handling)

---

## Key UX Principles

1. **The reader is everything.** If the reader feels great to use — smooth word tapping, fast translations, satisfying color transitions as words move from New → Known — the app succeeds. Everything else is plumbing.

2. **No configuration required.** It should work out of the box. Import a text, start reading. Don't ask the user to configure dictionaries, set languages, create accounts, or adjust settings before they can start.

3. **Speed matters.** Word lookups should feel instant (show cached translation immediately, fetch from API in background if needed). Chapter rendering should be fast even with thousands of words. Use virtualization and batched DB reads where needed.

4. **The highlight fade is the reward.** As the user learns more words, chapters visually transform from walls of amber/gold highlights to clean, readable text. This visual progress is inherently motivating. Make sure the transition from "new" to "known" is smooth (maybe a brief subtle animation when a word's level changes).

5. **Fat fingers are real.** On a phone, tapping the right word in a paragraph is hard. Generous line-height, word-spacing, and padding on word spans are essential. If two words are too close together, tapping becomes frustrating and the whole app falls apart.

---

## What NOT to Build

- No user accounts or authentication
- No server or backend
- No review/flashcard system (just reading + vocabulary tracking)
- No spaced repetition algorithm
- No multi-language support (German only for now, hardcoded)
- No social features
- No text-to-speech
- No grammar analysis
- No themes/dark mode (stick with the warm light theme for now; can add later)
- No complex statistics or analytics dashboards
