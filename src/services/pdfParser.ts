import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'

// Use the bundled worker
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface PdfResult {
  text: string
  pageTexts: string[]
}

export async function parsePdf(file: File): Promise<PdfResult> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise

  const pageTexts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim()
    if (pageText) {
      pageTexts.push(pageText)
    }
  }

  return {
    text: pageTexts.join('\n\n'),
    pageTexts,
  }
}
