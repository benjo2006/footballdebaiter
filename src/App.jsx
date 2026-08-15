import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [argument, setArgument] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [history, setHistory] = useState([])

  const analysisRef = useRef(null)

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
          argument: argument,
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

  const chooseTopic = (topic) => {
    setArgument(topic)
    setAnalysis(null)

    document.getElementById('debate')?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  const tryAnotherArgument = () => {
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
Football Debater

${analysis.subject || 'Football Debate'}

Argument Strength: ${analysis.strength}

${analysis.verdict}

Try Football Debater yourself.
    `.trim()

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Football Debater',
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

            {/* DEBATE BOX */}

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

                {/* LOADING */}

                {analysis.loading ? (

                  <>
                    <p className="eyebrow">
                      ANALYZING YOUR ARGUMENT
                    </p>

                    <h2>
                      Breaking down your argument...
                    </h2>

                    <p className="analysis-loading">
                      Football Debater is examining the
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

                    {/* ANALYSIS HEADER */}

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

                    {/* ARGUMENT STRENGTH */}

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

                    {/* YOUR CLAIM */}

                    <div className="analysis-section">

                      <h3>
                        Your Claim
                      </h3>

                      <p>
                        {analysis.claim}
                      </p>

                    </div>

                    {/* CLAIM TYPE */}

                    <div className="analysis-section">

                      <h3>
                        Claim Type
                      </h3>

                      <p>
                        {analysis.claimType}
                      </p>

                    </div>

                    {/* FACT CHECK */}

                    <div className="analysis-section">

                      <h3>
                        Fact Check
                      </h3>

                      <p>
                        {analysis.factCheck}
                      </p>

                    </div>

                    {/* EVIDENCE */}

                    <div className="analysis-section">

                      <h3>
                        Evidence
                      </h3>

                      <p>
                        {analysis.evidence}
                      </p>

                    </div>

                    {/* COUNTERARGUMENT */}

                    <div className="analysis-section">

                      <h3>
                        Counterargument
                      </h3>

                      <p>
                        {analysis.counterargument}
                      </p>

                    </div>

                    {/* VERDICT */}

                    <div className="analysis-verdict">
  <span>VERDICT</span>
  <p>{analysis.verdict}</p>
</div>

<div className="analysis-final-decision">
  <span>FINAL CALL</span>
  <p>{analysis.finalDecision}</p>
</div>

                    {/* ACTION BUTTONS */}

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