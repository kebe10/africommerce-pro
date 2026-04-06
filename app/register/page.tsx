'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// CORRECTION : page /register qui redirige vers /login
// La page login gère déjà l'inscription via view === 'signup'
// Cette page évite les 404 depuis la landing page

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirection immédiate vers la page login
    // Le paramètre ?mode=signup peut être utilisé
    // pour pré-sélectionner la vue inscription
    router.replace('/login?mode=signup');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#E67E22] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Redirection en cours...</p>
      </div>
    </div>
  );
}