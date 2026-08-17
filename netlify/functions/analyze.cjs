const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Method not allowed",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const {
      mode = "analyze",
      argument,
      userResponse,
      round,
      history = [],
    } = body;

    // =========================================================
    // NORMAL ANALYZE MODE
    // =========================================================

    if (mode === "analyze") {
      if (!argument || !argument.trim()) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Argument is required",
          }),
        };
      }

      const prompt = `
You are FootballDEBAITER, an AI-powered football debate analyst.

Your ONLY topic is football.

If the user asks about anything unrelated to football, return ONLY valid JSON:

{
  "strength": "N/A",
  "claim": "N/A",
  "claimType": "Non-football",
  "factCheck": "N/A",
  "evidence": "N/A",
  "counterargument": "N/A",
  "verdict": "The user is lacking ball knowledge. FootballDEBAITER only debates football.",
  "finalDecision": "The user is lacking ball knowledge. FootballDEBAITER only debates football."
}

For football arguments:

- Understand misspelled or shortened player names.
- Distinguish facts from opinions.
- Do not invent statistics.
- Give balanced counterarguments.
- Consider statistics, achievements, ability, legacy and context.
- Be decisive when the evidence supports a conclusion.

Return ONLY valid JSON.

{
  "strength": "...",
  "claim": "...",
  "claimType": "...",
  "factCheck": "...",
  "evidence": "...",
  "counterargument": "...",
  "verdict": "...",
  "finalDecision": "..."
}

USER ARGUMENT:
${argument}
`;

      const completion =
        await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
        });

      const analysis =
        completion.choices[0]?.message?.content;

      if (!analysis) {
        throw new Error("No analysis returned");
      }

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysis,
        }),
      };
    }

    // =========================================================
    // DEBATE MODE
    // =========================================================

    if (mode === "debate") {
      if (!userResponse || !userResponse.trim()) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Your debate response is required.",
          }),
        };
      }

      const currentRound = Number(round);

      if (
        !currentRound ||
        currentRound < 1 ||
        currentRound > 5
      ) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Invalid debate round.",
          }),
        };
      }

      const previousDebate = Array.isArray(history)
        ? history
        : [];

      const historyText =
        previousDebate.length > 0
          ? previousDebate
              .map(
                (item) => `
ROUND ${item.round}

USER:
${item.user}

AI:
${item.ai}

USER SCORE:
${item.userScore?.total ?? 0}

AI SCORE:
${item.aiScore?.total ?? 0}
`
              )
              .join("\n")
          : "No previous rounds.";

      // =======================================================
      // STEP 1 — FACT/CLAIM ANALYSIS
      // =======================================================

      const judgePrompt = `
You are the HEAD JUDGE of FootballDEBAITER.

This is a serious five-round football debate.

You are NOT judging who sounds more intelligent.

You are NOT judging who wrote the longer response.

You are NOT automatically favoring the AI.

You are judging the actual FOOTBALL CLAIMS.

========================================================
CURRENT ROUND
========================================================

Round: ${currentRound}/5

USER CLAIM:

${userResponse}

========================================================
PREVIOUS ROUNDS
========================================================

${historyText}

========================================================
STEP 1 — IDENTIFY THE DEBATE
========================================================

Determine:

- The players/teams/clubs involved.
- The user's actual position.
- Whether this is overall greatness, current ability,
  peak ability, legacy, statistics, tactics, etc.
- What evidence is relevant.

DO NOT silently change the user's question.

If the user says:

"Messi is better than Dembélé"

do NOT automatically reinterpret that as:

"Who is better right now?"

Treat it as an overall comparison unless the user says otherwise.

========================================================
STEP 2 — EXTRACT THE USER'S CLAIMS
========================================================

Extract every meaningful claim from the user's response.

For each claim classify it as:

FACTUAL
OPINION
INTERPRETATION

Examples:

"Messi has more Ballon d'Ors than Dembélé."
= FACTUAL

"Messi is the better player."
= OPINION / CONCLUSION

"Messi's longevity makes him more valuable."
= INTERPRETATION

========================================================
STEP 3 — FACTUAL CLAIMS
========================================================

For established football facts, use your football knowledge.

DO NOT invent statistics.

If exact numbers are not certain, use qualitative language.

Examples of established facts:

- Messi has won eight Ballon d'Or awards.
- Messi won the 2022 FIFA World Cup.
- Messi has an enormous career goal and assist record.
- Messi has a substantially larger career body of work.
- Dembélé has won major trophies with PSG and France.
- Dembélé has had an elite recent period at PSG.

If a user states a TRUE and RELEVANT factual advantage,
that MUST materially increase the user's score.

If the AI cannot refute the factual claim,
the AI cannot score higher merely by saying:

"More context is needed."

That is NOT a counterargument.

========================================================
STEP 4 — LEGACY
========================================================

Legacy is a legitimate football factor.

For overall/player-greatness debates, consider:

- Career longevity
- Major trophies
- Individual awards
- Records
- Peak level
- Consistency
- Big-game performances
- International legacy
- Club legacy
- Historical influence
- Cultural impact
- Fan connection

A legendary player's legacy should receive substantial weight
when the debate concerns overall greatness.

BUT:

Legacy is NOT an automatic win.

It is evidence.

========================================================
STEP 5 — FAN EMOTION
========================================================

Fan emotion and cultural impact are legitimate when relevant.

Examples:

- Inspiration
- Icon status
- Connection with supporters
- Cultural influence
- Emotional moments
- Influence on generations

But fan popularity alone does NOT prove sporting superiority.

========================================================
STEP 6 — SCORE THE USER'S CLAIMS
========================================================

Use this scoring philosophy:

UNSUPPORTED CLAIM:

0-45

OPINION WITH LITTLE REASONING:

40-60

REASONABLE FOOTBALL OPINION:

55-70

STRONG ARGUMENT:

70-82

STRONG ARGUMENT WITH MULTIPLE VALID FACTUAL POINTS:

80-90

EXCEPTIONAL, WELL-SUPPORTED ARGUMENT:

90-100

========================================================
CRITICAL SCORING RULE
========================================================

A TRUE, RELEVANT FACTUAL CLAIM MUST NOT RECEIVE
a low score simply because the AI disagrees.

For example:

USER:

"Messi has more Ballon d'Ors than Dembélé."

That is a major factual advantage in an overall-career debate.

The user should receive a HIGH score for that round.

The AI cannot respond:

"That is only one factor."

and then receive 80.

"That is only one factor" is NOT a refutation.

The AI must provide a relevant counterargument.

For example:

"Yes, Messi has vastly more Ballon d'Ors, but if the debate
is specifically about current ability, Dembélé's recent level
changes the comparison."

THAT is an actual counterargument.

========================================================
IMPORTANT EXAMPLE
========================================================

USER:

"Messi has more goals than Dembélé."

If the claim is factually correct:

USER CLAIM STRENGTH should be HIGH.

The AI may respond:

"Yes, Messi has a much greater career scoring record,
but goals alone do not determine overall footballing ability."

That is a legitimate counterargument.

However, the AI must NOT score itself 80 simply because
it mentioned assists and trophies.

It must actually overcome the user's case.

========================================================
ANOTHER EXAMPLE
========================================================

USER:

"Messi has won more Ballon d'Ors than Dembélé."

Correct factual claim.

The user should be strongly rewarded.

A reasonable score could be:

USER: 82-92

AI: 45-65

depending on the quality of the AI's actual response.

========================================================
FIRST ROUND
========================================================

If Round 1 contains only:

"Messi is better than Dembélé."

The user has a defensible position but has not provided evidence.

Do NOT automatically give:

USER 40
AI 60

Instead:

USER should generally be around 55-65.

AI should generally be around 55-70.

The scores should be reasonably close because neither side
has yet provided substantial evidence.

========================================================
DO NOT USE THE OLD 60/80 PATTERN
========================================================

NEVER default to:

60 vs 80

50 vs 70

70 vs 80

80 vs 85

The score must come from the claims.

========================================================
AI RESPONSE
========================================================

Now write the strongest possible FOOTBALL counterargument.

You MUST address the user's actual claims.

Do not dodge them.

Do not repeat generic statements such as:

"More context is needed."

Do not change:

"Messi is better overall"

into:

"Who is better right now?"

unless the user explicitly makes it about current ability.

If the user is correct:

ACKNOWLEDGE IT.

Then explain why it does or does not settle the debate.

========================================================
ROUND SCORING
========================================================

Score BOTH sides independently.

USER SCORE should reflect:

- factual accuracy
- relevance
- football knowledge
- evidence
- reasoning
- debate-specific factors
- legacy when relevant
- fan/cultural impact when relevant
- persuasiveness

AI SCORE should reflect the SAME standards.

The AI gets NO BONUS for being the AI.

The AI gets NO BONUS for writing more words.

========================================================
ROUND WINNER
========================================================

If the user's case is stronger:

USER

If AI's case is stronger:

FOOTBALLDEBAITER

If genuinely equal:

DRAW

========================================================
FIVE ROUND RULE
========================================================

The user must have a genuine opportunity to win rounds.

If the user presents multiple strong, relevant factual claims
that the AI cannot properly counter, the user SHOULD win those
rounds.

Do NOT artificially manufacture AI victories.

At the same time, do NOT manufacture user victories.

The claims decide the round.

========================================================
FINAL ROUND
========================================================

${
  currentRound === 5
    ? `
