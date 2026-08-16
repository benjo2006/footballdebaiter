import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [argument, setArgument] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [history, setHistory] = useState([])

  const [mode, setMode] = useState('analyze')

  const [debateRound, setDebateRound] = useState(0)
  const [debateHistory, setDebateHistory] = useState([])
  const [debateScores, setDebateScores] = useState({
    user: 0,
    ai: 0,
  })
  const [debateResult, setDebateResult] = useState(null)
  const [debateLoading, setDebateLoading] = useState(false)

  const analysisRef = useRef(null)
  const debateRef = useRef(null)

  useEffect(() => {
    if (analysis) {
      setTimeout(() => {
        analysisRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    }
  }, [analysis])

  useEffect(() => {
    if (debateRound > 0 || debateResult) {
      setTimeout(() => {
        debateRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    }
  }, [debateRound, debateResult])

  // =========================
  // NORMAL ANALYSIS MODE
  // =========================

  const analyzeArgument = async () => {
    if (!argument.trim() || analysis?.loading) return

    setAnalysis({ loading: true })

    try {
      const response = await fetch('/.netlify/functions/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'analyze',
          argument,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      const parsedAnalysis = JSON.parse(data.analysis)

      const newAnalysis = {
        loading: false,
        originalArgument: argument,
        ...parsedAnalysis,
      }

      setAnalysis(newAnalysis)

      setHistory((previousHistory) => [
        newAnalysis,
        ...previousHistory,
      ])
    } catch (error) {
      console.error(error)

      setAnalysis({
        loading: false,
        error: 'Unable to analyze the argument right now.',
      })
    }
  }

  // =========================
  // DEBATE MODE
  // =========================

  const startDebateMode = () => {
    setMode('debate')
    setArgument('')
    setAnalysis(null)
    setDebateRound(0)
    setDebateHistory([])
    setDebateScores({
      user: 0,
      ai: 0,
    })
    setDebateResult(null)

    // Scroll directly to the YOUR TAKE box
    setTimeout(() => {
      document.getElementById('your-take-box')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 150)
  }

  const startAnalyzeMode = () => {
    setMode('analyze')
    setArgument('')
    setAnalysis(null)
    setDebateRound(0)
    setDebateHistory([])
    setDebateScores({
      user: 0,
      ai: 0,
    })
    setDebateResult(null)
  }

  const submitDebateRound = async () => {
    if (!argument.trim() || debateLoading || debateRound >= 5) {
      return
    }

    setDebateLoading(true)

    const currentRound = debateRound + 1

    try {
      const response = await fetch('/.netlify/functions/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'debate',
          userResponse: argument,
          round: currentRound,
          history: debateHistory,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      const result = JSON.parse(data.analysis)

      const newEntry = {
        round: currentRound,
        user: argument,
        ai: result.aiResponse,
        userScore: result.userScore,
        aiScore: result.aiScore,
      }

      const updatedHistory = [
        ...debateHistory,
        newEntry,
      ]

      const updatedScores = {
        user:
          debateScores.user + Number(result.userScore.total || 0),
        ai:
          debateScores.ai + Number(result.aiScore.total || 0),
      }

      setDebateHistory(updatedHistory)
      setDebateScores(updatedScores)
      setDebateRound(currentRound)
      setArgument('')

      if (currentRound === 5) {
        setDebateResult({
          winner: result.winner,
          finalDecision: result.finalDecision,
          userTotal: updatedScores.user,
          aiTotal: updatedScores.ai,
        })
      }
    } catch (error) {
      console.error(error)

      alert(
        'Unable to continue the debate right now. Please try again.'
      )
    } finally {
      setDebateLoading(false)
    }
  }

  const resetDebate = () => {
    setArgument('')
    setDebateRound(0)
    setDebateHistory([])
    setDebateScores({
      user: 0,
      ai: 0,
    })
    setDebateResult(null)

    setTimeout(() => {
      document.getElementById('your-take-box')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 150)
  }

  // =========================
  // GENERAL FUNCTIONS
  // =========================

  const chooseTopic = (topic) => {
    setMode('analyze')
    setArgument(topic)
    setAnalysis(null)

    document.getElementById('debate')?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  const tryAnotherArgument = () => {
    setMode('analyze')
    setArgument('')
    setAnalysis(null)

    setTimeout(() => {
      document.getElementById('debate')?.scrollIntoView({
        behavior: 'smooth',
      })
    }, 100)
  }

  const shareResult = async () => {
    if (!analysis || analysis.loading || analysis.error) return

    const shareText = `
FootballDEBAITER

${analysis.subject || 'Football Debate'}

Argument Strength: ${analysis.strength}

${analysis.verdict}

Try FootballDEBAITER yourself.
    `.trim()

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'FootballDEBAITER',
          text: shareText,
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert('Debate result copied to clipboard.')
      }
    } catch (error) {
      console.log('Share cancelled.')
    }
  }

  return (
    <div className="app">

      {/* NAVBAR */}

      <nav className="navbar">

        <div className="logo">
          FOOTBALL
          <span>
            DEB
            <span className="ai-text">AI</span>
            TER
          </span>
        </div>

        <div className="nav-links">

          <a href="#debate">
            Debate
          </a>

          <a href="#history">
            History
          </a>

          <a href="#how">
            How It Works
          </a>

          <button
            className="nav-button"
            onClick={() =>
              document.getElementById('debate')?.scrollIntoView({
                behavior: 'smooth',
              })
            }
          >
            Start Debating
          </button>

        </div>

      </nav>

      <main>

        {/* HERO */}

        <section className="hero" id="debate">

          <div className="hero-content">

            <p className="eyebrow">
              THE AI FOOTBALL DEBATE ARENA
            </p>

            <h1>
              Bring your argument.
              <br />
              <span>
                We'll bring the evidence.
              </span>
            </h1>

            <p className="hero-text">
              Make your football claim. Get the facts,
              counterarguments, statistics and an AI-powered verdict.
            </p>

            {/* MODE SWITCH */}

            <div className="mode-switch">

              <button
                className={
                  mode === 'analyze'
                    ? 'mode-button active'
                    : 'mode-button'
                }
                onClick={startAnalyzeMode}
              >
                ANALYZE ARGUMENT
              </button>

              <button
                className={
                  mode === 'debate'
                    ? 'mode-button active'
                    : 'mode-button'
                }
                onClick={startDebateMode}
              >
                DEBATE MODE
              </button>

            </div>

            {/* NORMAL ANALYZE MODE */}

            {mode === 'analyze' && (

              <>

                <div className="debate-box">

                  <textarea
                    placeholder="What's your football take?"
                    rows="4"
                    value={argument}
                    onChange={(e) => setArgument(e.target.value)}
                    disabled={analysis?.loading}
                  />

                  <div className="debate-footer">

                    <span>
                      Be bold. Make your case.
                    </span>

                    <button
                      onClick={analyzeArgument}
                      disabled={
                        analysis?.loading ||
                        !argument.trim()
                      }
                    >
                      {analysis?.loading
                        ? 'Analyzing...'
                        : 'Analyze Argument →'}
                    </button>

                  </div>

                </div>

                {/* ANALYSIS */}

                {analysis && (

                  <div
                    className="analysis-card"
                    ref={analysisRef}
                  >

                    {analysis.loading ? (

                      <>

                        <p className="eyebrow">
                          ANALYZING YOUR ARGUMENT
                        </p>

                        <h2>
                          Breaking down your argument...
                        </h2>

                        <p className="analysis-loading">
                          FootballDEBAITER is examining the
                          players, evidence and reasoning.
                        </p>

                      </>

                    ) : analysis.error ? (

                      <>

                        <p className="eyebrow">
                          ANALYSIS ERROR
                        </p>

                        <h2>
                          Couldn't analyze that argument.
                        </h2>

                        <p className="analysis-loading">
                          {analysis.error}
                        </p>

                        <button
                          className="secondary-button"
                          onClick={tryAnotherArgument}
                        >
                          Try Again
                        </button>

                      </>

                    ) : (

                      <>

                        <div className="analysis-header">

                          <p className="eyebrow">
                            ARGUMENT ANALYSIS
                          </p>

                          <div className="debate-subject">

                            <span>
                              DEBATE SUBJECT
                            </span>

                            <h2>
                              {analysis.subject ||
                                'Football Debate'}
                            </h2>

                            {analysis.players &&
                              analysis.players.length > 0 && (

                                <div className="player-tags">

                                  {analysis.players.map(
                                    (player, index) => (

                                      <span
                                        key={index}
                                        className="player-tag"
                                      >
                                        {player}
                                      </span>

                                    )
                                  )}

                                </div>

                              )}

                          </div>

                        </div>

                        <div className="strength-box">

                          <div className="strength-header">

                            <div>

                              <p className="strength-label">
                                ARGUMENT STRENGTH
                              </p>

                              <h2>
                                {analysis.strength}
                              </h2>

                            </div>

                          </div>

                          <div className="strength-bar">

                            <div
                              className="strength-fill"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    parseFloat(
                                      analysis.strength
                                    ) * 10
                                  )
                                )}%`,
                              }}
                            />

                          </div>

                        </div>

                        <div className="analysis-section">

                          <h3>
                            Your Claim
                          </h3>

                          <p>
                            {analysis.claim}
                          </p>

                        </div>

                        <div className="analysis-section">

                          <h3>
                            Claim Type
                          </h3>

                          <p>
                            {analysis.claimType}
                          </p>

                        </div>

                        <div className="analysis-section">

                          <h3>
                            Fact Check
                          </h3>

                          <p>
                            {analysis.factCheck}
                          </p>

                        </div>

                        <div className="analysis-section">

                          <h3>
                            Evidence
                          </h3>

                          <p>
                            {analysis.evidence}
                          </p>

                        </div>

                        <div className="analysis-section">

                          <h3>
                            Counterargument
                          </h3>

                          <p>
                            {analysis.counterargument}
                          </p>

                        </div>

                        <div className="analysis-verdict">

                          <span>
                            VERDICT
                          </span>

                          <p>
                            {analysis.verdict}
                          </p>

                        </div>

                        <div className="analysis-final-decision">

                          <span>
                            FINAL CALL
                          </span>

                          <p>
                            {analysis.finalDecision}
                          </p>

                        </div>

                        <div className="result-actions">

                          <button
                            className="secondary-button"
                            onClick={tryAnotherArgument}
                          >
                            Try Another Argument
                          </button>

                          <button
                            className="secondary-button"
                            onClick={shareResult}
                          >
                            Share Debate
                          </button>

                        </div>

                      </>

                    )}

                  </div>

                )}

              </>

            )}

            {/* DEBATE MODE */}

            {mode === 'debate' && (

              <div className="debate-mode-container">

                <div className="debate-mode-header">

                  <p className="eyebrow">
                    DEBATE MODE
                  </p>

                  <h2>
                    Five rounds. One winner.
                  </h2>

                  <p>
                    You and FootballDEBAITER get equal
                    opportunity to make your case. Every
                    take is scored using the same criteria.
                  </p>

                </div>

                {/* ROUND INDICATOR */}

                <div className="round-indicator">

                  {[1, 2, 3, 4, 5].map((round) => (

                    <div
                      key={round}
                      className={
                        debateRound >= round
                          ? 'round-dot completed'
                          : 'round-dot'
                      }
                    >
                      {round}
                    </div>

                  ))}

                </div>

                <div className="round-label">

                  {debateResult
                    ? 'DEBATE COMPLETE'
                    : `ROUND ${debateRound + 1} OF 5`}

                </div>

                {/* SCOREBOARD */}

                <div className="debate-scoreboard">

                  <div className="score-player">

                    <span>
                      YOU
                    </span>

                    <strong>
                      {debateScores.user}
                    </strong>

                    <small>
                      / 500
                    </small>

                  </div>

                  <div className="score-divider">
                    VS
                  </div>

                  <div className="score-player">

                    <span>
                      FOOTBALLDEBAITER
                    </span>

                    <strong>
                      {debateScores.ai}
                    </strong>

                    <small>
                      / 500
                    </small>

                  </div>

                </div>

                {/* DEBATE TRANSCRIPT */}

                {debateHistory.length > 0 && (

                  <div className="debate-transcript">

                    {debateHistory.map((round) => (

                      <div
                        className="debate-round-card"
                        key={round.round}
                      >

                        <div className="round-title">
                          ROUND {round.round}
                        </div>

                        <div className="take user-take">

                          <div className="take-header">

                            <span>
                              YOUR TAKE
                            </span>

                            <strong>
                              {round.userScore.total}/100
                            </strong>

                          </div>

                          <p>
                            {round.user}
                          </p>

                        </div>

                        <div className="take ai-take">

                          <div className="take-header">

                            <span>
                              FOOTBALLDEBAITER
                            </span>

                            <strong>
                              {round.aiScore.total}/100
                            </strong>

                          </div>

                          <p>
                            {round.ai}
                          </p>

                        </div>

                        <div className="round-breakdown">

                          <span>
                            YOUR SCORE: {round.userScore.total}
                          </span>

                          <span>
                            AI SCORE: {round.aiScore.total}
                          </span>

                        </div>

                      </div>

                    ))}

                  </div>

                )}

                {/* FINAL RESULT */}

                {debateResult ? (

                  <div
                    className="debate-final-card"
                    ref={debateRef}
                  >

                    <p className="eyebrow">
                      FINAL RESULT
                    </p>

                    <h2>
                      {debateResult.winner}
                    </h2>

                    <div className="final-score">

                      <div>

                        <span>
                          YOU
                        </span>

                        <strong>
                          {debateResult.userTotal}
                        </strong>

                      </div>

                      <div className="final-vs">
                        VS
                      </div>

                      <div>

                        <span>
                          FOOTBALLDEBAITER
                        </span>

                        <strong>
                          {debateResult.aiTotal}
                        </strong>

                      </div>

                    </div>

                    <div className="analysis-final-decision">

                      <span>
                        FINAL CALL
                      </span>

                      <p>
                        {debateResult.finalDecision}
                      </p>

                    </div>

                    <button
                      className="debate-reset-button"
                      onClick={resetDebate}
                    >
                      START ANOTHER DEBATE →
                    </button>

                  </div>

                ) : (

                  <div
                    className="debate-input-card"
                    ref={debateRef}
                  >

                    <div className="turn-label">

                      {debateRound === 0
                        ? 'YOUR OPENING TAKE'
                        : 'YOUR RESPONSE'}

                    </div>

                    <textarea
                      id="your-take-box"
                      placeholder={
                        debateRound === 0
                          ? "Start the debate. What's your football take?"
                          : "Respond to FootballDEBAITER's argument..."
                      }
                      rows="5"
                      value={argument}
                      onChange={(e) =>
                        setArgument(e.target.value)
                      }
                      disabled={debateLoading}
                    />

                    <div className="debate-footer">

                      <span>

                        {debateRound === 0
                          ? 'Make your opening case.'
                          : 'Defend your position.'}

                      </span>

                      <button
                        onClick={submitDebateRound}
                        disabled={
                          debateLoading ||
                          !argument.trim()
                        }
                      >

                        {debateLoading
                          ? 'FootballDEBAITER is responding...'
                          : debateRound === 0
                            ? 'Enter Debate →'
                            : debateRound === 4
                              ? 'Final Round →'
                              : 'Submit Take →'}

                      </button>

                    </div>

                  </div>

                )}

              </div>

            )}

          </div>

        </section>

        {/* HISTORY */}

        {history.length > 0 && (

          <section
            className="history"
            id="history"
          >

            <p className="eyebrow">
              YOUR SESSION
            </p>

            <h2>
              Debate History
            </h2>

            <div className="history-grid">

              {history.map((item, index) => (

                <div
                  className="history-card"
                  key={index}
                >

                  <span>
                    DEBATE {history.length - index}
                  </span>

                  <h3>
                    {item.subject ||
                      'Football Debate'}
                  </h3>

                  <p>
                    {item.strength}
                  </p>

                  <button
                    onClick={() =>
                      setAnalysis(item)
                    }
                  >
                    View Result →
                  </button>

                </div>

              ))}

            </div>

          </section>

        )}

        {/* POPULAR DEBATES */}

        <section className="topics">

          <p>
            POPULAR DEBATES
          </p>

          <div className="topic-grid">

            <div
              className="topic-card"
              onClick={() =>
                chooseTopic(
                  'Messi is better than Ronaldo because he is the more complete footballer.'
                )
              }
            >

              <span>
                01
              </span>

              <h3>
                Messi vs Ronaldo
              </h3>

              <p>
                The ultimate GOAT debate.
              </p>

            </div>

            <div
              className="topic-card"
              onClick={() =>
                chooseTopic(
                  'Who is the greatest football player of all time?'
                )
              }
            >

              <span>
                02
              </span>

              <h3>
                Best Player Ever
              </h3>

              <p>
                Who truly deserves the crown?
              </p>

            </div>

            <div
              className="topic-card"
              onClick={() =>
                chooseTopic(
                  'Which football club is the greatest club in history?'
                )
              }
            >

              <span>
                03
              </span>

              <h3>
                Club Greatness
              </h3>

              <p>
                Which club stands above the rest?
              </p>

            </div>

          </div>

        </section>

        {/* HOW IT WORKS */}

        <section
          className="how"
          id="how"
        >

          <p className="eyebrow">
            HOW IT WORKS
          </p>

          <h2>
            Argument → Evidence → Verdict
          </h2>

          <div className="steps">

            <div>

              <strong>
                01
              </strong>

              <h3>
                Make your claim
              </h3>

              <p>
                Tell us exactly what you think.
              </p>

            </div>

            <div>

              <strong>
                02
              </strong>

              <h3>
                Get the evidence
              </h3>

              <p>
                We break down the facts behind your argument.
              </p>

            </div>

            <div>

              <strong>
                03
              </strong>

              <h3>
                Face the verdict
              </h3>

              <p>
                See how strong your argument really is.
              </p>

            </div>

          </div>

        </section>

      </main>

      {/* FOOTER */}

      <footer>

        <div className="footer-main">

          <div className="logo">

            FOOTBALL

            <span>

              DEB

              <span className="ai-text">
                AI
              </span>

              TER

            </span>

          </div>

          <p>
            Where football opinions meet evidence.
          </p>

          <div className="footer-right">

            <div className="creator-signature">
              A UNIT OF EXCELLENCE BY BENJOHN ROHITH
            </div>

            <a
              className="contact-button"
              href="https://www.linkedin.com/in/benjohn-rohith-k?utm_source=share_via&utm_content=profile&utm_medium=member_android"
              target="_blank"
              rel="noopener noreferrer"
            >
              CONTACT BENJOHN
            </a>

          </div>

        </div>

      </footer>

    </div>
  )
}

export default App