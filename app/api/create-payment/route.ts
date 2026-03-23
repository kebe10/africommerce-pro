import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, userId, fullName } = body;

    // 1. Récupérer la clé secrète
    let secretKey = process.env.FEDAPAY_SECRET_KEY || '';
    secretKey = secretKey.trim(); // On enlève les espaces

    if (!secretKey) {
      return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 });
    }

    // 2. Appeler FedaPay
    const response = await fetch('https://api.fedapay.com/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`
      },
      body: JSON.stringify({
        amount: 6500, // 6 500 FCFA
        currency: 'XOF',
        description: 'Abonnement Pro AfriCommerce',
        customer: {
          email: email,
          firstname: fullName || 'Client',
          lastname: 'User'
        },
        metadata: { user_id: userId },
        return_url: 'https://africommerce-pro.vercel.app/dashboard' // Ton site en ligne
      })
    });

    const data = await response.json();

    // 3. Renvoyer l'URL de paiement
    if (data.v1 && data.v1.url) {
      return NextResponse.json({ url: data.v1.url });
    } else {
      console.error('Erreur FedaPay:', data);
      return NextResponse.json({ error: data.message || "Erreur API" }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}