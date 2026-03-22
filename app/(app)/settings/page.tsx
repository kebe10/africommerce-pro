'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Settings, User, ShieldCheck, MessageCircle, Bell, 
  Save, CheckCircle, Key, Globe 
} from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // --- 1. PROFIL & AUTHENTIFICATION ---
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // --- 2. BUSINESS SETTINGS ---
  const [defaultFailureRate, setDefaultFailureRate] = useState(30);

  // --- 3. MESSAGES WHATSAPP ---
  const [templates, setTemplates] = useState({
    whatsapp_order_message: '',
    whatsapp_customer_message: '',
    whatsapp_delivery_message: ''
  });

  // --- 4. NOTIFICATIONS ---
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    low_stock_alert: true
  });

  useEffect(() => {
    fetchAllSettings();
    
    // Écouter les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setEmail(session.user.email || '');
        // Récupérer le nom depuis les métadonnées utilisateur (si existant)
        setFullName(session.user.user_metadata?.full_name || '');
      } else {
        setUser(null);
        setEmail('');
        setFullName('');
      }
    });

    // Vérifier l'utilisateur actuel au chargement
    checkUser();

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setEmail(user.email || '');
      setFullName(user.user_metadata?.full_name || '');
    }
    setLoading(false);
  }

  async function fetchAllSettings() {
    // Fetch App Settings
    const { data: appSettings } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (appSettings) {
      setTemplates({
        whatsapp_order_message: appSettings.whatsapp_order_message || '',
        whatsapp_customer_message: appSettings.whatsapp_customer_message || '',
        whatsapp_delivery_message: appSettings.whatsapp_delivery_message || ''
      });
      setNotifications({
        email_notifications: appSettings.email_notifications ?? true,
        low_stock_alert: appSettings.low_stock_alert ?? true
      });
    }

    // Fetch Country Settings
    const { data: countrySettings } = await supabase.from('country_settings').select('*').eq('is_default', true).single();
    if (countrySettings) setDefaultFailureRate(countrySettings.default_failure_rate * 100);
  }

  const handleSaveAll = async () => {
    setSaving(true);
    let errors = [];

    // 1. Mettre à jour le profil (Nom) si utilisateur connecté
    if (user && fullName !== user.user_metadata?.full_name) {
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
      if (error) errors.push("Nom: " + error.message);
    }

    // 2. Mettre à jour le mot de passe si rempli
    if (newPassword) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) errors.push("Mot de passe: " + error.message);
      else setNewPassword(''); // Clear field on success
    }

    // 3. Mettre à jour les paramètres de l'app
    const { error: appError } = await supabase
      .from('app_settings')
      .update({ ...templates, ...notifications })
      .eq('id', 1);
    if (appError) errors.push("App Settings: " + appError.message);

    // 4. Mettre à jour le taux par défaut
    await supabase
      .from('country_settings')
      .update({ default_failure_rate: defaultFailureRate / 100 })
      .eq('is_default', true);

    // Feedback utilisateur
    if (errors.length === 0) {
      setMessage('Tous les paramètres ont été sauvegardés !');
      setTimeout(() => setMessage(''), 3000);
    } else {
      alert("Erreurs: \n" + errors.join("\n"));
    }
    
    setSaving(false);
  };

  if (loading) return <div className="p-10 text-center">Chargement...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-500 text-sm">Gérez votre compte et vos préférences</p>
        </div>
        <button 
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 bg-[#1A5276] hover:bg-blue-900 text-white px-4 py-2.5 rounded-lg shadow-sm disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Sauvegarde...' : 'Tout Sauvegarder'}
        </button>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle size={18} />
          {message}
        </div>
      )}

      {/* SECTION 1 : PROFIL UTILISATEUR */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <User className="text-gray-500" />
          <h2 className="text-lg font-semibold">Mon Profil</h2>
        </div>
        
        {user ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom Complet</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border rounded-lg p-2.5"
                placeholder="Votre nom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                disabled // On ne peut pas changer l'email facilement sans vérification complexe
                value={email}
                className="w-full border rounded-lg p-2.5 bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">L'email est votre identifiant principal.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Changer le mot de passe</label>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  placeholder="Nouveau mot de passe"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 border rounded-lg p-2.5"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Laissez vide pour ne pas modifier.</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
            <p>Aucun utilisateur connecté.</p>
            <p className="text-sm mt-2">La gestion de profil sera active après la connexion.</p>
          </div>
        )}
      </div>

      {/* SECTION 2 : PARAMÈTRES BUSINESS */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <Globe className="text-blue-500" />
          <h2 className="text-lg font-semibold">Paramètres Business</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taux d'échec par défaut (%)</label>
            <input 
              type="number"
              value={defaultFailureRate}
              onChange={(e) => setDefaultFailureRate(Number(e.target.value))}
              className="w-full border rounded-lg p-2.5"
            />
            <p className="text-xs text-gray-400 mt-1">Utilisé par défaut dans le Calculateur.</p>
          </div>
        </div>
      </div>

      {/* SECTION 3 : MESSAGES WHATSAPP */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <MessageCircle className="text-green-600" />
          <h2 className="text-lg font-semibold">Modèles WhatsApp</h2>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation Commande</label>
            <textarea rows={2} value={templates.whatsapp_order_message} onChange={(e) => setTemplates({...templates, whatsapp_order_message: e.target.value})} className="w-full border rounded-lg p-3 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Variables: {`{client}`}, {`{commande}`}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Suivi Client</label>
            <textarea rows={2} value={templates.whatsapp_customer_message} onChange={(e) => setTemplates({...templates, whatsapp_customer_message: e.target.value})} className="w-full border rounded-lg p-3 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Livraison</label>
            <textarea rows={2} value={templates.whatsapp_delivery_message} onChange={(e) => setTemplates({...templates, whatsapp_delivery_message: e.target.value})} className="w-full border rounded-lg p-3 text-sm" />
          </div>
        </div>
      </div>

      {/* SECTION 4 : NOTIFICATIONS */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <Bell className="text-orange-500" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-gray-800">Alertes Stock Bas</p><p className="text-xs text-gray-500">Email quand un produit est en rupture</p></div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={notifications.low_stock_alert} onChange={(e) => setNotifications({...notifications, low_stock_alert: e.target.checked})} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A5276]"></div>
            </label>
          </div>
        </div>
      </div>

    </div>
  );
}