import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import type { Plugin } from 'vite'

function deepseekProxy(): Plugin {
  let apiKey: string | undefined
  return {
    name: 'deepseek-proxy',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, '')
      apiKey = env.DEEPSEEK_API_KEY
    },
    configureServer(server) {
      server.middlewares.use('/api/review', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405)
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        if (!apiKey) {
          res.writeHead(500)
          res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY not set' }))
          return
        }

        const chunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString())

            // Translation mode
            if (body.translate) {
              const { text, language } = body
              const prompt = `Translate the following ${language} text to English. Reply with ONLY the translation, nothing else:\n\n${text}`
              const data = await callDeepSeek(apiKey!, prompt, 200)
              const translation = data.choices?.[0]?.message?.content?.trim() || null
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ translation }))
              return
            }

            // Review exercise mode
            const { words, language = 'German' } = body
            const wordList = words.map((w: { lemma: string; translation?: string }) =>
              `${w.lemma}${w.translation ? ` (${w.translation})` : ''}`
            ).join(', ')

            const prompt = `You are a ${language} language tutor. Generate review exercises for these ${language} words: ${wordList}

For each word, create:
1. A natural ${language} sentence using that word (B1 level, 8-15 words)
2. The English translation of that sentence
3. Three distractor words that could plausibly fill the blank (same part of speech, similar difficulty)

Respond in JSON format only, no markdown:
[
  {
    "lemma": "the word",
    "sentence": "full ${language} sentence with the word",
    "translation": "English translation of the sentence",
    "distractors": ["word1", "word2", "word3"]
  }
]`

            const data = await callDeepSeek(apiKey!, prompt, 2000)
            const content = data.choices?.[0]?.message?.content || '[]'
            const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
            const exercises = JSON.parse(jsonStr)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ exercises }))
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to process request' }))
          }
        })
      })
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callDeepSeek(apiKey: string, prompt: string, maxTokens: number): Promise<Record<string, any>> {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  })
  return response.json() as Promise<Record<string, any>>
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    deepseekProxy(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.ico',
        'icons/favicon-32x32.png',
        'icons/favicon-16x16.png',
        'icons/apple-touch-icon.png',
      ],
      manifest: {
        name: 'Lesen',
        short_name: 'Lesen',
        description: 'A mobile-first German reading and vocabulary app',
        theme_color: '#FAF8F5',
        background_color: '#FAF8F5',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/translate': {
        target: 'https://api-free.deepl.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/translate/, '/v2/translate'),
      },
    },
  },
})
