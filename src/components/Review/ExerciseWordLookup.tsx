import { useState, useCallback } from 'react'
import { db, type Word, type Language } from '@/db/database'
import { getLemma, initLemmatizer } from '@/services/lemmatizer'
import WordBottomSheet from '@/components/Reader/WordBottomSheet'

/**
 * Hook that exposes a tap handler + a bottom sheet for looking up words tapped
 * inside an exercise sentence. If the word isn't in the DB yet, a minimal
 * record is created so WordBottomSheet can operate on it.
 */
export function useExerciseWordLookup(language: Language, sentence?: string) {
  const [open, setOpen] = useState(false)
  const [word, setWord] = useState<Word | undefined>()

  const handleTapWord = useCallback(
    async (wordText: string, existing: Word | undefined) => {
      if (existing) {
        setWord(existing)
        setOpen(true)
        return
      }

      // No record yet — create one on the fly so the bottom sheet works cleanly.
      // No bookIds because this word isn't tied to any imported content.
      await initLemmatizer(language)
      const lemma = getLemma(wordText, language) || wordText.toLowerCase()
      const now = new Date()
      const newWord: Omit<Word, 'id'> = {
        text: wordText.toLowerCase(),
        lemma,
        level: 'new',
        bookIds: [],
        lookupCount: 0,
        reviewStreak: 0,
        createdAt: now,
        updatedAt: now,
      }
      const id = await db.words.add(newWord as Word)
      const created = await db.words.get(id as number)
      if (created) {
        setWord(created)
        setOpen(true)
      }
    },
    [language],
  )

  const sheet = (
    <WordBottomSheet
      open={open}
      onClose={() => setOpen(false)}
      word={word}
      sentence={sentence}
      language={language}
    />
  )

  return { handleTapWord, sheet }
}
