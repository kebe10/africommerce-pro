import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, userId, fullName } = body;

    let secretKey = process.env.FEDAPAY_SECRET_KEY || '';
    secretKey = secretKey.trim(); 

    console.log("--- DEBUG FEDAPAY ---");
    console.log("Clé utilisée:", secretKey.substring(0, 15) + "...");
    
    if (!secretKey) {
      return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 });
    }

    const response = await fetch('https://api.fedapay.com/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`
      },
      body: JSON.stringify({
        amount: 6500,
        currency: 'XOF', // CORRECTION ICI
        description: 'Abonnement Pro',
        customer: {
          email: email,
          firstname: fullName || 'Client',
          lastname: 'User'
        },
        metadata: { user_id: userId },
        return_url: 'http://localhost:3000/dashboard'
      })
    });

    const data = await response.json();
    console.log("Réponse FedaPay:", JSON.stringify(data).substring(0, 100) + "...");

    if (data.v1 && data.v1.url) {
      return NextResponse.json({ url: data.v1.url });
    } else {
      console.error('Erreur complète FedaPay:', data);
      return NextResponse.json({ error: data.message || "Erreur API" }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}