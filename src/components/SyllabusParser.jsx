import { useState, useRef } from 'react'
import { parseSyllabus } from '../api/claude.js'
import { extractFromPDF, extractFromDOCX } from '../utils/fileUtils.js'

// Sprint 5: Syllabus parser.
// FR-14: review/confirm step after parse.
// FR-24: PDF + DOCX upload for syllabus.
// Props: { onParsed(assignments) }

const PLACEHOLDER = `Paste your course syllabus here — Focus Reader will extract all readings and assignments with their due dates.

Example:
  Week 3 (May 27): Read Chapter 4 — Cell Signaling
  May 29: Lab Report 1 due
  June 2: Midterm review (Chapters 1–4)`

const NO_KEY_MODE = !import.meta.env.VITE_ANTHROPIC_API_KEY ||
  import.meta.env.VITE_ANTHROPIC_API_KEY === 'your_key_here'

function friendlyDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Review screen (FR-14) ─────────────────────────────────────────────────────
function ReviewScreen({ initial, onConfirm, onBack }) {
  const [items, setItems] = useState(initial)

  function remove(id) {
    setItems(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-ink-800">
            {items.length === 0
              ? 'No assignments left'
              : `${items.length} assignment${items.length !== 1 ? 's' : ''} found`}
          </p>
          <p className="text-xs text-ink-400 mt-0.5">
            Remove any that look wrong, then confirm.
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-xs text-ink-400 hover:text-ink-600 transition-colors flex items-center gap-1"
        >
          ← Re-parse
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-ink-400">All assignments removed.</p>
          <button
            onClick={onBack}
            className="mt-3 text-xs text-focus-600 hover:text-focus-700 font-medium"
          >
            ← Go back and re-parse
          </button>
        </div>
      ) : (
        <ul className="space-y-2 mb-5 max-h-72 overflow-y-auto scrollbar-thin pr-1">
          {items.map(a => (
            <li
              key={a.id}
              className="flex items-start gap-3 bg-ink-50/60 border border-ink-100
                         rounded-xl px-4 py-3 group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-800 leading-snug">{a.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {a.course && (
                    <span className="text-xs bg-focus-50 text-focus-700 px-2 py-0.5 rounded-full font-medium">
                      {a.course}
                    </span>
                  )}
                  <span className="text-xs text-ink-400 font-mono">{friendlyDate(a.dueDate)}</span>
                </div>
              </div>
              <button
                onClick={() => remove(a.id)}
                className="shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center
                           text-ink-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label={`Remove "${a.title}"`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor"
                        strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <button
          onClick={() => onConfirm(items)}
          className="w-full py-2.5 bg-focus-600 text-white text-sm font-medium rounded-xl
                     hover:bg-focus-700 active:scale-95 transition-all duration-150"
        >
          Confirm {items.length} assignment{items.length !== 1 ? 's' : ''} →
        </button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
// Props: { courses: Course[], onParsed(assignments) }
export default function SyllabusParser({ courses = [], onParsed }) {
  const [text, setText]             = useState('')
  const [inputTab, setInputTab]     = useState('paste')   // 'paste' | 'upload'
  const [isParsing, setIsParsing]   = useState(false)
  const [parseError, setParseError] = useState('')
  const [parsed, setParsed]         = useState(null)      // null = input phase; [] = review phase
  const [selectedCourse, setSelectedCourse] = useState('')  // course name to tag assignments with

  // File upload state
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [isDragOver, setIsDragOver]     = useState(false)
  const fileInputRef = useRef(null)

  // Manual-add state (no API key)
  const [manualTitle, setManualTitle]   = useState('')
  const [manualCourse, setManualCourse] = useState('')
  const [manualDate, setManualDate]     = useState('')
  const [manualError, setManualError]   = useState('')

  // ── File extraction (FR-24) ────────────────────────────────────
  async function handleFile(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx'].includes(ext)) {
      setExtractError('Only PDF and Word (.docx) files are supported.')
      return
    }
    setIsExtracting(true)
    setExtractError('')
    try {
      const extracted = ext === 'pdf'
        ? await extractFromPDF(file)
        : await extractFromDOCX(file)
      setText(extracted.trim())
      setInputTab('paste')
    } catch (err) {
      setExtractError(
        err.code === 'EMPTY_PDF'
          ? err.message
          : 'Could not read the file. Try copying the text manually.'
      )
    } finally {
      setIsExtracting(false)
    }
  }

  function handleFileInput(e) {
    handleFile(e.target.files[0])
    e.target.value = ''
  }

  function handleDragOver(e)  { e.preventDefault(); setIsDragOver(true) }
  function handleDragLeave()  { setIsDragOver(false) }
  function handleDrop(e)      { e.preventDefault(); setIsDragOver(false); handleFile(e.dataTransfer.files[0]) }

  // ── Parse ──────────────────────────────────────────────────────
  async function handleParse() {
    if (text.trim().length < 20) {
      setParseError('Paste at least a few lines of your syllabus.')
      return
    }
    setIsParsing(true)
    setParseError('')
    const raw = await parseSyllabus(text.trim())
    setIsParsing(false)
    if (!raw || raw.length === 0) {
      setParseError('No dated assignments found. Try including dates like "May 27" or "Week 3 (June 2)".')
      return
    }
    const assignments = raw.map(a => ({
      id:      `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title:   a.title,
      // selectedCourse overrides AI-extracted course name when user picked one explicitly
      course:  selectedCourse || a.course || '',
      dueDate: a.dueDate,
      status:  'pending',
    }))
    setParsed(assignments)   // → review phase (FR-14)
  }

  // ── Manual add (no API key) ────────────────────────────────────
  function handleManualAdd() {
    if (!manualTitle.trim()) { setManualError('Enter a title.'); return }
    if (!manualDate)          { setManualError('Pick a due date.'); return }
    setManualError('')
    onParsed([{
      id:      `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title:   manualTitle.trim(),
      course:  manualCourse.trim(),
      dueDate: manualDate,
      status:  'pending',
    }])
  }

  // ── Review phase (FR-14) ──────────────────────────────────────
  if (parsed !== null) {
    return (
      <ReviewScreen
        initial={parsed}
        onConfirm={onParsed}
        onBack={() => setParsed(null)}
      />
    )
  }

  // ── No API key — manual entry ─────────────────────────────────
  if (NO_KEY_MODE) {
    return (
      <div className="px-6 py-8">
        <div className="mb-5">
          <p className="text-sm font-medium text-ink-700 mb-1">Add an assignment manually</p>
          <p className="text-xs text-ink-400">
            Add an API key to <code className="font-mono bg-ink-100 px-1 rounded">.env</code> to
            enable automatic syllabus parsing.
          </p>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={manualTitle}
            onChange={e => { setManualTitle(e.target.value); setManualError('') }}
            placeholder="e.g. Chapter 4 — Cell Signaling"
            className="w-full px-4 py-2.5 border border-ink-200 rounded-xl text-sm text-ink-700
                       placeholder:text-ink-300 outline-none focus:border-focus-400 focus:ring-1
                       focus:ring-focus-200 transition-colors"
          />
          <input
            type="text"
            value={manualCourse}
            onChange={e => setManualCourse(e.target.value)}
            placeholder="Course name or code (optional)"
            className="w-full px-4 py-2.5 border border-ink-200 rounded-xl text-sm text-ink-700
                       placeholder:text-ink-300 outline-none focus:border-focus-400 focus:ring-1
                       focus:ring-focus-200 transition-colors"
          />
          <input
            type="date"
            value={manualDate}
            onChange={e => { setManualDate(e.target.value); setManualError('') }}
            className="w-full px-4 py-2.5 border border-ink-200 rounded-xl text-sm text-ink-700
                       outline-none focus:border-focus-400 focus:ring-1 focus:ring-focus-200
                       transition-colors"
          />
          {manualError && <p className="text-xs text-red-600">{manualError}</p>}
          <button
            onClick={handleManualAdd}
            className="w-full py-2.5 bg-focus-600 text-white text-sm font-medium rounded-xl
                       hover:bg-focus-700 active:scale-95 transition-all duration-150"
          >
            Add assignment
          </button>
        </div>
      </div>
    )
  }

  // ── API key present — input phase ─────────────────────────────
  return (
    <div>
      {/* Course selector — shown when courses exist */}
      {courses.length > 0 && (
        <div className="px-6 pt-5 pb-4 border-b border-ink-100">
          <label className="block text-xs font-medium text-ink-500 mb-1.5">
            Which course is this syllabus for?
          </label>
          <select
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
            className="w-full px-3 py-2.5 border border-ink-200 rounded-xl text-sm text-ink-700
                       bg-white outline-none focus:border-focus-400 focus:ring-1
                       focus:ring-focus-200 transition-colors"
          >
            <option value="">Let AI detect from syllabus text</option>
            {courses.map(c => (
              <option key={c.id} value={c.name}>{c.name}{c.teacher ? ` — ${c.teacher}` : ''}</option>
            ))}
          </select>
        </div>
      )}

      {/* Paste / Upload sub-tabs (FR-24) */}
      <div className="flex border-b border-ink-100">
        {[
          { id: 'paste',  label: 'Paste text' },
          { id: 'upload', label: 'Upload file' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setInputTab(tab.id); setExtractError('') }}
            className={[
              'flex-1 px-4 py-2.5 text-xs font-medium transition-colors duration-150',
              inputTab === tab.id
                ? 'text-ink-700 border-b-2 border-focus-500 bg-white'
                : 'text-ink-400 hover:text-ink-600 bg-ink-50/50',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isParsing ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-ink-400">
          <div className="w-8 h-8 rounded-full border-2 border-ink-200 border-t-focus-500 animate-spin" />
          <span className="text-sm">Extracting assignments…</span>
        </div>
      ) : (
        <>
          {/* Paste tab */}
          {inputTab === 'paste' && (
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setParseError('') }}
              placeholder={PLACEHOLDER}
              rows={11}
              className="w-full px-6 pt-5 pb-4 text-ink-700 text-sm leading-relaxed
                         placeholder:text-ink-300 resize-none outline-none font-sans scrollbar-thin"
              aria-label="Paste your syllabus here"
            />
          )}

          {/* Upload tab (FR-24) */}
          {inputTab === 'upload' && (
            <div className="px-6 py-8">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileInput}
                className="hidden"
                aria-label="Upload syllabus PDF or Word file"
              />
              {isExtracting ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-ink-400">
                  <div className="w-8 h-8 rounded-full border-2 border-ink-200 border-t-focus-500 animate-spin" />
                  <span className="text-sm">Extracting text…</span>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={[
                    'flex flex-col items-center justify-center gap-4 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-150',
                    isDragOver
                      ? 'border-focus-400 bg-focus-50'
                      : 'border-ink-200 hover:border-focus-300 hover:bg-ink-50/50',
                  ].join(' ')}
                  role="button"
                  aria-label="Drop a PDF or Word file here, or click to browse"
                >
                  <div className="w-12 h-12 rounded-xl bg-ink-100 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                            stroke="#8e8a7e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2v6h6M12 12v6M9 15l3-3 3 3"
                            stroke="#8e8a7e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-ink-700">
                      Drop your syllabus here, or <span className="text-focus-600">browse</span>
                    </p>
                    <p className="text-xs text-ink-400 mt-1">PDF and Word (.docx) supported</p>
                  </div>
                </div>
              )}
              {extractError && (
                <p className="mt-4 text-sm text-red-600 flex items-center gap-2 animate-fade-in">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <path fillRule="evenodd" d="M7 1a6 6 0 100 12A6 6 0 007 1zm-.75 3.5a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z"/>
                  </svg>
                  {extractError}
                </p>
              )}
            </div>
          )}

          {/* Footer bar — only on paste tab */}
          {inputTab === 'paste' && (
            <div className="border-t border-ink-100 px-6 py-4 flex items-center justify-between bg-ink-50/50">
              <div className="text-sm text-ink-400">
                {text.trim() ? `${text.trim().split(/\s+/).length.toLocaleString()} words` : 'Paste syllabus above'}
              </div>
              <button
                onClick={handleParse}
                disabled={text.trim().length < 20}
                className="px-5 py-2.5 bg-focus-600 text-white text-sm font-medium rounded-xl
                           hover:bg-focus-700 active:scale-95 transition-all duration-150
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Parse syllabus
              </button>
            </div>
          )}

          {parseError && (
            <p className="px-6 pb-4 text-sm text-red-600 flex items-center gap-2 animate-fade-in">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path fillRule="evenodd" d="M7 1a6 6 0 100 12A6 6 0 007 1zm-.75 3.5a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z"/>
              </svg>
              {parseError}
            </p>
          )}
        </>
      )}
    </div>
  )
}
