import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Ne pas écrire de logique entre createServerClient et getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // --- LOGIQUE DE PROTECTION ---

  // 1. Si pas connecté -> Rediriger vers Login
  if (!user) {
    const url = request.nextUrl.clone()
    // Si on n'est pas déjà sur login, landing ou pricing
    if (!url.pathname.startsWith('/login') && url.pathname !== '/' && !url.pathname.startsWith('/pricing')) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  } else {
    // 2. Si connecté, vérifier l'abonnement
    const protectedPaths = ['/dashboard', '/orders', '/products', '/calculator', '/settings', '/deliveries', '/campaigns', '/customers'];
    const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

    if (isProtectedPath) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, trial_ends_at')
        .eq('id', user.id)
        .single()

      const now = new Date()
      const trialEnd = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null

      // Si l'essai est fini ET abonnement inactif -> Pricing
      if (profile && trialEnd && now > trialEnd && profile.subscription_status !== 'active') {
        const url = request.nextUrl.clone()
        url.pathname = '/pricing'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/orders/:path*', '/products/:path*', '/calculator/:path*', 
    '/settings/:path*', '/deliveries/:path*', '/campaigns/:path*', '/customers/:path*'
  ],
}