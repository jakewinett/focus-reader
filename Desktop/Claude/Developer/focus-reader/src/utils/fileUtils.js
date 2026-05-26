import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

// Returns plain text extracted from a PDF File object, or throws.
// Uses hasEOL to preserve line breaks; throws 'EMPTY_PDF' if no text layer found.
export async function extractFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    let pageText  = ''
    for (const item of content.items) {
      pageText += item.str
      // hasEOL signals a visual line break in the PDF layout
      pageText += item.hasEOL ? '\n' : ' '
    }
    const trimmed = pageText.trim()
    if (trimmed.length > 0) pages.push(trimmed)
  }

  const fullText = pages.join('\n\n')

  // Fewer than 80 chars across the whole document = no readable text layer
  if (fullText.trim().length < 80) {
    const err = new Error('This PDF appears to be scanned — no extractable text was found. Open it and copy the text manually.')
    err.code = 'EMPTY_PDF'
    throw err
  }

  return fullText
}

// Returns plain text extracted from a DOCX File object, or throws.
export async function extractFromDOCX(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
