export interface ReviewExercise {
  lemma: string
  sentence: string
  translation: string
  distractors: string[]
}

export async function fetchReviewExercises(
  words: { lemma: string; translation?: string }[]
): Promise<ReviewExercise[]> {
  const res = await fetch('/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ words }),
  })

  if (!res.ok) {
    throw new Error('Failed to generate exercises')
  }

  const data = await res.json()
  return data.exercises
}
