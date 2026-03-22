import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialisation Supabase avec la clé Service Role pour bypasser les règles RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // On utilisera la clé secrète
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Vérifier que c'est bien un événement de succès de paiement FedaPay
    // La structure exacte dépend de la doc FedaPay, généralement c'est un événement 'payment.succeeded'
    if (body.event === 'payment.succeeded' || body.status === 'approved') {
      const paymentData = body.data || body // FedaPay peut envoyer les infos dans 'data' ou à la racine
      
      // Récupérer l'ID utilisateur (qu'on avait passé dans metadata lors de la création)
      const userId = paymentData.metadata?.user_id
      
      if (!userId) {
        console.log("Pas de user_id dans le webhook")
        return NextResponse.json({ status: 'no user' })
      }

      // Mettre à jour le profil utilisateur
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1)

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_ends_at: endDate.toISOString()
        })
        .eq('id', userId)

      if (error) console.error('Erreur MAJ Webhook:', error)
      return NextResponse.json({ status: 'success' })
    }

    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('Erreur webhook:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}