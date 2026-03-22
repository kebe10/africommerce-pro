'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // 2. Demander à notre API de créer le lien de paiement
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          userId: user.id,
          fullName: user.user_metadata?.full_name
        })
      });

      const data = await res.json();

      if (data.url) {
        // 3. Rediriger l'utilisateur vers la page Moneroo
        window.location.href = data.url;
      } else {
        setError(data.error || "Impossible de lancer le paiement.");
        setLoading(false);
      }

    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-900">Votre période d'essai est terminée</h1>
        <p className="mt-2 text-gray-600">Choisissez votre abonnement pour continuer.</p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-[#E67E22]">
          <h2 className="text-xl font-bold text-center mb-6">Plan Pro - 6 500 FCFA / mois</h2>
          
          <ul className="space-y-3 mb-8 text-sm text-gray-600">
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Accès total à vie</li>
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Support prioritaire</li>
          </ul>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-200">
              {error}
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#E67E22] hover:bg-orange-600 focus:outline-none disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Connexion à Moneroo...
              </>
            ) : 'Payer avec Mobile Money / Carte'}
          </button>
          
          <p className="mt-4 text-center text-xs text-gray-400">
            Paiement sécurisé par Moneroo
          </p>
        </div>
        
        <div className="text-center mt-6">
           <Link href="/login" className="text-sm text-gray-600 hover:text-[#1A5276]">
              ← Retour
           </Link>
        </div>
      </div>
    </div>
  );
}