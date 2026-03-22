'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Nouvel état pour gérer l'écran "Vérifiez vos emails"
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // --- CONNEXION ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        // --- INSCRIPTION ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        
        if (error) throw error;

        // Si l'inscription a réussi
        if (data.user) {
          // On vérifie si l'utilisateur a besoin de confirmer son email
          // (Supabase renvoie une session null si confirmation requise)
          if (!data.session) {
            // Cas standard : Email de confirmation envoyé
            setConfirmationSent(true);
          } else {
            // Cas rare (si confirmation désactivée) : on connecte direct
            router.push('/dashboard');
          }
        }
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Si l'email de confirmation a été envoyé, on affiche un écran spécial
  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Vérifiez votre boîte mail</h1>
          <p className="mt-2 text-gray-600">
            Un lien de confirmation a été envoyé à <span className="font-medium">{email}</span>.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Cliquez sur le lien dans l'email pour activer votre compte, puis connectez-vous.
          </p>
          
          <div className="mt-8">
            <button
              onClick={() => {
                setConfirmationSent(false);
                setIsLogin(true);
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#E67E22] hover:text-orange-500"
            >
              <ArrowLeft size={16} /> Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sinon, on affiche le formulaire normal
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <h1 className="text-3xl font-bold text-[#1A5276]">AfriCommerce Pro</h1>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          {isLogin ? 'Connectez-vous à votre espace' : 'Créez votre compte'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isLogin ? "Vous n'avez pas de compte ? " : "Vous avez déjà un compte ? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="font-medium text-[#E67E22] hover:text-orange-500">
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleAuth}>
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nom Complet
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1A5276] focus:border-[#1A5276] sm:text-sm"
                    placeholder="Votre nom complet"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1A5276] focus:border-[#1A5276] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1A5276] focus:border-[#1A5276] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#E67E22] hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
              >
                {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : "S'inscrire")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}