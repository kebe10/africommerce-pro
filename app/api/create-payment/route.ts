import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, userId, fullName } = body;

    let secretKey = process.env.FEDAPAY_SECRET_KEY || '';
    secretKey = secretKey.trim(); 
    // DEBUG : On affiche le début de la clé pour être sûr
    console.log("--- DEBUG ---");
    console.log("Début de la clé:", secretKey.substring(0, 15));
    console.log("Taille:", secretKey.length);
    if (!secretKey) {
      return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 });
    }

    // APPEL FEDAPAY
    const response = await fetch('https://api.fedapay.com/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`
      },
      body: JSON.stringify({
        amount: 6500,
        currency: 'XOF',
        description: 'Abonnement Pro AfriCommerce',
        customer: {
          email: email,
          firstname: fullName || 'Client',
          lastname: 'User'
        },
        metadata: { user_id: userId },
        return_url: 'https://africommerce-pro.vercel.app/dashboard' // Mets ton URL Vercel ici
      })
    });

    const data = await response.json();

    if (data.v1 && data.v1.url) {
      return NextResponse.json({ url: data.v1.url });
    } else {
      console.error('Erreur FedaPay:', data);
      // On renvoie TOUTE l'erreur pour comprendre
      return NextResponse.json({ error: JSON.stringify(data) }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}