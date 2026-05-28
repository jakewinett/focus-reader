import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

// ── PDF text re-flow ─────────────────────────────────────────────────────────
//
// PDF text extraction preserves visual column-wrap line breaks, not semantic
// paragraph structure. This means:
//   - Long paragraphs are split across many short lines
//   - Headings look identical to continuation lines
//   - parseParagraphs() groups everything into one giant block
//
// reflowPDFText() repairs this by:
//   1. Identifying heading-like lines (short, title-cased/all-caps) → keep standalone
//   2. Joining word-wrap continuations (no terminal punctuation) into full sentences
//   3. Splicing hyphenated word-breaks back together
//   4. Preserving blank lines as explicit paragraph boundaries

function looksLikeHeading(line, nextNonBlankLine) {
  const t = line.trim()
  if (!t || t.length === 0) return false
  // Too long to be a heading
  if (t.length > 80) return false
  // Starts lowercase → word-wrap continuation of previous line
  if (/^[a-z]/.test(t)) return false
  // Ends with continuation punctuation → not a heading
  if (/[,;:]$/.test(t)) return false
  // All-caps label (e.g. "PLEASE NOTE", "CHAPTER 3") — always treat as heading
  if (/^[A-Z0-9 \-–—:]+$/.test(t) && t.length < 80) return true
  // Short title-case line followed by a longer body line
  if (t.length < 60 && nextNonBlankLine && nextNonBlankLine.length > t.length * 1.5) return true
  return false
}

