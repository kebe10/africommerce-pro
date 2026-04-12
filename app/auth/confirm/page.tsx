'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/dashboard');
      } else {
        // Écouter le changement d'auth après confirmation
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            router.replace('/dashboard');
            subscription.unsubscribe();
          }
        });
      }
    };
    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#E67E22] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Confirmation en cours...</p>
        <p className="text-gray-400 text-sm mt-1">Vous allez être redirigé vers votre dashboard.</p>
      </div>
    </div>
  );
}