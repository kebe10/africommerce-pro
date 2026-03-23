import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Force ce fichier à être dynamique (évite les erreurs de build)
export const dynamic = 'force-dynamic'

// Initialisation Supabase Admin
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, serviceKey)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Vérification simple de l'événement
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
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}