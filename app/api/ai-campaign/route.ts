import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productName, productDescription, budget, country } = body;

    // Configuration Claude
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `
      Tu es un expert en marketing digital spécialisé pour le marché africain (${country}).
      
      Génère un plan de campagne publicitaire Facebook/Instagram complet pour ce produit :
      Produit : ${productName}
      Description : ${productDescription}
      Budget total : ${budget} FCFA
      
      Réponds UNIQUEMENT en format JSON strict (sans texte avant ni après) avec cette structure :
      {
        "target_audience": {
          "age_range": "ex: 25-45",
          "interests": ["ex: Mode", "ex: Beauté"],
          "locations": ["Ville1", "Ville2"],
          "behaviors": ["ex: Acheteurs en ligne"]
        },
        "ad_creative": {
          "hook": "Phrase d'accroche",
          "body": "Corps du texte avec emojis",
          "call_to_action": "Bouton",
          "visual_idea": "Description visuelle"
        },
        "budget_split": {
          "testing": "20%",
          "scaling": "80%"
        },
        "tips": ["Conseil 1", "Conseil 2"]
      }
    `;

    // Appel à Claude
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620", // CORRECTION ICI
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    // Extraction du texte
    const responseText = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
    
    // Parsing du JSON
    const result = JSON.parse(responseText);
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Erreur Claude:', error);
    return NextResponse.json({ error: error.message || "Erreur IA" }, { status: 500 });
  }
}