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

    // Prompt amélioré pour coller aux interfaces Facebook/Insta
    const prompt = `
      Tu es un expert media buyer confirmé pour le marché africain (${country}).
      
      Crée une campagne publicitaire performante pour ce produit :
      Produit : ${productName}
      Description : ${productDescription}
      Budget : ${budget} FCFA

      Réponds UNIQUEMENT en JSON strict avec cette structure détaillée :
      {
        "targeting": {
          "age_min": 25,
          "age_max": 45,
          "gender": "Tous",
          "locations": ["Abidjan", "Cotonou"],
          "interests": ["Mode", "Shopping en ligne"],
          "behaviors": ["Acheteurs en ligne (30 jours)"]
        },
        "ad_creative": {
          "format": "Image ou Vidéo courte",
          "visual_description": "Description précise de l'image ou vidéo à créer (ex: Une jeune femme souriante portant le produit...)",
          "primary_text": "Le texte principal de la pub (125 caractères max, avec emojis)",
          "headline": "Le titre accrocheur (25 caractères max)",
          "description": "Description courte (30 caractères max)",
          "call_to_action": "Acheter maintenant"
        },
        "campaign_setup": {
          "objective": "Ventes ou Conversions",
          "budget_split": {
            "testing_phase": "30% du budget pour tester",
            "scaling_phase": "70% du budget si rentable"
          },
          "tips": ["Conseil spécifique au marché local"]
        }
      }
    `;

    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    let responseText = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(responseText);
    
    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur IA" }, { status: 500 });
  }
}