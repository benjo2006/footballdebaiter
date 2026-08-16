const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
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

If the user asks about anything unrelated to football, respond ONLY with valid JSON in this exact structure:

{
  "strength": "N/A",
  "claim": "N/A",
  "claimType": "Non-football",
  "factCheck": "N/A",
  "evidence": "N/A",
  "counterargument": "N/A",
  "verdict": "The user is lacking ball knowledge. FootballDEBAITER only debates football.",
  "finalDecision": "The user is lacking ball knowledge. This project aims to debate only on football."
}

For football arguments, analyze the user's claim carefully.

IMPORTANT:
- Understand player names even when they are misspelled, shortened, or written informally.
- Use your football knowledge and available data to identify the most likely player.
- For example, "Yamal" should be understood as Lamine Yamal and "Doue" should be understood as Désiré Doué when the context clearly indicates them.
- Do NOT require the user to use exact names or annotations.
- Do not invent statistics.
- If a statistic is uncertain or unavailable, say so rather than making it up.
- Distinguish between facts, opinions, and subjective claims.
- Give balanced counterarguments.
- Be decisive when the evidence supports a conclusion.

MOST IMPORTANT PART — FINAL DECISION:

The "finalDecision" field must be the actual final call of the debate.

If the user's argument compares two or more players, teams, clubs, managers, etc., explicitly choose which side you would go with and explain the most important statistical or footballing reason.

Do NOT give a vague "both are great" or "it depends" conclusion when the available evidence supports a reasonable choice.

Keep finalDecision concise, decisive, and easy to understand.

Return ONLY valid JSON.
Do not use markdown.
Do not put the JSON inside code fences.

Return exactly these fields:

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

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      });

      const analysis = completion.choices[0]?.message?.content;

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
${item.userScore?.total ?? 0}/100

AI SCORE:
${item.aiScore?.total ?? 0}/100
`
              )
              .join("\n")
          : "No previous rounds. This is the opening round.";

      const isFinalRound = currentRound === 5;

      const prompt = `
You are FOOTBALLDEBAITER in a competitive football debate.

You are debating against a human user.

IMPORTANT:
This is a FAIR debate.

The user and AI must have EQUAL opportunity to win.

You must NOT automatically favor the AI.

You must judge the user's argument and your own response using the EXACT SAME standards.

ONLY discuss football.

If the user's argument is unrelated to football, clearly state that FootballDEBAITER only debates football and score the response accordingly.

DEBATE STRUCTURE:

There are exactly 5 rounds.

Round ${currentRound} of 5.

The user gives a take.

You respond with a strong football counterargument.

Then BOTH SIDES receive a score out of 100.

The score must be based on:

1. Football knowledge
2. Strength of reasoning
3. Use of evidence
4. Accuracy
5. Relevance
6. Persuasiveness
7. Ability to directly address the opposing argument

Do NOT score based on which side you personally prefer.

Do NOT intentionally give yourself a higher score.

A user can absolutely win a round.

The AI can absolutely lose a round.

Scores should normally be realistic and differentiated.

Do not give both sides identical scores unless their arguments are genuinely almost identical in quality.

ROUND HISTORY:

${historyText}

CURRENT USER TAKE:

${userResponse}

YOUR TASK:

1. Understand the user's football argument.
2. Respond with a strong but fair football counterargument.
3. Score the user's current take out of 100.
4. Score your own current response out of 100.
5. Explain briefly why each side received its score.
6. If this is Round 5, determine the overall winner using the TOTAL scores from all 5 rounds.

IMPORTANT SCORING RULE:

For the final round, the winner must be based on the accumulated scores across ALL FIVE rounds.

Do not simply choose the winner of Round 5.

If the final totals are tied, declare a DRAW.

AI RESPONSE:

Your response should actually debate the user's point.

Do not simply say "that's a good argument."

Challenge weak points.

Acknowledge strong points.

Use football knowledge.

Do not invent statistics.

If you mention a statistic that you are not certain about, avoid giving an exact number.

FINAL ROUND:

${
  isFinalRound
    ? `
This is ROUND 5 — THE FINAL ROUND.

After scoring this round, calculate:

USER TOTAL = all previous user scores + current user score

AI TOTAL = all previous AI scores + current AI score

Then declare:

- USER WINS
- FOOTBALLDEBAITER WINS
- DRAW

The winner must be determined ONLY from the accumulated scores.

Explain the final decision briefly.
`
    : `
This is not the final round.

Do NOT declare an overall winner yet.

Set winner to "CONTINUE".
`
}

Return ONLY valid JSON.

Do NOT use markdown.

Do NOT put the JSON inside a code block.

Return EXACTLY this structure:

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

SCORING:

userScore.total MUST be an integer from 0 to 100.

aiScore.total MUST be an integer from 0 to 100.

winner MUST be exactly one of:

"CONTINUE"

"USER WINS"

"FOOTBALLDEBAITER WINS"

"DRAW"

If this is not Round 5:
winner = "CONTINUE"

If this is Round 5:
winner must be determined from the cumulative five-round scores.

The finalDecision should be concise.

Remember:

FAIRNESS IS MORE IMPORTANT THAN WINNING.

The AI must not manipulate the scoring to make itself win.
`;

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a completely fair football debate judge and opponent. You must return only valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.35,
      });

      let debateAnalysis =
        completion.choices[0]?.message?.content;

      if (!debateAnalysis) {
        throw new Error("No debate response returned");
      }

      // Remove accidental markdown fences if the model adds them.
      debateAnalysis = debateAnalysis
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let parsed;

      try {
        parsed = JSON.parse(debateAnalysis);
      } catch (parseError) {
        console.error(
          "Debate JSON parse error:",
          debateAnalysis
        );

        throw new Error(
          "AI returned an invalid debate response."
        );
      }

      // Safety checks so the frontend always receives the
      // structure it expects.

      if (
        !parsed.aiResponse ||
        !parsed.userScore ||
        !parsed.aiScore
      ) {
        throw new Error(
          "Incomplete debate response from AI."
        );
      }

      parsed.userScore.total = Math.min(
        100,
        Math.max(
          0,
          Number(parsed.userScore.total) || 0
        )
      );

      parsed.aiScore.total = Math.min(
        100,
        Math.max(
          0,
          Number(parsed.aiScore.total) || 0
        )
      );

      if (currentRound < 5) {
        parsed.winner = "CONTINUE";
      } else {
        const previousUserTotal = previousDebate.reduce(
          (sum, item) =>
            sum + Number(item.userScore?.total || 0),
          0
        );

        const previousAiTotal = previousDebate.reduce(
          (sum, item) =>
            sum + Number(item.aiScore?.total || 0),
          0
        );

        const finalUserTotal =
          previousUserTotal + parsed.userScore.total;

        const finalAiTotal =
          previousAiTotal + parsed.aiScore.total;

        if (finalUserTotal > finalAiTotal) {
          parsed.winner = "USER WINS";
        } else if (finalAiTotal > finalUserTotal) {
          parsed.winner = "FOOTBALLDEBAITER WINS";
        } else {
          parsed.winner = "DRAW";
        }

        parsed.finalDecision =
          `${parsed.winner}. Final score: You ${finalUserTotal} - ${finalAiTotal} FootballDEBAITER. ` +
          `${parsed.finalDecision || "The winner was determined from the cumulative five-round score."}`;
      }

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysis: JSON.stringify(parsed),
        }),
      };
    }

    // =========================================================
    // UNKNOWN MODE
    // =========================================================

    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid mode.",
      }),
    };
  } catch (error) {
    console.error("Analysis error:", error);

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