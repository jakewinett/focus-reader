import { useState } from 'react'
import LandingView from './components/LandingView.jsx'
import FocusReader from './components/FocusReader.jsx'
import Dashboard   from './components/Dashboard.jsx'
import { loadAssignments } from './storage/state.js'

// View states: 'landing' | 'dashboard' | 'reader'
// Sprint 6: dashboard added. If assignments exist on load, open dashboard first.

export default function App() {
  const [view, setView]           = useState(() =>
    loadAssignments().length > 0 ? 'dashboard' : 'landing'
  )
  const [inputText, setInputText] = useState('')
  const [landingTab, setLandingTab] = useState('paste')  // initial tab for LandingView

  function handleStartReading(text) {
    setInputText(text)
    setView('reader')
  }

  function handleExitReader() {
    setInputText('')
    // Return to dashboard if the student has a schedule, else landing
    setView(loadAssignments().length > 0 ? 'dashboard' : 'landing')
  }

  function handleGoToLanding(tab = 'paste') {
    setLandingTab(tab)
    setView('landing')
  }

  function handleGoToDashboard() {
    setView('dashboard')
  }

  // Called by LandingView (My Schedule → Re-parse) or Dashboard → Re-parse
  function handleReParse() {
    handleGoToLanding('schedule')
  }

  return (
    <div className="min-h-screen">
      {view === 'landing' && (
        <LandingView
          onStartReading={handleStartReading}
          initialTab={landingTab}
          onBack={loadAssignments().length > 0 ? handleGoToDashboard : null}
        />
      )}
      {view === 'dashboard' && (
        <Dashboard
          onGoToLanding={() => handleGoToLanding('paste')}
          onStartReading={() => handleGoToLanding('paste')}
          onReParse={handleReParse}
        />
      )}
      {view === 'reader' && (
        <FocusReader
          rawText={inputText}
          onExit={handleExitReader}
        />
      )}
    </div>
  )
}
