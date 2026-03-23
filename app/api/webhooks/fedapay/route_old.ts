import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // On initialise Supabase DANS la fonction, pas au début du fichier
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Config manquante' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    const body = await request.json()
    
    // Vérification de l'événement FedaPay
    if (body.event === 'payment.succeeded' || body.status === 'approved') {
      const paymentData = body.data || body
      const userId = paymentData.metadata?.user_id

      if (userId) {
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + 1)

        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_ends_at: endDate.toISOString()
          })
          .eq('id', userId)
      }
    }

    return NextResponse.json({ received: true })
    
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}