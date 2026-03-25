import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productName, productDescription, budget, country } = body;

    // Configuration OpenAI (Clé à ajouter sur Vercel plus tard)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
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
          "interests": ["ex: Mode", "ex: Beauté"],
          "locations": ["Ville1", "Ville2"],
          "behaviors": ["ex: Acheteurs en ligne", "ex: Utilisateurs Instagram"]
        },
        "ad_creative": {
          "hook": "Phrase d'accroche percutante (max 10 mots)",
          "body": "Corps du texte persuasif (max 30 mots) en incluant des emojis",
          "call_to_action": "ex: Acheter maintenant",
          "visual_idea": "Description détaillée de l'image ou vidéo à créer"
        },
        "budget_split": {
          "testing": "Pourcentage pour le test",
          "scaling": "Pourcentage pour scaler"
        },
        "tips": ["Conseil 1 spécifique au marché africain", "Conseil 2"]
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-3.5-turbo', // Ou gpt-4o si tu as accès
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Erreur IA:', error);
    return NextResponse.json({ error: "Erreur de génération IA. Vérifiez la clé API." }, { status: 500 });
  }
}