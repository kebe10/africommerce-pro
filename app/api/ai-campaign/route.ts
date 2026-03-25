import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productName, productDescription, budget, country } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "Clé Anthropic manquante" }, { status: 500 });

    // Requete directe HTTP (sans SDK) pour débugger
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true" // Parfois nécessaire
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Tu es un expert marketing pour ${country}. Crée une campagne pour ${productName} (${productDescription}) budget ${budget}. Réponds en JSON strict avec les clés: target_audience, ad_creative, budget_split, tips.`
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // On renvoie l'erreur exacte reçue
      return NextResponse.json({ error: `Anthropic Error: ${JSON.stringify(data)}` }, { status: 500 });
    }

    return NextResponse.json(data.content[0].text);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}