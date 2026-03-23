# Claude Code Kickoff Prompt

## Paste this as your first message in Claude Code:

---

Read SPEC.md carefully — it's the full product spec for a PWA called "Lesen", a mobile-first German reading/vocabulary app.

Before writing any code, use Context7 MCP to look up the latest docs for every library you're about to use: React, Vite, Tailwind, Dexie.js, vite-plugin-pwa, and Lucide React. Do this for every library throughout the project — never rely on memory for API signatures or config.

Use the shadcn MCP to add shadcn/ui components (Button, Sheet, Dialog, Input, Tabs, etc.) whenever needed rather than building primitives from scratch.

Use Lucide React for all icons. Import individually: `import { BookOpen, Plus, Search } from 'lucide-react'`.

Now build Phase 1 as described in the spec:

1. Initialize a Vite + React + TypeScript project
2. Set up Tailwind CSS and integrate shadcn/ui
3. Set up Dexie.js with the full database schema from the spec (Books, Chapters, Words tables)
4. Build the lemmatizer service — it should load `public/lemma-de.tsv` (a tab-separated file with `lemma[TAB]inflected_form` per line) and parse it into a Map<string, string> for fast lookups
5. Set up vite-plugin-pwa with the app name "Lesen" and the warm cream theme color
6. Build the bottom tab navigation with 3 tabs: Library (BookOpen icon), Vocabulary (Languages icon), Settings (Settings icon)
7. Set up basic routing between the tabs and the inner screens (BookDetail, Reader)

Make sure everything is mobile-first — the design targets a phone screen. Use the warm color palette from the spec (#FAF8F5 backgrounds, dark brown text, amber/gold highlights for new words). Import Lora for reading text and DM Sans for UI text from Google Fonts.

After Phase 1 is solid, move to Phase 2 (Import + Library), then Phase 3 (Reader), etc. — follow the build order in the spec. Don't skip ahead.

---

## Folder structure before you start:

```
your-project-folder/
├── SPEC.md                    ← the main spec file (rename lesen-claude-code-prompt.md to this)
├── public/
│   └── lemma-de.tsv           ← download from https://github.com/michmech/lemmatization-lists (file: lemmatization-de.txt, rename it)
├── .env                       ← create this with: VITE_DEEPL_API_KEY=your_key_here
└── (everything else gets created by Claude Code)
```

## Setup checklist:

- [ ] Create empty project folder
- [ ] Copy `lesen-claude-code-prompt.md` into it and rename to `SPEC.md`
- [ ] Create `public/` subfolder
- [ ] Download `lemmatization-de.txt` from https://github.com/michmech/lemmatization-lists → rename to `lemma-de.tsv` → place in `public/`
- [ ] Sign up at https://www.deepl.com/pro-api for free API key
- [ ] Create `.env` file with `VITE_DEEPL_API_KEY=your_key_here`
- [ ] Make sure Context7 and shadcn MCPs are enabled in Claude Code
- [ ] Open Claude Code in the project folder
- [ ] Paste the kickoff prompt above
