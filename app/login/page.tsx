'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';

// ── Traduction des erreurs Supabase ───────────────────────────────────────────

// CORRECTION : erreurs traduites en français
function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials'))
    return 'Email ou mot de passe incorrect.';
  if (msg.includes('Email not confirmed'))
    return 'Veuillez confirmer votre email avant de vous connecter.';
  if (msg.includes('User already registered'))
    return 'Un compte existe déjà avec cet email.';
  if (msg.includes('Password should be at least'))
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Trop de tentatives. Veuillez réessayer dans quelques minutes.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Problème de connexion. Vérifiez votre réseau.';
  return msg;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // — Vue active
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');

  // CORRECTION : pré-sélectionner signup si ?mode=signup
  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setView('signup');
    }
  }, [searchParams]);

  // — State formulaire
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName,        setFullName]        = useState('');

  // — UI
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [message,      setMessage]      = useState<string | null>(null);
  // CORRECTION : afficher/masquer mot de passe
  const [showPassword, setShowPassword] = useState(false);

  // ── Navigation entre vues ─────────────────────────────────────────────────

  function switchView(next: 'login' | 'signup' | 'forgot') {
    setView(next);
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  }

  // ── Actions auth ──────────────────────────────────────────────────────────

  // CORRECTION : e.preventDefault() uniquement dans handleSubmit
  async function handleLogin() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(translateError(error.message));
    else router.push('/dashboard');
    setLoading(false);
  }

  async function handleSignup() {
    // CORRECTION : validation avant envoi
    if (!fullName.trim()) {
      setError('Veuillez entrer votre nom complet.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    // CORRECTION : confirmation mot de passe
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(translateError(error.message));
    } else if (data.user && !data.session) {
      setMessage('Compte créé ! Vérifiez vos emails pour confirmer votre compte.');
      switchView('login');
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Veuillez entrer votre adresse email.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) setError(translateError(error.message));
    else setMessage('Si ce compte existe, un lien de réinitialisation a été envoyé à votre email.');
    setLoading(false);
  }

  // CORRECTION : un seul point d'entrée pour le formulaire
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (view === 'login')  handleLogin();
    if (view === 'signup') handleSignup();
    if (view === 'forgot') handleForgotPassword();
  }

  // ── Libellés selon la vue ─────────────────────────────────────────────────

  const titles = {
    login:  'Connectez-vous',
    signup: 'Créez votre compte gratuit',
    forgot: 'Mot de passe oublié',
  };

  const buttonLabels = {
    login:  'Se connecter',
    signup: "S'inscrire gratuitement",
    forgot: 'Envoyer le lien de réinitialisation',
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">

      {/* Logo + titre */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <Link href="/" className="inline-block">
          <h1 className="text-3xl font-bold text-[#1A5276] hover:opacity-80 transition">
            AfriCommerce Pro
          </h1>
        </Link>
        <p className="text-xs text-gray-400 mt-1">Le 1er outil rentabilité pour l'Afrique</p>

        <h2 className="mt-6 text-2xl font-bold text-gray-900">
          {titles[view]}
        </h2>

        {/* Liens de navigation entre vues */}
        <p className="mt-2 text-sm text-gray-600">
          {view === 'forgot' ? (
            <button
              onClick={() => switchView('login')}
              className="font-medium text-[#E67E22] hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Retour à la connexion
            </button>
          ) : (
            <>
              {view === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
              <button
                onClick={() => switchView(view === 'login' ? 'signup' : 'login')}
                className="font-medium text-[#E67E22] hover:text-orange-500 transition"
              >
                {view === 'login' ? "S'inscrire gratuitement" : "Se connecter"}
              </button>
            </>
          )}
        </p>
      </div>

      {/* Carte formulaire */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-lg sm:rounded-2xl border border-gray-100">

          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Message de succès */}
          {message && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg flex items-start gap-2">
              <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{message}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* Nom complet — signup seulement */}
            {view === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet *
                </label>
                <input
                  type="text" required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Ex: Kouamé Yao"
                  // CORRECTION : disabled pendant loading
                  disabled={loading}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5276] focus:border-[#1A5276] disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse email *
              </label>
              <input
                type="email" required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                disabled={loading}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5276] focus:border-[#1A5276] disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Mot de passe — login + signup */}
            {view !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Mot de passe *
                  </label>
                  {view === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchView('forgot')}
                      className="text-xs font-medium text-[#E67E22] hover:text-orange-500 transition"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={view === 'signup' ? 'Min. 6 caractères' : '••••••••'}
                    disabled={loading}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5276] focus:border-[#1A5276] disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                  {/* CORRECTION : bouton afficher/masquer */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* CORRECTION : confirmation mot de passe — signup seulement */}
            {view === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Répétez votre mot de passe"
                  disabled={loading}
                  className={`w-full px-3 py-2.5 border rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5276] disabled:bg-gray-50 disabled:cursor-not-allowed ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>
                )}
                {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle size={12} /> Les mots de passe correspondent.
                  </p>
                )}
              </div>
            )}

            {/* Bouton soumettre */}
            <button
              type="submit"
              disabled={loading || (view === 'signup' && confirmPassword !== '' && password !== confirmPassword)}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#E67E22] hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading
                ? <><Loader2 className="animate-spin h-4 w-4" /> Chargement...</>
                : buttonLabels[view]
              }
            </button>

            {/* Mention essai gratuit — signup seulement */}
            {view === 'signup' && (
              <p className="text-center text-xs text-gray-500">
                ✅ 14 jours gratuits · Aucune carte bancaire requise
              </p>
            )}
          </form>
        </div>

        {/* CORRECTION : lien retour accueil visible */}
        <p className="text-center text-xs text-gray-400 mt-6">
          <Link href="/" className="hover:text-[#1A5276] hover:underline transition">
            ← Retour à l'accueil
          </Link>
        </p>
      </div>
    </div>
  );
}