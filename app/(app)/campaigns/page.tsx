'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import {
  Plus, X, TrendingUp, Users, DollarSign, Target,
  AlertCircle, Edit2, Trash2, Search, Download,
  CheckCircle, XCircle, Sparkles, Loader2
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Campaign = {
  id: string;
  name: string;
  platform: string;
  budget_spent: number;
  orders_generated: number;
  revenue_generated: number | null; // CORRECTION : champ optionnel pour ROAS précis
  start_date: string;
  end_date: string | null;
};

// CORRECTION : type explicite pour la réponse IA
type AIResult = {
  targeting: {
    age_min: number;
    age_max: number;
    gender: string;
    locations: string[];
    interests: string[];
    behaviors: string[];
  };
  ad_creative: {
    primary_text: string;
    headline: string;
    description: string;
    call_to_action: string;
    visual_description: string;
  };
  campaign_setup: {
    objective: string;
    budget_split: {
      testing_phase: string;
      scaling_phase: string;
    };
  };
};

type FormData = {
  name: string;
  platform: string;
  budget_spent: number;
  orders_generated: number;
  start_date: string;
  end_date: string;
};

// ── Constantes ────────────────────────────────────────────────────────────────

// CORRECTION : couleurs plateforme centralisées + TikTok
const PLATFORM_COLORS: Record<string, string> = {
  facebook:  'text-blue-600',
  instagram: 'text-pink-600',
  tiktok:    'text-gray-900 font-black',
  other:     'text-gray-500',
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook:  'Facebook',
  instagram: 'Instagram',
  tiktok:    'TikTok',
  other:     'Autre',
};

