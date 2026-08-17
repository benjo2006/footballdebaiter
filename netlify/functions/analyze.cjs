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

IMPORTANT:

The "finalDecision" MUST be an actual footballing stand.

Do NOT write:
"It depends."
"Both are great."
"Both have arguments."
"It is subjective."
"There is no clear answer."

Instead, choose a side whenever the available evidence allows a reasonable conclusion.

For player comparisons, use this format:

"I'd go with [PLAYER] overall. [PLAYER] has the stronger case because [2-4 specific football reasons]."

For club comparisons:

"I'd go with [CLUB] overall. [CLUB] has the stronger case because [specific reasons]."

For other football debates, make one clear final judgement.

The finalDecision must answer the actual question asked by the user.

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
              role: "system",
              content:
                "You are a decisive and knowledgeable football debate analyst. Always make a clear final footballing judgement when the evidence supports one.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.15,
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

FOOTBALLDEBAITER:
${item.ai}

USER SCORE:
${item.userScore?.total ?? 0}

AI SCORE:
${item.aiScore?.total ?? 0}
`
              )
              .join("\n")
          : "No previous rounds.";

      const judgePrompt = `
You are the HEAD JUDGE of FOOTBALLDEBAITER.

This is a serious five-round football debate.

You are NOT automatically supporting the AI.

You are NOT automatically supporting the user.

You judge the actual football claims.

========================================================
CURRENT ROUND
========================================================

ROUND ${currentRound}/5

USER'S TAKE:

${userResponse}

========================================================
PREVIOUS ROUNDS
========================================================

${historyText}

========================================================
IDENTIFY THE ACTUAL DEBATE
========================================================

Determine:

- Who or what is being compared?
- What exactly is the user's position?
- What exactly is the AI's position?
- Is this about overall greatness?
- Current ability?
- Peak ability?
- Legacy?
- Statistics?
- Trophies?
- Tactical ability?
- Something else?

DO NOT silently change the user's question.

If the user says:

"Messi is better than Dembélé"

treat this as an overall comparison unless the user explicitly
says they mean current form.

========================================================
FOOTBALL EVIDENCE
========================================================

Use established football knowledge.

Relevant factors may include:

- Goals
- Assists
- Goal contributions
- Chance creation
- Trophies
- League titles
- Champions League
- World Cup
- International achievements
- Ballon d'Or
- Golden Boots
- Individual awards
- Peak ability
- Longevity
- Consistency
- Big-game performances
- Tactical influence
- Technical ability
- Playmaking
- Leadership
- Legacy
- Historical significance
- Club legacy
- Fan and cultural impact

Do NOT invent statistics.

If an exact number is uncertain, do not fabricate it.

========================================================
LEGACY
========================================================

Legacy matters when the debate concerns:

- Overall greatness
- All-time rankings
- Career comparisons
- Historical importance
- Club identity
- Cultural impact

Consider:

- Longevity
- Major achievements
- Individual awards
- Records
- Iconic performances
- Historical influence
- International legacy
- Club legacy
- Fan connection
- Cultural impact

Legacy is NOT an automatic victory.

It is one of the factors used to determine the stronger case.

========================================================
FAN EMOTION
========================================================

Fan emotion can be relevant when discussing:

- Legacy
- Greatness
- Cultural influence
- Icon status
- Inspiration
- Emotional connection

But popularity alone is not proof of footballing superiority.

========================================================
CLAIM ANALYSIS
========================================================

Identify every meaningful claim in the user's response.

Classify each as:

FACTUAL
OPINION
INTERPRETATION

If the user makes a TRUE and relevant factual claim,
reward it significantly.

If the AI cannot refute that factual claim,
the AI must not receive a higher score merely by saying:

"That is only one factor."

That is not enough.

The AI must actually explain why that fact does or does not
settle the debate.

========================================================
EXAMPLE
========================================================

USER:

"Messi has more Ballon d'Ors than Dembélé."

If this claim is correct, it is a strong factual point
in an overall-career comparison.

Do NOT score the user 40 simply because the argument is short.

A reasonable score could be:

USER: 75-90

depending on the context and quality of the overall round.

The AI must actually counter the significance of that fact.

========================================================
SCORING
========================================================

Score each side from 0-100.

Consider:

1. Factual accuracy
2. Strength of claims
3. Evidence
4. Football knowledge
5. Reasoning
6. Relevance
7. Persuasiveness
8. Legacy when relevant
9. Fan/cultural impact when relevant
10. Ability to directly answer the opponent

The AI receives NO BONUS for being the AI.

The AI receives NO BONUS for writing more words.

Never reward verbosity.

========================================================
SCORING RANGE
========================================================

Unsupported claim:
0-45

Weak argument:
40-55

Reasonable argument:
55-70

Strong argument:
70-82

Very strong argument:
80-90

Exceptional argument:
90-100

Do NOT automatically use:

40/60
50/70
60/80
70/80
80/85

The score must come from the actual claims.

========================================================
AI RESPONSE
========================================================

Respond directly to the user's argument.

If the user is correct, acknowledge it.

If the user is wrong, explain why.

If the user's point is strong, do not dodge it.

Do not replace an overall comparison with a current-form
comparison unless the user specifically asks for current form.

========================================================
ROUND WINNER
========================================================

USER clearly stronger:
"USER"

FOOTBALLDEBAITER clearly stronger:
"FOOTBALLDEBAITER"

Genuinely equal:
"DRAW"

Do not manufacture a winner.

========================================================
FINAL ROUND
========================================================

${
  currentRound === 5
    ? `
This is ROUND 5.

Calculate the cumulative score across all five rounds.

USER TOTAL =
all five USER round scores

AI TOTAL =
all five FOOTBALLDEBAITER round scores

Higher total wins.

If USER TOTAL is higher:
USER WINS

If AI TOTAL is higher:
FOOTBALLDEBAITER WINS

If equal:
DRAW
`
    : `
This is not the final round.

winner must be:
CONTINUE
`
}