function reflowPDFText(text) {
  const raw = text.split('\n')
  const out = []
  let i = 0

  while (i < raw.length) {
    const line = raw[i].trimEnd()

    // Blank line — preserve as paragraph boundary
    if (line.trim() === '') {
      // Avoid consecutive blanks in output
      if (out.length > 0 && out[out.length - 1] !== '') out.push('')
      i++
      continue
    }

    // Look ahead for the next non-blank line (used for heading detection)
    let nextNonBlank = ''
    for (let j = i + 1; j < raw.length; j++) {
      if (raw[j].trim() !== '') { nextNonBlank = raw[j].trim(); break }
    }

    // Heading candidate — keep as its own standalone line
    if (looksLikeHeading(line.trim(), nextNonBlank)) {
      // Ensure a blank line above a heading (visual separation)
      if (out.length > 0 && out[out.length - 1] !== '') out.push('')
      out.push(line.trim())
      i++
      continue
    }

    // Regular line — join word-wrap continuations into one logical line
    let logical = line

    while (i + 1 < raw.length) {
      const next = raw[i + 1].trimEnd()
      if (next.trim() === '') break                          // paragraph break → stop

      // Don't absorb heading candidates into a paragraph
      let nextNextNonBlank = ''
      for (let j = i + 2; j < raw.length; j++) {
        if (raw[j].trim() !== '') { nextNextNonBlank = raw[j].trim(); break }
      }
      if (looksLikeHeading(next.trim(), nextNextNonBlank)) break

      const tail = logical.trimEnd()
      const lastChar = tail[tail.length - 1] ?? ''

      // Hyphenated word-break: join without space, strip the hyphen
      if (lastChar === '-') {
        logical = tail.slice(0, -1) + next.trimStart()
        i++
        continue
      }

      // Terminal punctuation → paragraph ends here
      if (/[.?!"]$/.test(tail)) break

      // Otherwise: word-wrap continuation → join with a space
      logical = tail + ' ' + next.trimStart()
      i++
    }

    out.push(logical.trim())
    i++
  }

  // Normalise: collapse 3+ blank lines → 2, trim edges
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// ── DOCX structured text ─────────────────────────────────────────────────────
//
// mammoth.convertToHtml() preserves document structure (headings, lists, tables)
// that extractRawText() discards. We walk the HTML DOM and produce a plain-text
// representation where "block" elements (TOC, lists, tables) are prefixed with §.
//
// § lines in the raw text are grouped by parseLines() into single block entries
// so FocusReader can render them as a card (all items visible at once) rather
// than advancing line-by-line through structural navigation content.
//
// Format of a block entry in the lines array:
//   "§Title / first line\nEntry two\nEntry three\n..."
//
// Non-block content produces normal blank-separated paragraphs.

function getBlockLabel(firstLine) {
  if (!firstLine) return 'List'
  const t = firstLine.trim()
  if (/^(table of contents|contents)[:.]?\s*$/i.test(t)) return 'Table of Contents'
  if (/^(index|outline)[:.]?\s*$/i.test(t))              return 'Outline'
  if (/^(appendix|references|bibliography)[:.]?\s*$/i.test(t)) return 'Reference List'
  if (/^list of /i.test(t))                               return 'List'
  return null  // first line is content, not a label
}

// Exported so FocusReader can call it.
export { getBlockLabel }

// Extract readable text from a <li> element.
// li.textContent concatenates child nodes without spacing, so
// <strong>Bold.</strong>Rest → "Bold.Rest". We fix this by:
//   1. Joining each direct-child element's text with a space
//      (handles <p>Title.</p><p>Body</p> structure)
//   2. Applying a regex to add a space after sentence-ending punctuation
//      before a capital letter (handles <strong>Title.</strong>Body in one <p>)
function liText(li) {
  const blocks = Array.from(li.children)
  const raw = blocks.length > 0
    ? blocks.map(c => c.textContent.trim()).filter(Boolean).join(' ')
    : li.textContent.trim()
  // "Foo.Bar" or "Foo.\"Bar" → "Foo. Bar" / "Foo. \"Bar"
  return raw.replace(/([.!?])([“"A-Z])/g, '$1 $2')
}

function htmlToStructuredText(html) {
  // DOMParser is available in all browser contexts (this module is browser-only)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const children = Array.from(doc.body.children)
  const out = []   // flat array of text segments; pushed to and later joined

  let i = 0
  while (i < children.length) {
    const el      = children[i]
    const tag     = el.tagName.toLowerCase()
    const text    = el.textContent.trim()

    if (!text) { i++; continue }

    // ── Table → block card ──────────────────────────────────────
    if (tag === 'table') {
      const rows = Array.from(el.querySelectorAll('tr')).map(tr =>
        Array.from(tr.querySelectorAll('td, th'))
          .map(c => c.textContent.trim())
          .filter(Boolean)
          .join('  │  ')
      ).filter(Boolean)
      if (rows.length > 0) {
        out.push('', rows.map(r => '§' + r).join('\n'), '')
      }
      i++; continue
    }

    // ── Standalone list → block card (3+ items) ─────────────────
    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(el.querySelectorAll(':scope > li'))
        .map(liText).filter(Boolean)
      if (items.length >= 3) {
        out.push('', items.map(it => '§' + it).join('\n'), '')
      } else {
        // 1–2 items: just render inline
        items.forEach(it => out.push('', it))
      }
      i++; continue
    }

    // ── Heading ─────────────────────────────────────────────────
    if (/^h[1-6]$/.test(tag)) {
      // TOC / outline heading — collect following short entries as one block
      if (/^(table of contents|contents|index|outline)[:.]?\s*$/i.test(text)) {
        const blockItems = [text]
        let j = i + 1
        while (j < children.length) {
          const next    = children[j]
          const nextTag = next.tagName.toLowerCase()
          const nextTxt = next.textContent.trim()
          if (!nextTxt) { j++; continue }
          // Stop at next major heading (start of body content)
          if (/^h[1-2]$/.test(nextTag)) break
          // Stop at a genuine prose paragraph (long, doesn't start like a TOC entry)
          if (
            nextTag === 'p' && nextTxt.length > 120 &&
            !/^(chapter|part|section|appendix|introduction|conclusion|preface)\b/i.test(nextTxt)
          ) break
          // Collect list items inline
          if (nextTag === 'ul' || nextTag === 'ol') {
            Array.from(next.querySelectorAll('li'))
              .map(liText).filter(Boolean)
              .forEach(li => blockItems.push(li))
          } else if (nextTxt) {
            blockItems.push(nextTxt)
          }
          j++
        }
        out.push('', blockItems.map(t => '§' + t).join('\n'), '')
        i = j
        continue
      }

      // Regular heading
      out.push('', text)
      i++; continue
    }

    // ── Regular paragraph ────────────────────────────────────────
    out.push('', text)
    i++
  }

  // Normalise: collapse consecutive blank strings, trim edges
  const lines = out.join('\n').split('\n')
  const clean = []
  for (const line of lines) {
    if (line === '' && clean.length > 0 && clean[clean.length - 1] === '') continue
    clean.push(line)
  }
  return clean.join('\n').trim()
}

// ── Exports ──────────────────────────────────────────────────────────────────

// Returns plain text extracted from a PDF File object, or throws.
// Uses hasEOL to preserve line breaks; throws 'EMPTY_PDF' if no text layer found.
// Text is re-flowed to merge word-wrap continuations into proper paragraphs.
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

  return reflowPDFText(fullText)
}

// Returns structured plain text extracted from a DOCX File object, or throws.
// Uses mammoth.convertToHtml() to preserve lists, tables, and TOC structure,
// then converts to text with § markers on block elements.
export async function extractFromDOCX(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  return htmlToStructuredText(result.value)
}
