'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthConfirmContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirmation en cours...');

  useEffect(() => {
    const handleConfirm = async () => {
      try {
        // Récupérer les paramètres Supabase depuis l'URL
        const token_hash = searchParams.get('token_hash');
        const type       = searchParams.get('type') as 'email' | 'recovery' | null;
        const code       = searchParams.get('code');

        // CAS 1 : token_hash dans l'URL (nouveau format Supabase)
        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type,
          });

          if (error) {
            console.error('Vérification OTP:', error.message);
            setStatus('error');
            setMessage('Le lien de confirmation a expiré ou est invalide.');
            return;
          }

          setStatus('success');
          setMessage('Compte confirmé ! Redirection...');
          setTimeout(() => router.replace('/dashboard'), 1500);
          return;
        }

        // CAS 2 : code dans l'URL (PKCE flow)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('Exchange code:', error.message);
            setStatus('error');
            setMessage('Le lien de confirmation a expiré ou est invalide.');
            return;
          }

          setStatus('success');
          setMessage('Compte confirmé ! Redirection...');
          setTimeout(() => router.replace('/dashboard'), 1500);
          return;
        }

        // CAS 3 : session déjà active (l'utilisateur a cliqué sur le lien
        // et Supabase a déjà traité le token via le hash #)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('success');
          setMessage('Compte confirmé ! Redirection...');
          setTimeout(() => router.replace('/dashboard'), 1000);
          return;
        }

        // CAS 4 : écouter le changement d'état (hash fragment traité par Supabase)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
            setStatus('success');
            setMessage('Compte confirmé ! Redirection...');
            subscription.unsubscribe();
            setTimeout(() => router.replace('/dashboard'), 1000);
          }
        });

        // Timeout si rien ne se passe après 5 secondes
        setTimeout(() => {
          subscription.unsubscribe();
          if (status === 'loading') {
            setStatus('error');
            setMessage('Aucune confirmation détectée. Essayez de vous connecter directement.');
          }
        }, 5000);

      } catch (err) {
        console.error('Erreur confirmation:', err);
        setStatus('error');
        setMessage('Une erreur inattendue s\'est produite.');
      }
    };

    handleConfirm();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">

        {/* Logo */}
        <h1 className="text-2xl font-bold text-[#1A5276] mb-6">AfriCommerce Pro</h1>

        {/* Icône selon statut */}
        {status === 'loading' && (
          <div className="w-16 h-16 border-4 border-[#E67E22] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        )}
        {status === 'success' && (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-3xl">✓</span>
          </div>
        )}
        {status === 'error' && (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-3xl">✗</span>
          </div>
        )}

        {/* Message */}
        <p className={`font-medium mb-2 ${
          status === 'success' ? 'text-green-700'
          : status === 'error' ? 'text-red-700'
          : 'text-gray-700'
        }`}>
          {message}
        </p>

        {status === 'error' && (
          <div className="space-y-2 mt-4">
            <button
              onClick={() => router.push('/login')}
              className="w-full py-2.5 bg-[#1A5276] text-white rounded-lg text-sm font-medium hover:bg-blue-900 transition"
            >
              Aller à la connexion
            </button>
            <button
              onClick={() => router.push('/register')}
              className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Créer un nouveau compte
            </button>
          </div>
        )}

        {status === 'loading' && (
          <p className="text-gray-400 text-xs mt-2">
            Veuillez patienter quelques secondes...
          </p>
        )}
      </div>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#E67E22] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthConfirmContent />
    </Suspense>
  );
}