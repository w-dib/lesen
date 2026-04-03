import { db, type CachedExercise } from '@/db/database'
import { fetchReviewExercises, type ReviewExercise } from './reviewApi'

let generating = false

/**
 * Get cached exercises for given lemmas.
 * Returns a Map of lemma → exercise for any that are cached and unused.
 */
export async function getCachedExercises(lemmas: string[]): Promise<Map<string, ReviewExercise>> {
  const cached = await db.exercises
    .where('lemma')
    .anyOf(lemmas.map(l => l.toLowerCase()))
    .filter(e => !e.used)
    .toArray()

  const map = new Map<string, ReviewExercise>()
  for (const e of cached) {
    map.set(e.lemma, {
      lemma: e.lemma,
      sentence: e.sentence,
      blanked: e.blanked,
      translation: e.translation,
      distractors: e.distractors,
    })
  }
  return map
}

/**
 * Mark exercises as used after a review session.
 */
export async function markExercisesUsed(lemmas: string[]) {
  await db.exercises
    .where('lemma')
    .anyOf(lemmas.map(l => l.toLowerCase()))
    .modify({ used: true })
}

/**
 * Pre-generate exercises for learning words that don't have cached exercises.
 * Call this after marking words as "learning" or after completing a review session.
 * Only fires if not already generating.
 */
export async function preGenerateExercises() {
  if (generating) return
  generating = true

  try {
    // Get all "learning" words grouped by lemma
    const learningWords = await db.words.where('level').equals('learning').toArray()
    const lemmaMap = new Map<string, string>()
    for (const w of learningWords) {
      if (!lemmaMap.has(w.lemma)) {
        lemmaMap.set(w.lemma, w.translation || '')
      }
    }

    if (lemmaMap.size === 0) return

    // Check which already have unused cached exercises
    const allLemmas = [...lemmaMap.keys()]
    const cached = await db.exercises
      .where('lemma')
      .anyOf(allLemmas)
      .filter(e => !e.used)
      .toArray()
    const cachedLemmas = new Set(cached.map(e => e.lemma))

    // Find lemmas that need exercises
    const needExercises = allLemmas.filter(l => !cachedLemmas.has(l))
    if (needExercises.length === 0) return

    // Generate in batches of 10
    const batch = needExercises.slice(0, 10)
    const wordsForApi = batch.map(lemma => ({
      lemma,
      translation: lemmaMap.get(lemma),
    }))

    const exercises = await fetchReviewExercises(wordsForApi)

    // Cache them
    const now = new Date()
    const records: Omit<CachedExercise, 'id'>[] = exercises.map(ex => ({
      lemma: ex.lemma.toLowerCase(),
      sentence: ex.sentence,
      blanked: ex.blanked || '',
      translation: ex.translation,
      distractors: ex.distractors,
      used: false,
      createdAt: now,
    }))

    // Use put to upsert (replace old used exercises)
    for (const record of records) {
      const existing = await db.exercises.where('lemma').equals(record.lemma).first()
      if (existing) {
        await db.exercises.update(existing.id, record)
      } else {
        await db.exercises.add(record as CachedExercise)
      }
    }
  } catch {
    // Silently fail — this is background work
  } finally {
    generating = false
  }
}
