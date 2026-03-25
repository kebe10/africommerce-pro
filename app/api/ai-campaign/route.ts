import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productName, productDescription, budget, country } = body;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `
      Tu es un expert en marketing digital spécialisé pour le marché africain (${country}).
      
      Génère un plan de campagne publicitaire Facebook/Instagram complet pour ce produit :
      Produit : ${productName}
      Description : ${productDescription}
      Budget total : ${budget} FCFA
      
      Réponds UNIQUEMENT en format JSON strict avec cette structure :
      {
        "target_audience": {
          "age_range": "ex: 25-45",
          "interests": ["ex: Mode"],
          "locations": ["Ville1"],
          "behaviors": ["ex: Acheteurs en ligne"]
        },
        "ad_creative": {
          "hook": "Phrase d'accroche",
          "body": "Corps du texte",
          "call_to_action": "Bouton",
          "visual_idea": "Description visuelle"
        },
        "budget_split": { "testing": "20%", "scaling": "80%" },
        "tips": ["Conseil 1"]
      }
    `;

    // NOUVEAU MODELE (comme demandé)
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
    const result = JSON.parse(responseText);
    
    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur IA" }, { status: 500 });
  }
}