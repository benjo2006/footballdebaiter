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
    const { argument } = JSON.parse(event.body || "{}");

    if (!argument || !argument.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Argument is required" }),
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

For example:
"I'd go with Lamine Yamal over Bukayo Saka here because Yamal's chance creation and progressive attacking numbers give him the stronger profile for this comparison."

Do NOT give a vague "both are great" or "it depends" conclusion when the available evidence supports a reasonable choice.

If the claim is NOT a direct comparison, give a direct conclusion about whether the evidence supports the user's argument.

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
  } catch (error) {
    console.error("Analysis error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Unable to analyze the argument right now.",
      }),
    };
  }
};