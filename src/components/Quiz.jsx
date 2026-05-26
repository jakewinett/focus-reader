import { useState } from 'react'
import { isBlankLine } from '../utils/textUtils.js'

// Sprint 4: Retention quiz + concept gap analysis.
// Props: { lines, questions, isLoading, onExit }

const LABELS = ['A', 'B', 'C', 'D']

export default function Quiz({ lines, questions, isLoading, onExit }) {
  const [step, setStep]         = useState(0)
  const [selected, setSelected] = useState(null)   // option index chosen | null
  const [answers, setAnswers]   = useState([])     // bool[] — correct per question
  const [phase, setPhase]       = useState('question') // 'question'|'feedback'|'results'

  // ── Loading ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="border border-sage-200 bg-sage-50 rounded-2xl p-8 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-sage-200 border-t-sage-500
                        animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-ink-700">Generating quiz…</p>
        <p className="text-xs text-ink-400 mt-1">Testing your retention</p>
      </div>
    )
  }

  // ── Fallback (no questions) ───────────────────────────────────
  if (!questions) {
    return (
      <div className="border border-ink-100 bg-white rounded-2xl p-8 text-center">
        <p className="text-sm font-medium text-ink-700 mb-1">Reading complete</p>
        <p className="text-xs text-ink-400 mb-6">Quiz unavailable — add an API key to enable retention questions.</p>
        <button
          onClick={onExit}
          className="px-5 py-2.5 bg-focus-600 text-white text-sm font-medium rounded-xl
                     hover:bg-focus-700 active:scale-95 transition-all duration-150"
        >
          Back to start
        </button>
      </div>
    )
  }

  // ── Results ───────────────────────────────────────────────────
  if (phase === 'results') {
    const score = answers.filter(Boolean).length
    const total = answers.length
    const message =
      score === total ? 'Perfect score — excellent retention!' :
      score >= total - 1 ? 'Great job — you got the key ideas.' :
      score >= Math.ceil(total / 2) ? 'Good effort — review the highlighted passages.' :
      'Worth a re-read — focus on the highlighted sections.'

    return (
      <div className="border border-sage-200 bg-sage-50 rounded-2xl p-8">
        {/* Score */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center
                          mx-auto mb-4">
            <span className="text-2xl font-bold text-sage-600">{score}/{total}</span>
          </div>
          <h2 className="text-lg font-semibold text-ink-800 mb-1">Quiz complete</h2>
          <p className="text-sm text-ink-500">{message}</p>
        </div>

        {/* Per-question summary */}
        <div className="space-y-2 mb-8">
          {questions.map((q, i) => (
            <div key={i}
                 className="flex items-start gap-3 bg-white rounded-xl px-4 py-3 border border-ink-100">
              <span className={[
                'shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5',
                answers[i] ? 'bg-sage-100 text-sage-600' : 'bg-red-100 text-red-600',
              ].join(' ')}>
                {answers[i] ? '✓' : '✗'}
              </span>
              <p className="text-sm text-ink-700 leading-snug">{q.question}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onExit}
            className="px-5 py-2.5 bg-focus-600 text-white text-sm font-medium rounded-xl
                       hover:bg-focus-700 active:scale-95 transition-all duration-150"
          >
            Read again
          </button>
          <button
            onClick={onExit}
            className="px-5 py-2.5 text-ink-500 hover:text-ink-700 text-sm
                       transition-colors duration-150"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // ── Active question ───────────────────────────────────────────
  const q          = questions[step]
  const isAnswered = selected !== null
  const isCorrect  = selected === q.correctIndex

  // Source passage: ±2 lines around sourceLine
  const passageStart = Math.max(0, q.sourceLine - 2)
  const passageEnd   = Math.min(lines.length - 1, q.sourceLine + 2)
  const passage      = lines.slice(passageStart, passageEnd + 1)

  function handleSelect(idx) {
    if (isAnswered) return
    setSelected(idx)
    setPhase('feedback')
  }

  function handleNext() {
    const updated = [...answers, isCorrect]
    setAnswers(updated)
    if (step + 1 >= questions.length) {
      setPhase('results')
    } else {
      setStep(s => s + 1)
      setSelected(null)
      setPhase('question')
    }
  }

  return (
    <div className="border border-ink-100 bg-white rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
        <span className="text-xs font-mono text-ink-400">
          Question {step + 1} of {questions.length}
        </span>
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {questions.map((_, i) => (
            <span key={i} className={[
              'w-1.5 h-1.5 rounded-full transition-colors',
              i < answers.length
                ? answers[i] ? 'bg-sage-400' : 'bg-red-400'
                : i === step ? 'bg-focus-500' : 'bg-ink-200',
            ].join(' ')} />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="px-6 py-5">
        <p className="text-base font-medium text-ink-800 leading-relaxed mb-5">
          {q.question}
        </p>

        {/* Options */}
        <div className="space-y-2.5">
          {q.options.map((opt, idx) => {
            let style = 'border-ink-100 text-ink-700 hover:border-focus-300 hover:bg-focus-50'
            if (isAnswered) {
              if (idx === q.correctIndex)
                style = 'border-sage-400 bg-sage-50 text-sage-800'
              else if (idx === selected)
                style = 'border-red-300 bg-red-50 text-red-700'
              else
                style = 'border-ink-100 text-ink-400 opacity-60'
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={isAnswered}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left',
                  'text-sm transition-all duration-150',
                  isAnswered ? 'cursor-default' : 'cursor-pointer active:scale-99',
                  style,
                ].join(' ')}
              >
                <span className="shrink-0 w-6 h-6 rounded-lg bg-ink-100 flex items-center
                                 justify-center text-xs font-bold text-ink-500">
                  {LABELS[idx]}
                </span>
                <span className="leading-snug">{opt}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Feedback panel — shown after answering */}
      {phase === 'feedback' && (
        <div className={[
          'border-t px-6 py-5 animate-slide-up',
          isCorrect ? 'border-sage-200 bg-sage-50' : 'border-red-100 bg-red-50',
        ].join(' ')}>

          {/* Result badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className={[
              'text-sm font-semibold',
              isCorrect ? 'text-sage-700' : 'text-red-700',
            ].join(' ')}>
              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
            </span>
          </div>

          {/* Explanation */}
          <p className="text-sm text-ink-600 mb-4 leading-relaxed">
            {q.explanation}
          </p>

          {/* Source passage */}
          <div className="mb-5">
            <p className="text-xs font-mono text-ink-400 mb-2 uppercase tracking-wide">
              Source passage
            </p>
            <div className="bg-white rounded-xl border border-ink-100 overflow-hidden">
              {passage.map((line, i) => {
                const lineIdx  = passageStart + i
                const isSource = lineIdx === q.sourceLine
                const blank    = isBlankLine(line)
                return (
                  <div
                    key={i}
                    className={[
                      'px-4 text-sm leading-relaxed',
                      blank ? 'py-1' : 'py-2',
                      isSource
                        ? 'bg-focus-50 border-l-2 border-focus-400 text-ink-800 font-medium'
                        : 'text-ink-400',
                    ].join(' ')}
                  >
                    {blank ? ' ' : line}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Next button */}
          <button
            onClick={handleNext}
            className="w-full py-2.5 bg-focus-600 text-white text-sm font-medium
                       rounded-xl hover:bg-focus-700 active:scale-95 transition-all duration-150"
          >
            {step + 1 < questions.length ? 'Next question' : 'See results'}
          </button>
        </div>
      )}
    </div>
  )
}
