'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import {
  Lightbulb, AlertCircle, TrendingUp, Save,
  CheckCircle, History, Trash2, ChevronDown, ChevronUp,
  Info, ToggleLeft, ToggleRight
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  purchase_cost: number;
}

interface CountrySetting {
  country: string;
  default_failure_rate: number;
  is_default: boolean;
}

interface SavedCalculation {
  id: string;
  created_at: string;
  country: string;
  purchase_cost: number;
  packaging_cost: number;
  delivery_cost: number;
  failure_rate: number;
  ad_budget: number;
  orders_generated: number;
  return_cost: number;
  target_margin: number;
  real_cost: number;
  recommended_price: number;
  products: { name: string } | null;
}

// ── Constantes ────────────────────────────────────────────────────────────────
const COUNTRY_LABELS: Record<string, string> = {
  cote_divoire: "🇨🇮 Côte d'Ivoire",
  senegal:      '🇸🇳 Sénégal',
  cameroun:     '🇨🇲 Cameroun',
  other:        '🌍 Autre pays',
};

const safeFormat = (v: number) =>
  isFinite(v) && !isNaN(v) ? formatMoney(Math.round(v)) : '—';

export default function CalculatorPage() {

  // ── États ───────────────────────────────────────────────────────────────
  const [products, setProducts]               = useState<Product[]>([]);
  const [countrySettings, setCountrySettings] = useState<CountrySetting[]>([]);
  const [history, setHistory]                 = useState<SavedCalculation[]>([]);

  // Formulaire
  const [selectedProductId, setSelectedProductId] = useState<string>('manual');
  const [selectedCountry, setSelectedCountry]     = useState<string>('');
  const [purchaseCost, setPurchaseCost]           = useState<number>(12000);
  const [packagingCost, setPackagingCost]         = useState<number>(500);
  const [deliveryCost, setDeliveryCost]           = useState<number>(1500);
  const [failureRate, setFailureRate]             = useState<number>(0.40);
  const [adBudget, setAdBudget]                   = useState<number>(50000);
  const [ordersGenerated, setOrdersGenerated]     = useState<number>(20);
  const [returnCost, setReturnCost]               = useState<number>(1000);
  const [targetMargin, setTargetMargin]           = useState<number>(30);

  // Nouveau : Mode de calcul
  const [calculationMode, setCalculationMode] = useState<'simple' | 'precise'>('precise');

  // UI
  const [saved, setSaved]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  // ── Fetch données ───────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from('saved_calculations')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) console.error('Historique:', error.message);
    else if (data) setHistory(data as SavedCalculation[]);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: prods } = await supabase
        .from('products').select('id, name, purchase_cost').eq('status', 'active');
      if (prods) setProducts(prods);

      const { data: settings } = await supabase
        .from('country_settings').select('country, default_failure_rate, is_default');
      if (settings?.length) {
        setCountrySettings(settings);
        const def = settings.find(s => s.is_default) ?? settings[0];
        setSelectedCountry(def.country);
        setFailureRate(def.default_failure_rate);
      }

      await fetchHistory();
    };
    init();
  }, [fetchHistory]);

  // Pré-remplissage du coût d'achat depuis un produit
  useEffect(() => {
    if (selectedProductId !== 'manual') {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) setPurchaseCost(prod.purchase_cost);
    }
  }, [selectedProductId, products]);

  function handleCountryChange(country: string) {
    setSelectedCountry(country);
    const s = countrySettings.find(c => c.country === country);
    if (s) setFailureRate(s.default_failure_rate);
  }

  // ── Calculs améliorés ─────────────────────────────────────────────────────
  const results = useMemo(() => {
    const safeOrders = Math.max(ordersGenerated, 1);
    const safeFailureRate = Math.min(failureRate, 0.99);
    const tauxSucces = 1 - safeFailureRate;
    const adPerOrder = adBudget / safeOrders;

    let realCost: number;

    if (calculationMode === 'simple') {
      // Mode Simple (ancienne logique)
      const failedCost = deliveryCost * (safeFailureRate / tauxSucces);
      realCost = purchaseCost + packagingCost + deliveryCost + failedCost + adPerOrder + returnCost;
    } else {
      // Mode Précis - Amortissement correct sur les livraisons réussies
      const emballageAmorti = packagingCost / tauxSucces;
      const livraisonAmorti = deliveryCost / tauxSucces;
      const retourAmorti = (returnCost * safeFailureRate) / tauxSucces;

      realCost = purchaseCost + emballageAmorti + livraisonAmorti + retourAmorti + adPerOrder;
    }

    const safeMargin = Math.min(targetMargin, 99) / 100;
    const recommendedPrice = realCost / (1 - safeMargin);
    const optimalPrice = realCost / 0.50;
    const marginAmount = recommendedPrice - realCost;
    const naiveCost = purchaseCost + deliveryCost;

    return {
      realCost: Math.round(realCost),
      minPrice: Math.round(realCost),
      recommendedPrice: Math.round(recommendedPrice),
      optimalPrice: Math.round(optimalPrice),
      marginAmount: Math.round(marginAmount),
      adCostPerOrder: Math.round(adPerOrder),
      naiveCost: Math.round(naiveCost),
      unitsToBreakEven: marginAmount > 0 ? Math.ceil(adBudget / marginAmount) : null,
      tauxSucces: Math.round(tauxSucces * 100),
    };
  }, [purchaseCost, packagingCost, deliveryCost, failureRate, adBudget, ordersGenerated, returnCost, targetMargin, calculationMode]);

  // ── Sauvegarde ───────────────────────────────────────────────────────────
  async function saveCalculation() {
    setSaving(true);
    const { error } = await supabase.from('saved_calculations').insert({
      product_id:        selectedProductId !== 'manual' ? selectedProductId : null,
      country:           selectedCountry,
      purchase_cost:     purchaseCost,
      packaging_cost:    packagingCost,
      delivery_cost:     deliveryCost,
      failure_rate:      failureRate,
      ad_budget:         adBudget,
      orders_generated:  ordersGenerated,
      return_cost:       returnCost,
      target_margin:     targetMargin,
      real_cost:         results.realCost,
      recommended_price: results.recommendedPrice,
    });
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await fetchHistory();
    } else {
      console.error('Sauvegarde:', error.message);
    }
  }

  function loadCalculation(calc: SavedCalculation) {
    setPurchaseCost(calc.purchase_cost);
    setPackagingCost(calc.packaging_cost);
    setDeliveryCost(calc.delivery_cost);
    setFailureRate(calc.failure_rate);
    setAdBudget(calc.ad_budget);
    setOrdersGenerated(calc.orders_generated);
    setReturnCost(calc.return_cost);
    setTargetMargin(calc.target_margin);
    if (calc.country) setSelectedCountry(calc.country);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteCalculation(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from('saved_calculations').delete().eq('id', id);
    if (!error) setHistory(prev => prev.filter(c => c.id !== id));
    setDeletingId(null);
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">

      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Lightbulb className="text-[#E67E22]" size={32} />
          Calculateur de Rentabilité Intelligent
        </h1>
        <p className="text-gray-600 mt-2 text-lg">
          Calculez votre vrai prix de vente en tenant compte des échecs de livraison et de la publicité.
        </p>
      </div>

      {/* Toggle Mode Simple / Précis */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-wrap items-center gap-4">
        <span className="font-semibold text-gray-700">Mode de calcul :</span>
        <div className="flex border rounded-xl overflow-hidden">
          <button
            onClick={() => setCalculationMode('precise')}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${
              calculationMode === 'precise' 
                ? 'bg-[#1A5276] text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {calculationMode === 'precise' ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            Mode Précis (Recommandé)
          </button>
          <button
            onClick={() => setCalculationMode('simple')}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${
              calculationMode === 'simple' 
                ? 'bg-[#1A5276] text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Mode Simple
          </button>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-1.5">
          <Info size={18} className="text-[#1A5276]" />
          {calculationMode === 'precise' 
            ? "Amortissement réaliste sur les livraisons réussies uniquement" 
            : "Calcul simplifié (version précédente)"}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">

        {/* ==================== GAUCHE : PARAMÈTRES ==================== */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
          <h2 className="text-xl font-semibold border-b pb-4">Paramètres</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Produit</label>
            <select 
              value={selectedProductId} 
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-[#1A5276]"
            >
              <option value="manual">✏️ Saisie manuelle</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {countrySettings.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Pays de livraison</label>
              <select 
                value={selectedCountry} 
                onChange={e => handleCountryChange(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-[#1A5276]"
              >
                {countrySettings.map(s => (
                  <option key={s.country} value={s.country}>
                    {COUNTRY_LABELS[s.country] ?? s.country}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Le taux d'échec est mis à jour automatiquement selon le pays.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Coût d'achat (FCFA)", value: purchaseCost, setter: setPurchaseCost },
              { label: 'Coût emballage (FCFA)', value: packagingCost, setter: setPackagingCost },
              { label: 'Coût livraison (FCFA)', value: deliveryCost, setter: setDeliveryCost },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="block text-sm text-gray-600 mb-1">{label}</label>
                <input 
                  type="number" 
                  min="0" 
                  value={value}
                  onChange={e => setter(Math.max(0, Number(e.target.value)))}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-[#1A5276]"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm text-gray-600 mb-1">Taux d'échec (%)</label>
              <input 
                type="number" 
                min="0" 
                max="99" 
                step="0.1"
                value={parseFloat((failureRate * 100).toFixed(1))}
                onChange={e => setFailureRate(Math.min(99, Math.max(0, Number(e.target.value))) / 100)}
                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-[#1A5276]"
              />
              <p className="text-xs text-gray-500 mt-1">Moyenne réelle en Côte d'Ivoire : 25% – 40%</p>
            </div>
          </div>

          {/* Budget Publicitaire */}
          <div className="bg-gray-50 p-5 rounded-2xl border space-y-4">
            <h3 className="font-medium">Budget Publicitaire (Facebook Ads)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Budget total (FCFA)</label>
                <input type="number" value={adBudget} onChange={e => setAdBudget(Math.max(0, Number(e.target.value)))}
                  className="w-full border p-3 rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Commandes générées</label>
                <input type="number" min="1" value={ordersGenerated} 
                  onChange={e => setOrdersGenerated(Math.max(1, Number(e.target.value)))}
                  className="w-full border p-3 rounded-xl mt-1" />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              CAC calculé : <span className="font-bold">{safeFormat(results.adCostPerOrder)}</span> / commande
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Frais de retour estimés (FCFA)</label>
            <input 
              type="number" 
              min="0" 
              value={returnCost}
              onChange={e => setReturnCost(Math.max(0, Number(e.target.value)))}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-[#1A5276]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Marge cible : <span className="text-[#1A5276] font-bold">{targetMargin}%</span>
            </label>
            <input 
              type="range" 
              min="10" 
              max="60" 
              value={targetMargin}
              onChange={e => setTargetMargin(Number(e.target.value))}
              className="w-full accent-[#1A5276]"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10%</span><span>35%</span><span>60%</span>
            </div>
          </div>
        </div>

        {/* ==================== DROITE : RÉSULTATS ==================== */}
        <div className="space-y-6">

          {/* Décomposition du Coût Réel */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2">
              Décomposition du Coût Réel
              {calculationMode === 'precise' && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">Mode Précis</span>
              )}
            </h2>

            <div className="space-y-4 text-base">
              <div className="flex justify-between">
                <span className="text-gray-600">Coût d'achat</span>
                <span className="font-semibold">{safeFormat(purchaseCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Emballage</span>
                <span className="font-semibold">
                  {calculationMode === 'precise' 
                    ? `${safeFormat(packagingCost)} → ${safeFormat(packagingCost / (1 - failureRate))} (amorti)`
                    : safeFormat(packagingCost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Livraison sortante</span>
                <span className="font-semibold">
                  {calculationMode === 'precise' 
                    ? `${safeFormat(deliveryCost)} → ${safeFormat(deliveryCost / (1 - failureRate))} (amorti)`
                    : safeFormat(deliveryCost)}
                </span>
              </div>
              <div className="flex justify-between text-red-600 bg-red-50 p-3 rounded-xl">
                <span className="flex items-center gap-2">
                  <AlertCircle size={18} />
                  Coût échecs livraisons ({(failureRate * 100).toFixed(1)}%)
                </span>
                <span className="font-semibold">
                  {safeFormat(calculationMode === 'precise' 
                    ? (returnCost * failureRate) / (1 - failureRate) 
                    : deliveryCost * (failureRate / (1 - failureRate)))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Coût pub / commande</span>
                <span className="font-semibold">{safeFormat(results.adCostPerOrder)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frais de retour</span>
                <span className="font-semibold">{safeFormat(returnCost)}</span>
              </div>

              <div className="border-t pt-5 mt-3 flex justify-between text-xl font-bold text-[#1A5276]">
                <span>COÛT RÉEL PAR PRODUIT LIVRÉ</span>
                <span>{safeFormat(results.realCost)}</span>
              </div>
            </div>

            {/* Explication pédagogique */}
            {calculationMode === 'precise' && (
              <div className="mt-6 p-5 bg-blue-50 border border-blue-200 rounded-2xl text-sm leading-relaxed">
                <p className="font-semibold text-blue-900 mb-2">💡 Pourquoi ce calcul est plus fiable ?</p>
                <p className="text-blue-800">
                  En Côte d'Ivoire et en Afrique francophone, beaucoup de commandes échouent à la livraison (COD). 
                  Le <strong>Mode Précis</strong> amortit correctement tous les coûts (emballage, livraison et retours) 
                  uniquement sur les livraisons réussies ({results.tauxSucces}%). 
                  C'est la méthode la plus réaliste pour éviter les pertes.
                </p>
              </div>
            )}
          </div>

          {/* Recommandations de Prix */}
          <div className="bg-gradient-to-br from-[#1A5276] to-blue-800 p-8 rounded-3xl text-white shadow-xl">
            <h3 className="font-bold text-2xl mb-6 flex items-center gap-3">
              <TrendingUp size={26} /> Recommandations de Prix
            </h3>

            <div className="space-y-6">
              <div className="flex justify-between border-b border-white/30 pb-4">
                <div>
                  <div className="text-blue-200 text-sm">Minimum (Seuil de rentabilité)</div>
                  <div className="text-3xl font-bold mt-1">{safeFormat(results.minPrice)}</div>
                </div>
                <div className="text-right text-blue-200">Marge : 0%</div>
              </div>

              <div className="flex justify-between border-b border-white/30 pb-4 bg-white/10 -mx-8 px-8 py-5 rounded-2xl">
                <div>
                  <div className="text-[#E67E22] font-bold uppercase tracking-widest text-sm">⭐ Recommandé</div>
                  <div className="text-4xl font-bold mt-1">{safeFormat(results.recommendedPrice)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">Bénéfice : {safeFormat(results.marginAmount)}</div>
                  <div className="text-blue-200 text-sm">Marge : {targetMargin}%</div>
                </div>
              </div>

              <div className="flex justify-between">
                <div>
                  <div className="text-blue-200 text-sm">Optimal (Croissance rapide)</div>
                  <div className="text-3xl font-bold mt-1">{safeFormat(results.optimalPrice)}</div>
                </div>
                <div className="text-blue-200">Marge : 50%</div>
              </div>
            </div>
          </div>

          {/* Alerte risque de perte */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-2xl text-amber-800">
            <p className="font-bold">
              Sans cet outil, vous auriez estimé le coût à : <span className="line-through">{safeFormat(results.naiveCost)}</span>
            </p>
            <p className="mt-1">
              Risque de perte par unité : <span className="font-bold text-red-600">{safeFormat(results.realCost - results.naiveCost)}</span>
            </p>
          </div>

          {/* Analyse Publicité */}
          <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
            <h4 className="font-semibold text-[#1A5276] mb-3">📊 Analyse Publicité</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Coût d'acquisition client (CAC)</span>
                <span className="font-bold">{safeFormat(results.adCostPerOrder)}</span>
              </div>
              {results.unitsToBreakEven && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Unités à vendre pour rentabiliser la pub</span>
                  <span className="font-bold text-[#1A5276]">{results.unitsToBreakEven} unités</span>
                </div>
              )}
            </div>
          </div>

          {/* Bouton Sauvegarder */}
          <button 
            onClick={saveCalculation} 
            disabled={saving || saved}
            className={`w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all ${
              saved 
                ? 'bg-green-500 text-white' 
                : 'bg-[#1A5276] hover:bg-blue-800 text-white'
            }`}
          >
            {saved ? (
              <><CheckCircle size={22} /> Calcul sauvegardé avec succès !</>
            ) : saving ? (
              'Sauvegarde en cours...'
            ) : (
              <><Save size={22} /> Sauvegarder ce calcul</>
            )}
          </button>
        </div>
      </div>

      {/* Section Historique (tu peux garder ton code actuel ici) */}
      {/* ... (je ne l'ai pas recopié pour éviter de surcharger, mais il reste compatible) */}

    </div>
  );
}