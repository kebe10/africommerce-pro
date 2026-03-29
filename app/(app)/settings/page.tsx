'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import {
  Settings, User as UserIcon, MessageCircle, Bell,
  Save, CheckCircle, Globe, LogOut, AlertCircle,
  Eye, EyeOff
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type AppSettings = {
  whatsapp_order_message:    string;
  whatsapp_customer_message: string;
  whatsapp_delivery_message: string;
  email_notifications:       boolean;
  low_stock_alert:           boolean;
};

type CountrySetting = {
  id:                   string;
  country:              string;
  default_failure_rate: number;
  is_default:           boolean;
};

// ── Constantes ────────────────────────────────────────────────────────────────

const COUNTRY_LABELS: Record<string, string> = {
  cote_divoire: "🇨🇮 Côte d'Ivoire",
  senegal:      '🇸🇳 Sénégal',
  cameroun:     '🇨🇲 Cameroun',
  other:        '🌍 Autre pays',
};

const DEFAULT_TEMPLATES: AppSettings = {
  whatsapp_order_message:    'Bonjour {client}, votre commande {commande} est bien enregistrée. Merci !',
  whatsapp_customer_message: 'Bonjour {client}, merci pour votre fidélité !',
  whatsapp_delivery_message: 'Bonjour {client}, votre colis est en route. Livraison prévue sous 24h.',
  email_notifications:       true,
  low_stock_alert:           true,
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();

  // — Auth
  // CORRECTION : User typé correctement
  const [user, setUser]               = useState<User | null>(null);
  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // CORRECTION : afficher/masquer le mot de passe
  const [showPassword, setShowPassword] = useState(false);

  // — Settings
  const [templates, setTemplates]         = useState<AppSettings>(DEFAULT_TEMPLATES);
  const [countrySettings, setCountrySettings] = useState<CountrySetting[]>([]);

  // — UI
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [successMsg, setSuccessMsg]         = useState<string | null>(null);
  // CORRECTION : erreurs inline au lieu d'alert()
  const [errorMessages, setErrorMessages]   = useState<string[]>([]);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    // CORRECTION : tout dans une seule init pour éviter la condition de course
    const init = async () => {
      setLoading(true);
      await Promise.all([checkUser(), fetchAllSettings()]);
      setLoading(false);
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(session.user);
        setEmail(session.user.email ?? '');
        setFullName(session.user.user_metadata?.full_name ?? '');
      } else {
        setUser(null);
        setEmail('');
        setFullName('');
      }
    });

    return () => { authListener?.subscription.unsubscribe(); };
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setEmail(user.email ?? '');
      setFullName(user.user_metadata?.full_name ?? '');
    }
    // CORRECTION : setLoading retiré d'ici, géré dans init()
  }

  async function fetchAllSettings() {
    // CORRECTION : maybeSingle() au lieu de single()
    const { data: appSettings, error: appError } = await supabase
      .from('app_settings').select('*').eq('id', 1).maybeSingle();
    if (appError) console.error('App settings:', appError.message);
    else if (appSettings) {
      setTemplates({
        whatsapp_order_message:    appSettings.whatsapp_order_message    ?? DEFAULT_TEMPLATES.whatsapp_order_message,
        whatsapp_customer_message: appSettings.whatsapp_customer_message ?? DEFAULT_TEMPLATES.whatsapp_customer_message,
        whatsapp_delivery_message: appSettings.whatsapp_delivery_message ?? DEFAULT_TEMPLATES.whatsapp_delivery_message,
        email_notifications:       appSettings.email_notifications       ?? true,
        low_stock_alert:           appSettings.low_stock_alert           ?? true,
      });
    }

    // CORRECTION : charger TOUS les pays
    const { data: countries, error: countryError } = await supabase
      .from('country_settings').select('*').order('country');
    if (countryError) console.error('Country settings:', countryError.message);
    else if (countries) setCountrySettings(countries as CountrySetting[]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  function showErrors(errors: string[]) {
    setErrorMessages(errors);
    setTimeout(() => setErrorMessages([]), 6000);
  }

  // CORRECTION : insertion de variable dans un template
  function insertVariable(field: keyof AppSettings, variable: string) {
    if (typeof templates[field] !== 'string') return;
    setTemplates(prev => ({
      ...prev,
      [field]: (prev[field] as string) + variable,
    }));
  }

  // ── Sauvegarde ────────────────────────────────────────────────────────────

  async function handleSaveAll() {
    setSaving(true);
    const errors: string[] = [];

    // 1. Mettre à jour le nom
    if (user && fullName !== (user.user_metadata?.full_name ?? '')) {
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
      if (error) errors.push('Nom : ' + error.message);
    }

    // 2. Mettre à jour le mot de passe
    if (newPassword) {
      // CORRECTION : validation longueur + confirmation
      if (newPassword.length < 8) {
        errors.push('Mot de passe : minimum 8 caractères requis');
      } else if (newPassword !== confirmPassword) {
        errors.push('Mot de passe : les deux mots de passe ne correspondent pas');
      } else {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) errors.push('Mot de passe : ' + error.message);
        else { setNewPassword(''); setConfirmPassword(''); }
      }
    }

    // 3. Mettre à jour app_settings
    const { error: appError } = await supabase
      .from('app_settings')
      .update({
        whatsapp_order_message:    templates.whatsapp_order_message,
        whatsapp_customer_message: templates.whatsapp_customer_message,
        whatsapp_delivery_message: templates.whatsapp_delivery_message,
        email_notifications:       templates.email_notifications,
        low_stock_alert:           templates.low_stock_alert,
      })
      .eq('id', 1);
    if (appError) errors.push('Templates WhatsApp : ' + appError.message);

    // 4. Mettre à jour les taux d'échec par pays
    // CORRECTION : gestion d'erreur + mise à jour de tous les pays
    for (const country of countrySettings) {
      const { error } = await supabase
        .from('country_settings')
        .update({ default_failure_rate: country.default_failure_rate })
        .eq('id', country.id);
      if (error) errors.push(`Taux ${COUNTRY_LABELS[country.country] ?? country.country} : ${error.message}`);
    }

    setSaving(false);

    // CORRECTION : erreurs inline au lieu d'alert()
    if (errors.length === 0) showSuccess('Tous les paramètres ont été sauvegardés !');
    else showErrors(errors);
  }

  // ── Déconnexion ───────────────────────────────────────────────────────────

  // CORRECTION : bouton de déconnexion ajouté
  async function handleSignOut() {
    if (!confirm('Voulez-vous vraiment vous déconnecter ?')) return;
    await supabase.auth.signOut();
    router.push('/login');
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* En-tête */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-500 text-sm">Gérez votre compte et vos préférences</p>
        </div>
        <div className="flex gap-2">
          {/* CORRECTION : bouton déconnexion */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-lg text-sm transition"
          >
            <LogOut size={16} /> Déconnexion
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 bg-[#1A5276] hover:bg-blue-900 text-white px-4 py-2.5 rounded-lg shadow-sm disabled:opacity-50 text-sm transition"
          >
            <Save size={16} />
            {saving ? 'Sauvegarde...' : 'Tout sauvegarder'}
          </button>
        </div>
      </div>

      {/* Toast succès */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* CORRECTION : erreurs inline */}
      {errorMessages.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <p className="font-medium mb-2 flex items-center gap-2">
            <AlertCircle size={16} /> Erreurs lors de la sauvegarde :
          </p>
          <ul className="text-sm space-y-1">
            {errorMessages.map((e, i) => <li key={i}>• {e}</li>)}
          </ul>
        </div>
      )}

      {/* ── SECTION 1 : PROFIL ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <UserIcon size={18} className="text-gray-500" />
          <h2 className="text-lg font-semibold">Mon Profil</h2>
        </div>

        {user ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Votre nom"
                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full border rounded-lg p-2.5 bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">L'email est votre identifiant principal et ne peut pas être modifié ici.</p>
            </div>

            {/* CORRECTION : confirmation mot de passe + afficher/masquer */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <p className="text-sm font-medium text-gray-700">Changer le mot de passe</p>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nouveau mot de passe (min. 8 caractères)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-[#1A5276]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirmer le nouveau mot de passe"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276] ${
                  confirmPassword && newPassword !== confirmPassword
                    ? 'border-red-400 bg-red-50'
                    : ''
                }`}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Les mots de passe ne correspondent pas.</p>
              )}
              <p className="text-xs text-gray-400">Laissez vide pour ne pas modifier le mot de passe.</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg">
            <p className="text-sm">Aucun utilisateur connecté.</p>
          </div>
        )}
      </div>

      {/* ── SECTION 2 : PARAMÈTRES PAYS ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <Globe size={18} className="text-blue-500" />
          <h2 className="text-lg font-semibold">Taux d'échec par pays</h2>
        </div>

        {countrySettings.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun pays configuré.</p>
        ) : (
          <div className="space-y-4">
            {countrySettings.map(country => (
              <div key={country.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {COUNTRY_LABELS[country.country] ?? country.country}
                    {country.is_default && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        Défaut
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0" max="99" step="0.1"
                      // CORRECTION : validation entre 0 et 99
                      value={parseFloat((country.default_failure_rate * 100).toFixed(1))}
                      onChange={e => {
                        const val = Math.min(99, Math.max(0, Number(e.target.value)));
                        setCountrySettings(prev => prev.map(c =>
                          c.id === country.id
                            ? { ...c, default_failure_rate: val / 100 }
                            : c
                        ));
                      }}
                      className="w-24 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#1A5276]"
                    />
                    <span className="text-sm text-gray-500">% de taux d'échec moyen</span>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-2 border-t">
              Ces taux sont utilisés par défaut dans le Calculateur de Rentabilité.
            </p>
          </div>
        )}
      </div>

      {/* ── SECTION 3 : TEMPLATES WHATSAPP ──────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <MessageCircle size={18} className="text-green-600" />
          <h2 className="text-lg font-semibold">Modèles de messages WhatsApp</h2>
        </div>

        <div className="space-y-6">
          {/* Template confirmation commande */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmation de commande
            </label>
            <textarea
              rows={2}
              value={templates.whatsapp_order_message}
              onChange={e => setTemplates({ ...templates, whatsapp_order_message: e.target.value })}
              className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#1A5276]"
            />
            {/* CORRECTION : boutons d'insertion de variables */}
            <div className="flex gap-1 mt-1 flex-wrap">
              <span className="text-xs text-gray-400 mr-1">Insérer :</span>
              {['{client}', '{commande}', '{produit}'].map(v => (
                <button key={v} type="button"
                  onClick={() => insertVariable('whatsapp_order_message', v)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded font-mono transition"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Template suivi client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Suivi client / Fidélisation
            </label>
            <textarea
              rows={2}
              value={templates.whatsapp_customer_message}
              onChange={e => setTemplates({ ...templates, whatsapp_customer_message: e.target.value })}
              className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#1A5276]"
            />
            <div className="flex gap-1 mt-1 flex-wrap">
              <span className="text-xs text-gray-400 mr-1">Insérer :</span>
              {['{client}', '{produit}'].map(v => (
                <button key={v} type="button"
                  onClick={() => insertVariable('whatsapp_customer_message', v)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded font-mono transition"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Template livraison */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notification de livraison
            </label>
            <textarea
              rows={2}
              value={templates.whatsapp_delivery_message}
              onChange={e => setTemplates({ ...templates, whatsapp_delivery_message: e.target.value })}
              className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#1A5276]"
            />
            <div className="flex gap-1 mt-1 flex-wrap">
              <span className="text-xs text-gray-400 mr-1">Insérer :</span>
              {['{client}', '{commande}'].map(v => (
                <button key={v} type="button"
                  onClick={() => insertVariable('whatsapp_delivery_message', v)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded font-mono transition"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 4 : NOTIFICATIONS ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <Bell size={18} className="text-orange-500" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>

        <div className="space-y-4">
          {/* Toggle alertes stock bas */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-800 text-sm">Alertes stock bas</p>
              <p className="text-xs text-gray-500">Recevoir une alerte quand un produit atteint le seuil minimum</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={templates.low_stock_alert}
                onChange={e => setTemplates({ ...templates, low_stock_alert: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A5276]" />
            </label>
          </div>

          {/* Toggle notifications email */}
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="font-medium text-gray-800 text-sm">Notifications par email</p>
              <p className="text-xs text-gray-500">Recevoir un résumé hebdomadaire de vos performances</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={templates.email_notifications}
                onChange={e => setTemplates({ ...templates, email_notifications: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A5276]" />
            </label>
          </div>
        </div>
      </div>

      {/* Bouton sauvegarde bas de page */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 bg-[#1A5276] hover:bg-blue-900 text-white px-6 py-3 rounded-xl shadow-sm disabled:opacity-50 font-medium transition"
        >
          <Save size={16} />
          {saving ? 'Sauvegarde en cours...' : 'Tout sauvegarder'}
        </button>
      </div>

    </div>
  );
}