Calculate the cumulative totals from all five rounds.

USER TOTAL:
all user round scores

AI TOTAL:
all AI round scores

Higher total wins.

USER TOTAL > AI TOTAL:
USER WINS

AI TOTAL > USER TOTAL:
FOOTBALLDEBAITER WINS

Equal:
DRAW
`
    : `
This is not the final round.

winner = "CONTINUE"
`
}

========================================================
RETURN JSON ONLY
========================================================

Return ONLY:

{
  "aiResponse": "...",

  "userScore": {
    "total": 0,
    "reason": "..."
  },

  "aiScore": {
    "total": 0,
    "reason": "..."
  },

  "winner": "CONTINUE",

  "finalDecision": "..."
}

No markdown.

No code fences.

Scores MUST be integers between 0 and 100.

========================================================
FINAL COMMAND
========================================================

READ THE USER'S ACTUAL CLAIM.

IDENTIFY WHETHER IT IS FACTUAL OR SUBJECTIVE.

USE REAL FOOTBALL KNOWLEDGE.

REWARD CORRECT RELEVANT CLAIMS.

CONSIDER LEGACY.

CONSIDER ACHIEVEMENTS.

CONSIDER FAN AND CULTURAL IMPACT WHEN RELEVANT.

MAKE THE AI ACTUALLY COUNTER THE USER.

DO NOT GIVE THE AI A DEFAULT ADVANTAGE.

DO NOT GIVE THE USER A DEFAULT ADVANTAGE.

DO NOT USE REPETITIVE 60/80 SCORES.

THE QUALITY OF THE CLAIMS DETERMINES THE SCORE.
`;

      // =======================================================
      // STEP 2 — CALL THE JUDGE
      // =======================================================

      const completion =
        await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",

          messages: [
            {
              role: "system",
              content: `
You are the independent head judge of a football debate.

You are NOT the winner.

Your job is to evaluate the claims.

Never give the AI an automatic advantage.

A correct football fact is a real advantage.

A well-supported subjective argument is a real advantage.

Legacy matters when relevant.

Fan/cultural impact matters when relevant.

Never reward verbosity.

Never use fixed 60/80 scoring.

Never invent statistics.
              `,
            },
            {
              role: "user",
              content: judgePrompt,
            },
          ],

          temperature: 0.05,
        });

      let debateAnalysis =
        completion.choices[0]?.message?.content;

      if (!debateAnalysis) {
        throw new Error(
          "No debate response returned."
        );
      }

      debateAnalysis = debateAnalysis
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let parsed;

      try {
        parsed = JSON.parse(debateAnalysis);
      } catch (error) {
        console.error(
          "Invalid debate JSON:",
          debateAnalysis
        );

        throw new Error(
          "AI returned invalid debate data."
        );
      }

      if (
        !parsed.aiResponse ||
        !parsed.userScore ||
        !parsed.aiScore
      ) {
        throw new Error(
          "Incomplete debate response."
        );
      }

      // =======================================================
      // SCORE NORMALIZATION
      // =======================================================

      parsed.userScore.total = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            Number(parsed.userScore.total) || 0
          )
        )
      );

      parsed.aiScore.total = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            Number(parsed.aiScore.total) || 0
          )
        )
      );

      // =======================================================
      // IMPORTANT SCORE CORRECTION
      //
      // Prevent the exact generic "AI 80 / USER 60" behavior.
      //
      // If the user's response contains an obvious factual
      // comparison, require the AI to actually address it.
      // =======================================================

      const userText =
        userResponse.toLowerCase();

      const factualComparisonPatterns = [
        "more ballon",
        "more goals",
        "more assists",
        "more trophies",
        "more champions league",
        "more world cup",
        "more golden boot",
        "more awards",
        "won the world cup",
        "won more",
        "scored more",
        "has more",
        "higher number",
        "greater legacy",
        "longer career",
      ];

      const containsFactualComparison =
        factualComparisonPatterns.some(
          (pattern) =>
            userText.includes(pattern)
        );

      if (containsFactualComparison) {
        /*
         * A factual comparison is not automatically correct,
         * but if the model has identified it as a meaningful
         * football claim, prevent a generic AI advantage.
         */

        if (
          parsed.aiScore.total >
          parsed.userScore.total
        ) {
          const gap =
            parsed.aiScore.total -
            parsed.userScore.total;

          /*
           * Only allow AI to remain ahead if it has a
           * substantial counterargument. We use the judge's
           * own response as evidence of engagement.
           */
          const aiResponseText =
            String(
              parsed.aiResponse || ""
            ).toLowerCase();

          const acknowledgesClaim =
            aiResponseText.includes(
              "yes"
            ) ||
            aiResponseText.includes(
              "correct"
            ) ||
            aiResponseText.includes(
              "true"
            ) ||
            aiResponseText.includes(
              "however"
            ) ||
            aiResponseText.includes(
              "although"
            ) ||
            aiResponseText.includes(
              "but"
            );

          if (!acknowledgesClaim) {
            parsed.userScore.total = Math.max(
              parsed.userScore.total,
              parsed.aiScore.total + 5
            );

            parsed.aiScore.total = Math.min(
              parsed.aiScore.total,
              parsed.userScore.total - 5
            );
          } else if (gap <= 10) {
            /*
             * A close AI lead is allowed, but a generic
             * small advantage should not be the default.
             */
            parsed.userScore.total = Math.max(
              parsed.userScore.total,
              parsed.aiScore.total - 5
            );
          }
        }

        /*
         * Strong factual claims should normally produce
         * a meaningful score rather than 40-50.
         */
        if (
          parsed.userScore.total < 60
        ) {
          parsed.userScore.total = 60;
        }
      }

      // =======================================================
      // FIRST ROUND PROTECTION
      //
      // Prevent bare opening opinions from automatically
      // becoming 40 vs 60.
      // =======================================================

      if (currentRound === 1) {
        const wordCount =
          userResponse
            .trim()
            .split(/\s+/)
            .length;

        if (
          wordCount <= 8 &&
          !containsFactualComparison
        ) {
          parsed.userScore.total = Math.max(
            parsed.userScore.total,
            55
          );

          parsed.aiScore.total = Math.min(
            parsed.aiScore.total,
            68
          );
        }
      }

      // =======================================================
      // BACKEND FINAL WINNER
      // =======================================================

      if (currentRound < 5) {
        parsed.winner = "CONTINUE";
        parsed.finalDecision =
          "Debate continues.";
      } else {
        const previousUserTotal =
          previousDebate.reduce(
            (sum, item) =>
              sum +
              Number(
                item.userScore?.total || 0
              ),
            0
          );

        const previousAiTotal =
          previousDebate.reduce(
            (sum, item) =>
              sum +
              Number(
                item.aiScore?.total || 0
              ),
            0
          );

        const finalUserTotal =
          previousUserTotal +
          parsed.userScore.total;

        const finalAiTotal =
          previousAiTotal +
          parsed.aiScore.total;

        if (
          finalUserTotal >
          finalAiTotal
        ) {
          parsed.winner =
            "USER WINS";
        } else if (
          finalAiTotal >
          finalUserTotal
        ) {
          parsed.winner =
            "FOOTBALLDEBAITER WINS";
        } else {
          parsed.winner =
            "DRAW";
        }

        parsed.finalDecision =
          `${parsed.winner}. Final score: You ${finalUserTotal} - ${finalAiTotal} FootballDEBAITER. ${
            parsed.finalDecision || ""
          }`;
      }

      // =======================================================
      // RETURN
      // =======================================================

      return {
        statusCode: 200,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          analysis:
            JSON.stringify(parsed),
        }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid mode.",
      }),
    };
  } catch (error) {
    console.error(
      "Analysis error:",
      error
    );

    return {
      statusCode: 500,

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        error:
          "Unable to continue the debate right now.",
      }),
    };
  }
};