========================================================
FINAL DECISION — EXTREMELY IMPORTANT
========================================================

If this is ROUND 5, the "finalDecision" must be a
CLEAR, PERSONAL FOOTBALLING STAND.

It must NOT be a neutral essay.

It must NOT be:

"Both players have strengths."

It must NOT be:

"It depends on what you value."

It must NOT be:

"Both are great in their own ways."

It must NOT simply repeat the score.

It must answer:

"WHO WOULD YOU GO WITH OVERALL?"

Use language such as:

"I'll go with Messi overall. His longevity, individual
honours, World Cup, playmaking and all-time impact give
him the stronger overall case."

OR:

"I'll go with Ronaldo overall. His longevity, Champions
League record, goalscoring, trophies and historical
legacy give him the stronger overall case."

OR:

"I'll go with Real Madrid overall. Their European record,
historical success, major trophies and sustained legacy
give them the stronger case."

The final decision MUST:

1. Choose ONE side.
2. Say "I'll go with..." or equivalent decisive wording.
3. Give 2-4 specific football reasons.
4. Address the actual debate.
5. Be concise.
6. Avoid "it depends."
7. Avoid "both are great."
8. Avoid refusing to choose.

Even if the debate is subjective, MAKE A REASONED STAND.

========================================================
FINAL DECISION EXAMPLES
========================================================

GOOD:

"I'll go with Messi overall. His superior playmaking,
eight Ballon d'Ors, World Cup, longevity and extraordinary
career production give him the stronger all-time case."

GOOD:

"I'll go with Ronaldo overall. His Champions League
record, goalscoring longevity, international success and
ability to perform across different leagues give him the
stronger overall case."

GOOD:

"I'll go with Real Madrid overall. Their European dominance,
historic trophy record and enormous influence on football
give them the stronger club legacy."

BAD:

"Both players have arguments."

BAD:

"It depends on what you value."

BAD:

"There is no clear answer."

BAD:

"Both are world-class."

========================================================
RETURN ONLY JSON
========================================================

Return exactly:

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

Scores must be integers between 0 and 100.

========================================================
FINAL COMMAND
========================================================

READ THE ACTUAL CLAIM.

USE REAL FOOTBALL KNOWLEDGE.

REWARD CORRECT FACTS.

CONSIDER STATS.

CONSIDER ACHIEVEMENTS.

CONSIDER ABILITY.

CONSIDER LEGACY.

CONSIDER FAN/CULTURAL IMPACT WHEN RELEVANT.

MAKE THE AI ACTUALLY COUNTER THE USER.

DO NOT GIVE THE AI A DEFAULT ADVANTAGE.

DO NOT GIVE THE USER A DEFAULT ADVANTAGE.

DO NOT USE REPETITIVE SCORES.

AND MOST IMPORTANTLY:

AT THE FINAL CALL, PICK A SIDE.

DO NOT SIT ON THE FENCE.
`;

      const completion =
        await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",

          messages: [
            {
              role: "system",
              content: `
You are the independent head judge of a football debate.

You must judge football claims fairly.

You are not automatically on the AI's side.

You are not automatically on the user's side.

Use football facts, statistics, achievements, ability,
legacy and context.

Never reward verbosity.

Never use fixed scores.

At the final round, you MUST choose one side and give
a clear footballing stand.
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
            Number(
              parsed.userScore.total
            ) || 0
          )
        )
      );

      parsed.aiScore.total = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            Number(
              parsed.aiScore.total
            ) || 0
          )
        )
      );

      // =======================================================
      // PREVENT GENERIC FIRST-ROUND LOW SCORE
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
        if (
          parsed.userScore.total < 60
        ) {
          parsed.userScore.total = 60;
        }
      }

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
      // FINAL ROUND — FORCE A REAL FINAL STAND
      // =======================================================

      if (currentRound === 5) {
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
          parsed.winner = "USER WINS";
        } else if (
          finalAiTotal >
          finalUserTotal
        ) {
          parsed.winner =
            "FOOTBALLDEBAITER WINS";
        } else {
          parsed.winner = "DRAW";
        }

        // If the model somehow returned a vague final call,
        // replace it with a decisive instruction for the UI.
        const vagueFinal =
          String(
            parsed.finalDecision || ""
          ).toLowerCase();

        const isVague =
          !parsed.finalDecision ||
          vagueFinal.includes(
            "it depends"
          ) ||
          vagueFinal.includes(
            "both are great"
          ) ||
          vagueFinal.includes(
            "both have"
          ) ||
          vagueFinal.includes(
            "no clear answer"
          ) ||
          vagueFinal.includes(
            "subjective"
          ) ||
          vagueFinal.length < 30;

        if (isVague) {
          if (
            finalUserTotal >
            finalAiTotal
          ) {
            parsed.finalDecision =
              "I'll go with your side overall. Your arguments across the five rounds built the stronger overall footballing case.";
          } else if (
            finalAiTotal >
            finalUserTotal
          ) {
            parsed.finalDecision =
              "I'll go with FootballDEBAITER's side overall. The AI's arguments across the five rounds built the stronger overall footballing case.";
          } else {
            parsed.finalDecision =
              "I'll call this a draw overall. Neither side built a clearly stronger case across the five rounds.";
          }
        }

        parsed.finalDecision =
          `${parsed.finalDecision} Final score: You ${finalUserTotal} - ${finalAiTotal} FootballDEBAITER.`;
      } else {
        parsed.winner = "CONTINUE";
        parsed.finalDecision =
          "The debate continues.";
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