const EMPTY_FORM: FormData = {
  name: '',
  platform: 'facebook',
  budget_spent: 0,
  orders_generated: 0,
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function CampaignsPage() {

  // — Données
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [globalAOV, setGlobalAOV] = useState<number>(15000);

  // — UI
  const [loading, setLoading]               = useState(true);
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [isEditing, setIsEditing]           = useState(false);
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [formData, setFormData]             = useState<FormData>(EMPTY_FORM);

  // — Filtres
  const [searchQuery, setSearchQuery]       = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');

  // — IA
  const [isAIModalOpen, setIsAIModalOpen]   = useState(false);
  const [aiLoading, setAiLoading]           = useState(false);
  const [aiError, setAiError]               = useState<string | null>(null);
  const [aiResult, setAiResult]             = useState<AIResult | null>(null);
  const [copied, setCopied]                 = useState(false);
  const [aiFormData, setAiFormData]         = useState({
    productName: '',
    productDescription: '',
    budget: '50000',
    country: "Côte d'Ivoire",
  });

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    // CORRECTION : fetches en parallèle
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCampaigns(), calculateAOV()]);
      setLoading(false);
    };
    init();
  }, []);

  async function fetchCampaigns() {
    // CORRECTION : gestion d'erreur explicite
    const { data, error } = await supabase
      .from('ad_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('Campagnes:', error.message);
    else if (data) setCampaigns(data as Campaign[]);
  }

  async function calculateAOV() {
    // CORRECTION : gestion d'erreur explicite
    const { data, error } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('status', 'delivered');
    if (error) { console.error('AOV:', error.message); return; }
    if (data && data.length > 0) {
      const total = data.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
      setGlobalAOV(total / data.length);
    }
  }

  // ── Calculs ───────────────────────────────────────────────────────────────

  // CORRECTION : filteredCampaigns dans useMemo
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchSearch   = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPlatform = platformFilter === 'all' || c.platform === platformFilter;
      return matchSearch && matchPlatform;
    });
  }, [campaigns, searchQuery, platformFilter]);

  // CORRECTION : ROAS global ajouté aux stats
  const stats = useMemo(() => {
    const totalBudget  = campaigns.reduce((sum, c) => sum + c.budget_spent, 0);
    const totalOrders  = campaigns.reduce((sum, c) => sum + c.orders_generated, 0);
    const totalRevenue = campaigns.reduce((sum, c) =>
      sum + (c.revenue_generated ?? c.orders_generated * globalAOV), 0);
    const avgCAC     = totalOrders > 0 ? totalBudget / totalOrders : 0;
    const globalROAS = totalBudget > 0 ? totalRevenue / totalBudget : 0;
    return { totalBudget, totalOrders, avgCAC, globalROAS };
  }, [campaigns, globalAOV]);

  function getROASIndicator(roas: number) {
    if (roas >= 2) return { color: 'text-green-600 bg-green-100', label: 'Excellent' };
    if (roas >= 1) return { color: 'text-orange-600 bg-orange-100', label: 'Passable' };
    return { color: 'text-red-600 bg-red-100', label: 'Non rentable' };
  }

  // CORRECTION : isActive sans bug de timezone
  function isActive(camp: Campaign): boolean {
    const today = new Date().toISOString().split('T')[0];
    return !camp.end_date || camp.end_date >= today;
  }

  // ── Actions campagnes ─────────────────────────────────────────────────────

  function openAddModal() {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  }

  function openEditModal(campaign: Campaign) {
    setFormData({
      name:             campaign.name,
      platform:         campaign.platform,
      budget_spent:     campaign.budget_spent,
      orders_generated: campaign.orders_generated,
      start_date:       campaign.start_date,
      end_date:         campaign.end_date || '',
    });
    setIsEditing(true);
    setEditingId(campaign.id);
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Vous devez être connecté'); return; }

    let error;
    if (isEditing && editingId) {
      ({ error } = await supabase.from('ad_campaigns').update(formData).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('ad_campaigns').insert([{ ...formData, user_id: user.id }]));
    }

    if (error) alert('Erreur : ' + error.message);
    else { setIsModalOpen(false); fetchCampaigns(); }
  }

  // CORRECTION : handleDelete avec gestion d'erreur
  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette campagne ?')) return;
    const { error } = await supabase.from('ad_campaigns').delete().eq('id', id);
    if (error) alert('Erreur suppression : ' + error.message);
    else setCampaigns(prev => prev.filter(c => c.id !== id));
  }

  // ── Actions IA ────────────────────────────────────────────────────────────

  async function handleAIGenerate() {
    // CORRECTION : erreur inline au lieu d'alert()
    if (!aiFormData.productName || !aiFormData.budget) {
      setAiError('Remplissez le nom du produit et le budget.');
      return;
    }
    setAiError(null);
    setAiLoading(true);
    setAiResult(null);

    try {
      const res = await fetch('/api/ai-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiFormData),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiResult(data as AIResult);
    } catch (err: unknown) {
      setAiError('Erreur IA : ' + (err instanceof Error ? err.message : 'Inconnue'));
    } finally {
      setAiLoading(false);
    }
  }

  // CORRECTION : copie JSON avec feedback visuel
  async function handleCopyJSON() {
    if (!aiResult) return;
    await navigator.clipboard.writeText(JSON.stringify(aiResult, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Export CSV ────────────────────────────────────────────────────────────

  function exportToCSV() {
    if (filteredCampaigns.length === 0) { alert('Aucune donnée à exporter.'); return; }
    const headers = ['Nom', 'Plateforme', 'Budget (FCFA)', 'Commandes', 'CAC (FCFA)', 'ROAS', 'Statut'];
    const rows = filteredCampaigns.map(c => {
      const cac  = c.orders_generated > 0 ? c.budget_spent / c.orders_generated : 0;
      const rev  = c.revenue_generated ?? c.orders_generated * globalAOV;
      const roas = c.budget_spent > 0 ? rev / c.budget_spent : 0;
      return [
        c.name, c.platform, c.budget_spent,
        c.orders_generated, Math.round(cac), roas.toFixed(2),
        isActive(c) ? 'Active' : 'Terminée',
      ];
    });
    const csv  = '\uFEFF' + headers.join(';') + '\n' + rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href     = URL.createObjectURL(blob);
    link.download = `campagnes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campagnes Publicitaires</h1>
          <p className="text-gray-500 text-sm">Analyse de rentabilité (ROAS & CAC)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg shadow-sm text-sm font-medium transition"
          >
            <Sparkles size={16} /> IA Planificateur
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-[#1A5276] hover:bg-blue-900 text-white px-4 py-2.5 rounded-lg shadow-sm text-sm font-medium transition"
          >
            <Plus size={16} /> Nouvelle Campagne
          </button>
        </div>
      </div>

      {/* KPIs — CORRECTION : ROAS global ajouté */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600 shrink-0"><DollarSign size={20} /></div>
          <div>
            <p className="text-xs text-gray-500">Budget Total</p>
            <p className="text-lg font-bold text-gray-900">{formatMoney(stats.totalBudget)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 rounded-lg text-purple-600 shrink-0"><Users size={20} /></div>
          <div>
            <p className="text-xs text-gray-500">Commandes Générées</p>
            <p className="text-lg font-bold text-gray-900">{stats.totalOrders}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
          <div className="p-2.5 bg-orange-100 rounded-lg text-orange-600 shrink-0"><Target size={20} /></div>
          <div>
            <p className="text-xs text-gray-500">CAC Moyen</p>
            <p className="text-lg font-bold text-gray-900">{formatMoney(stats.avgCAC)}</p>
          </div>
        </div>
        {/* CORRECTION : ROAS global */}
        <div className={`p-4 rounded-xl shadow-sm border flex items-center gap-3 ${
          stats.globalROAS >= 2 ? 'bg-green-50 border-green-200' :
          stats.globalROAS >= 1 ? 'bg-orange-50 border-orange-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className={`p-2.5 rounded-lg shrink-0 ${
            stats.globalROAS >= 2 ? 'bg-green-100 text-green-600' :
            stats.globalROAS >= 1 ? 'bg-orange-100 text-orange-600' :
            'bg-red-100 text-red-600'
          }`}>
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">ROAS Global</p>
            <p className={`text-lg font-bold ${
              stats.globalROAS >= 2 ? 'text-green-700' :
              stats.globalROAS >= 1 ? 'text-orange-700' : 'text-red-700'
            }`}>
              {stats.globalROAS.toFixed(2)}x
            </p>
          </div>
        </div>
      </div>

      {/* Info AOV */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <div>
          <span className="font-bold">Calcul du ROAS : </span>
          Basé sur votre panier moyen de{' '}
          <span className="font-bold">{formatMoney(globalAOV)}</span>{' '}
          (calculé sur vos commandes livrées).
        </div>
      </div>

      {/* Filtres + Export */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher une campagne..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
          />
        </div>
        <select
          value={platformFilter}
          onChange={e => setPlatformFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 bg-white text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
        >
          <option value="all">Toutes plateformes</option>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm transition whitespace-nowrap"
        >
          <Download size={16} /> Exporter CSV
        </button>
      </div>

      {/* Tableau campagnes */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
              <tr>
                <th className="p-4 text-left">Campagne</th>
                <th className="p-4 text-left">Statut</th>
                <th className="p-4 text-left">Plateforme</th>
                <th className="p-4 text-right">Budget</th>
                <th className="p-4 text-right">Commandes</th>
                <th className="p-4 text-right">CAC</th>
                <th className="p-4 text-center">ROAS</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <div className="space-y-3 animate-pulse">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-12 text-gray-400">
                    <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune campagne trouvée</p>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map(camp => {
                  const cac        = camp.orders_generated > 0 ? camp.budget_spent / camp.orders_generated : 0;
                  const revenue    = camp.revenue_generated ?? camp.orders_generated * globalAOV;
                  const roas       = camp.budget_spent > 0 ? revenue / camp.budget_spent : 0;
                  const roasStatus = getROASIndicator(roas);
                  const active     = isActive(camp);

                  return (
                    <tr key={camp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">{camp.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Début : {new Date(camp.start_date).toLocaleDateString('fr-FR')}
                          {camp.end_date && ` · Fin : ${new Date(camp.end_date).toLocaleDateString('fr-FR')}`}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                          {active ? 'Active' : 'Terminée'}
                        </span>
                      </td>
                      {/* CORRECTION : couleur plateforme via map */}
                      <td className="p-4">
                        <span className={`text-xs font-bold uppercase ${
                          PLATFORM_COLORS[camp.platform] ?? 'text-gray-500'
                        }`}>
                          {PLATFORM_LABELS[camp.platform] ?? camp.platform}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono">{formatMoney(camp.budget_spent)}</td>
                      <td className="p-4 text-right font-medium">{camp.orders_generated}</td>
                      <td className="p-4 text-right font-mono text-gray-600">{formatMoney(cac)}</td>
                      <td className="p-4 text-center">
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-sm ${roasStatus.color}`}>
                          <TrendingUp size={13} />
                          {roas.toFixed(2)}x
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{roasStatus.label}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(camp)}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-blue-600 transition"
                            title="Modifier"
                          >
                            <Edit2 size={15} />
                          </button>
                          {/* CORRECTION : handleDelete avec feedback erreur */}
                          <button
                            onClick={() => handleDelete(camp.id)}
                            className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-600 transition"
                            title="Supprimer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL AJOUT / MODIFICATION ──────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">{isEditing ? 'Modifier la campagne' : 'Nouvelle Campagne'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-gray-500 transition">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la campagne</label>
                <input
                  type="text" required value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Promo Crème Éclat Août"
                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plateforme</label>
                <select
                  value={formData.platform}
                  onChange={e => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#1A5276]"
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget dépensé (FCFA)</label>
                  <input
                    type="number" required min="0" value={formData.budget_spent}
                    onChange={e => setFormData({ ...formData, budget_spent: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commandes générées</label>
                  <input
                    type="number" required min="0" value={formData.orders_generated}
                    onChange={e => setFormData({ ...formData, orders_generated: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                  <input
                    type="date" required value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date fin (optionnel)</label>
                  <input
                    type="date" value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                  Annuler
                </button>
                <button type="submit"
                  className="px-6 py-2.5 bg-[#E67E22] text-white rounded-lg hover:bg-orange-600 font-medium transition">
                  {isEditing ? 'Mettre à jour' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL IA ────────────────────────────────────────────────────────── */}
      {isAIModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="text-purple-600" size={18} />
                <h2 className="text-lg font-bold">Planificateur IA de Campagne</h2>
              </div>
              <button onClick={() => setIsAIModalOpen(false)} className="text-gray-300 hover:text-gray-500 transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* Formulaire IA */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Nom du Produit *</label>
                  <input
                    type="text"
                    placeholder="Ex: Crème éclaircissante 7 jours"
                    value={aiFormData.productName}
                    onChange={e => { setAiFormData({ ...aiFormData, productName: e.target.value }); setAiError(null); }}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description courte</label>
                  <textarea
                    rows={2}
                    placeholder="Points forts, avantages..."
                    value={aiFormData.productDescription}
                    onChange={e => setAiFormData({ ...aiFormData, productDescription: e.target.value })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Budget (FCFA) *</label>
                  <input
                    type="number" min="0"
                    value={aiFormData.budget}
                    onChange={e => { setAiFormData({ ...aiFormData, budget: e.target.value }); setAiError(null); }}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pays Cible</label>
                  <select
                    value={aiFormData.country}
                    onChange={e => setAiFormData({ ...aiFormData, country: e.target.value })}
                    className="w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option>Côte d'Ivoire</option>
                    <option>Sénégal</option>
                    <option>Cameroun</option>
                    <option>Benin</option>
                  </select>
                </div>
              </div>

              {/* CORRECTION : erreur IA inline */}
              {aiError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={14} /> {aiError}
                </div>
              )}

              <button
                onClick={handleAIGenerate}
                disabled={aiLoading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition"
              >
                {aiLoading
                  ? <><Loader2 size={16} className="animate-spin" /> Génération en cours...</>
                  : <><Sparkles size={16} /> Générer le Plan Complet</>
                }
              </button>

              {/* Résultat IA */}
              {aiResult && (
                <div className="space-y-5 border-t pt-5">
                  <h3 className="font-bold text-lg">🚀 Plan de Campagne Généré</h3>

                  {/* Ciblage */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Users size={15} /> 🎯 Ciblage Détaillé
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500 text-xs block">Âge</span><span className="font-medium">{aiResult.targeting?.age_min} – {aiResult.targeting?.age_max} ans</span></div>
                      <div><span className="text-gray-500 text-xs block">Genre</span><span className="font-medium">{aiResult.targeting?.gender}</span></div>
                      <div><span className="text-gray-500 text-xs block">Localisation</span><span className="font-medium">{aiResult.targeting?.locations?.join(', ')}</span></div>
                      <div><span className="text-gray-500 text-xs block">Intérêts</span><span className="font-medium">{aiResult.targeting?.interests?.join(', ')}</span></div>
                      <div className="md:col-span-2"><span className="text-gray-500 text-xs block">Comportements</span><span className="font-medium text-blue-700">{aiResult.targeting?.behaviors?.join(', ')}</span></div>
                    </div>
                  </div>

                  {/* Contenu publicitaire */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold mb-3 text-blue-800 text-sm">📝 Contenu Publicitaire (Prêt à copier)</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-white p-3 rounded border">
                        <span className="text-xs text-gray-400 block mb-1">Texte Principal</span>
                        <p className="font-medium">{aiResult.ad_creative?.primary_text}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-3 rounded border">
                          <span className="text-xs text-gray-400 block mb-1">Titre</span>
                          <p className="font-bold">{aiResult.ad_creative?.headline}</p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <span className="text-xs text-gray-400 block mb-1">Description</span>
                          <p>{aiResult.ad_creative?.description}</p>
                        </div>
                      </div>
                      <span className="inline-block bg-white px-3 py-1 rounded-full border text-xs font-bold text-green-700">
                        {aiResult.ad_creative?.call_to_action}
                      </span>
                    </div>
                  </div>

                  {/* Idée visuelle */}
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-semibold mb-2 text-orange-800 text-sm">🎨 Idée Visuelle</h4>
                    <p className="text-sm">{aiResult.ad_creative?.visual_description}</p>
                  </div>

                  {/* Configuration */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold mb-2 text-green-800 text-sm">⚙️ Configuration Campagne</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Objectif :</strong> {aiResult.campaign_setup?.objective}</p>
                      <p><strong>Phase test :</strong> {aiResult.campaign_setup?.budget_split?.testing_phase}</p>
                      <p><strong>Phase scale :</strong> {aiResult.campaign_setup?.budget_split?.scaling_phase}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {/* CORRECTION : feedback visuel sur copie JSON */}
                    <button
                      onClick={handleCopyJSON}
                      className={`flex-1 py-2 border rounded-lg text-sm transition flex items-center justify-center gap-2 ${
                        copied ? 'bg-green-50 border-green-300 text-green-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      {copied ? <><CheckCircle size={14} /> Copié !</> : 'Copier le JSON'}
                    </button>
                    <button
                      onClick={() => setIsAIModalOpen(false)}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}