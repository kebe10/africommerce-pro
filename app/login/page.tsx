'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) setError(error.message);
    else router.push('/dashboard');
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });

    if (error) {
      setError(error.message);
    } else if (data.user && !data.session) {
      setMessage("Compte créé ! Vérifiez vos emails pour confirmer votre compte.");
      setView('login');
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Lien de redirection vers la page de réinitialisation
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Si ce compte existe, un lien de réinitialisation a été envoyé à votre email.");
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (view === 'login') handleLogin(e);
    else if (view === 'signup') handleSignup(e);
    else if (view === 'forgot') handleForgotPassword(e);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <h1 className="text-3xl font-bold text-[#1A5276]">AfriCommerce Pro</h1>
        </Link>
        
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          {view === 'login' && 'Connectez-vous'}
          {view === 'signup' && 'Créez votre compte'}
          {view === 'forgot' && 'Mot de passe oublié'}
        </h2>
        
        <p className="mt-2 text-center text-sm text-gray-600">
          {view === 'forgot' ? (
            <button onClick={() => setView('login')} className="font-medium text-[#E67E22] hover:underline flex items-center justify-center gap-1 mx-auto">
              <ArrowLeft size={16} /> Retour à la connexion
            </button>
          ) : (
            <>
              {view === 'login' ? "Vous n'avez pas de compte ? " : "Vous avez déjà un compte ? "}
              <button onClick={() => { setView(view === 'login' ? 'signup' : 'login'); setError(null); setMessage(null); }} className="font-medium text-[#E67E22] hover:text-orange-500">
                {view === 'login' ? "S'inscrire" : "Se connecter"}
              </button>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {message && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
              <p className="text-sm text-green-700">{message}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {view === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom Complet</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1A5276] focus:border-[#1A5276] sm:text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1A5276] focus:border-[#1A5276] sm:text-sm"
              />
            </div>

            {view !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                  {view === 'login' && (
                    <button type="button" onClick={() => { setView('forgot'); setError(null); setMessage(null); }} className="text-xs font-medium text-[#E67E22] hover:text-orange-500">
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1A5276] focus:border-[#1A5276] sm:text-sm"
                />
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#E67E22] hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    {view === 'login' && 'Se connecter'}
                    {view === 'signup' && "S'inscrire"}
                    {view === 'forgot' && 'Envoyer le lien de réinitialisation'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}