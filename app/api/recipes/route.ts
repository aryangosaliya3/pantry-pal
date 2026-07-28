type PantryInput = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
};

type RequestBody = {
  items?: PantryInput[];
  meal?: string;
  request?: string;
};

const MEALS = ["Breakfast", "Lunch", "Dinner"] as const;

function textFromResponse(payload: {
  output_text?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
}) {
  if (payload.output_text) return payload.output_text;
  return payload.output
    ?.flatMap((item) => item.content || [])
    .find((content) => content.type === "output_text")?.text;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI recipe generation is not configured yet." }, { status: 503 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const items = (body.items || [])
    .filter((item) => item && typeof item.name === "string" && Number.isFinite(item.quantity) && item.quantity > 0)
    .slice(0, 80)
    .map((item) => ({
      name: item.name.trim().slice(0, 80),
      quantity: Math.min(item.quantity, 1000),
      unit: String(item.unit || "item").slice(0, 30),
      category: String(item.category || "Pantry").slice(0, 30),
    }))
    .filter((item) => item.name);

  if (!items.length) {
    return Response.json({ error: "Add at least one in-stock ingredient first." }, { status: 400 });
  }

  const meal = MEALS.includes(body.meal as (typeof MEALS)[number]) ? body.meal : "Any meal";
  const preference = String(body.request || "quick, satisfying meals").trim().slice(0, 240);
  const ingredientNames = items.map((item) => item.name);

  const recipeSchema = {
    type: "object",
    properties: {
      recipes: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            meal: { type: "string", enum: MEALS },
            minutes: { type: "integer", minimum: 1, maximum: 90 },
            protein: { type: "integer", minimum: 0, maximum: 150 },
            description: { type: "string" },
            uses: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                properties: {
                  name: { type: "string", enum: ingredientNames },
                  amount: { type: "number", exclusiveMinimum: 0 },
                },
                required: ["name", "amount"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "meal", "minutes", "protein", "description", "uses"],
          additionalProperties: false,
        },
      },
    },
    required: ["recipes"],
    additionalProperties: false,
  };

  try {
    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.6-sol",
        reasoning: { effort: "none" },
        store: false,
        instructions: [
          "You are Pantry Pal, a practical home cook.",
          "Create exactly three distinct recipes using only the pantry ingredient names provided.",
          "Every amount must be realistic, positive, and no greater than the available quantity.",
          "Assume only water, salt, pepper, and neutral cooking oil are free staples.",
          "Keep recipes quick, approachable, and safe. Protein is an approximate whole-number gram estimate per serving.",
          "Descriptions must be one concise sentence. Never invent an ingredient in the uses list.",
        ].join(" "),
        input: `Meal: ${meal}\nPreference: ${preference || "quick, satisfying meals"}\nPantry:\n${items.map((item) => `- ${item.name}: ${item.quantity} ${item.unit} (${item.category})`).join("\n")}`,
        text: {
          format: {
            type: "json_schema",
            name: "pantry_pal_recipes",
            strict: true,
            schema: recipeSchema,
          },
        },
      }),
    });

    if (!openAIResponse.ok) {
      console.error("OpenAI recipe request failed", openAIResponse.status);
      return Response.json({ error: "The AI chef is taking a break. Your built-in recipes are still available." }, { status: 502 });
    }

    const payload = await openAIResponse.json();
    const output = textFromResponse(payload);
    if (!output) throw new Error("OpenAI response contained no recipe output");
    const parsed = JSON.parse(output) as { recipes?: Array<Record<string, unknown>> };
    if (!Array.isArray(parsed.recipes) || parsed.recipes.length !== 3) throw new Error("Invalid recipe output");

    return Response.json({
      recipes: parsed.recipes.map((recipe, index) => ({ ...recipe, id: `ai-${Date.now()}-${index}` })),
      model: payload.model || "gpt-5.6-sol",
    });
  } catch (error) {
    console.error("AI recipe generation error", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "The AI chef is taking a break. Your built-in recipes are still available." }, { status: 500 });
  }
}
