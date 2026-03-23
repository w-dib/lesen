import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const publicDir = resolve(root, 'public')
const logo = resolve(publicDir, 'logo.png')

// Ensure icons directory
mkdirSync(resolve(publicDir, 'icons'), { recursive: true })

const sizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 64, name: 'icon-64x64.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' },
]

for (const { size, name } of sizes) {
  await sharp(logo)
    .resize(size, size)
    .png()
    .toFile(resolve(publicDir, 'icons', name))
  console.log(`Generated icons/${name} (${size}x${size})`)
}

// Also generate maskable icon with padding (safe area)
await sharp(logo)
  .resize(384, 384)
  .extend({
    top: 64,
    bottom: 64,
    left: 64,
    right: 64,
    background: { r: 250, g: 248, b: 245, alpha: 1 }, // #FAF8F5
  })
  .resize(512, 512)
  .png()
  .toFile(resolve(publicDir, 'icons', 'maskable-512x512.png'))
console.log('Generated icons/maskable-512x512.png (512x512 with safe zone)')

console.log('\nDone! All icons generated.')
