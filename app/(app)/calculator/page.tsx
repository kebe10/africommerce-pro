'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import { Lightbulb, AlertCircle, TrendingUp, Save, CheckCircle } from 'lucide-react';

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

// ── Constantes ────────────────────────────────────────────────────────────────

// CORRECTION : labels pays en français
const COUNTRY_LABELS: Record<string, string> = {
  cote_divoire: "🇨🇮 Côte d'Ivoire (30%)",
  senegal:      '🇸🇳 Sénégal (25%)',
  cameroun:     '🇨🇲 Cameroun (35%)',
  other:        '🌍 Autre pays',
};

// ── Helper affichage sécurisé ─────────────────────────────────────────────────

// CORRECTION : protège contre NaN et Infinity
const safeFormat = (v: number) =>
  isFinite(v) && !isNaN(v) ? formatMoney(Math.round(v)) : '—';

// ── Composant ─────────────────────────────────────────────────────────────────

export default function CalculatorPage() {

  // — State données
  const [products, setProducts]             = useState<Product[]>([]);
  const [countrySettings, setCountrySettings] = useState<CountrySetting[]>([]);

  // — State formulaire
  const [selectedProductId, setSelectedProductId] = useState<string>('manual');
  const [selectedCountry, setSelectedCountry]     = useState<string>('');
  const [purchaseCost, setPurchaseCost]           = useState<number>(0);
  const [packagingCost, setPackagingCost]         = useState<number>(500);
  const [deliveryCost, setDeliveryCost]           = useState<number>(1500);
  const [failureRate, setFailureRate]             = useState<number>(0.30);
  const [adBudget, setAdBudget]                   = useState<number>(50000);
  const [ordersGenerated, setOrdersGenerated]     = useState<number>(20);
  const [returnCost, setReturnCost]               = useState<number>(0);
  const [targetMargin, setTargetMargin]           = useState<number>(30);

  // — State UI
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Fetch initial ────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {

      // CORRECTION : gestion d'erreur explicite sur les produits
      const { data: prods, error: prodsError } = await supabase
        .from('products')
        .select('id, name, purchase_cost')
        .eq('status', 'active');
      if (prodsError) console.error('Produits:', prodsError.message);
      else if (prods) setProducts(prods);

      // CORRECTION : charger TOUS les pays, pas seulement le défaut
      const { data: settings, error: settingsError } = await supabase
        .from('country_settings')
        .select('country, default_failure_rate, is_default');
      if (settingsError) {
        console.error('Paramètres pays:', settingsError.message);
      } else if (settings && settings.length > 0) {
        setCountrySettings(settings);
        // Appliquer le pays par défaut au chargement
        const def = settings.find(s => s.is_default) ?? settings[0];
        setSelectedCountry(def.country);
        setFailureRate(def.default_failure_rate);
      }
    };

    fetchData();
  }, []);

  // ── Pré-remplissage produit sélectionné ──────────────────────────────────────

  useEffect(() => {
    if (selectedProductId !== 'manual') {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) setPurchaseCost(prod.purchase_cost);
    }
  }, [selectedProductId, products]);

  // ── Changement de pays → mise à jour taux d'échec ────────────────────────────

  // CORRECTION : sélecteur de pays fonctionnel
  function handleCountryChange(country: string) {
    setSelectedCountry(country);
    const setting = countrySettings.find(s => s.country === country);
    if (setting) setFailureRate(setting.default_failure_rate);
  }

  // ── Calculs ──────────────────────────────────────────────────────────────────

  const results = useMemo(() => {
    const safeOrders = ordersGenerated > 0 ? ordersGenerated : 1;

    // CORRECTION : protéger contre failureRate >= 1 (division par zéro)
    const safeFailureRate = Math.min(failureRate, 0.99);
    const failedDeliveriesCost = deliveryCost * (safeFailureRate / (1 - safeFailureRate));
    const adCostPerOrder       = adBudget / safeOrders;

    const realCost = purchaseCost + packagingCost + deliveryCost
                   + failedDeliveriesCost + adCostPerOrder + returnCost;

    // CORRECTION : protéger contre targetMargin >= 100 (Infinity)
    const safeMargin       = Math.min(targetMargin, 99) / 100;
    const minPrice         = realCost;
    const recommendedPrice = realCost / (1 - safeMargin);
    const optimalPrice     = realCost / (1 - 0.50);

    // Coût naïf = ce que l'e-commerçant calcule sans l'outil
    const naiveCost        = purchaseCost + deliveryCost;

    // CAC et seuil de rentabilité pub
    const cac              = adCostPerOrder;
    const marginAmount     = recommendedPrice - realCost;
    const unitsToBreakEven = marginAmount > 0
      ? Math.ceil(adBudget / marginAmount)
      : null;

    return {
      failedDeliveriesCost: isNaN(failedDeliveriesCost) ? 0 : failedDeliveriesCost,
      adCostPerOrder,
      realCost,
      minPrice,
      recommendedPrice,
      optimalPrice,
      naiveCost,
      cac,
      marginAmount,
      unitsToBreakEven,
    };
  }, [
    purchaseCost, packagingCost, deliveryCost,
    failureRate, adBudget, ordersGenerated,
    returnCost, targetMargin,
  ]);

  // ── Sauvegarder le calcul ────────────────────────────────────────────────────

  // CORRECTION : bouton sauvegarder manquant dans la version originale
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
      real_cost:         Math.round(results.realCost),
      recommended_price: Math.round(results.recommendedPrice),
    });

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      console.error('Sauvegarde:', error.message);
    }
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto">

      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Lightbulb className="text-[#E67E22]" />
          Calculateur de Rentabilité Intelligent
        </h1>
        <p className="text-gray-500 mt-1">
          Calculez votre vrai prix de vente en tenant compte des échecs de livraison et de la publicité.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">

        {/* ── PANNEAU GAUCHE : Paramètres ─────────────────────────────────── */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
          <h2 className="text-lg font-semibold border-b pb-3">Paramètres</h2>

          {/* Produit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produit</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full border-gray-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-[#1A5276]"
            >
              <option value="manual">✏️ Saisie manuelle</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* CORRECTION : sélecteur de pays fonctionnel */}
          {countrySettings.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pays de livraison
              </label>
              <select
                value={selectedCountry}
                onChange={e => handleCountryChange(e.target.value)}
                className="w-full border-gray-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-[#1A5276]"
              >
                {countrySettings.map(s => (
                  <option key={s.country} value={s.country}>
                    {COUNTRY_LABELS[s.country] ?? s.country}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Le taux d'échec est mis à jour automatiquement selon le pays.
              </p>
            </div>
          )}

          {/* Coûts de base */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Coût d'achat (FCFA)</label>
              {/* CORRECTION : min="0" sur tous les inputs numériques */}
              <input
                type="number" min="0" value={purchaseCost}
                onChange={e => setPurchaseCost(Math.max(0, Number(e.target.value)))}
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-[#1A5276]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Coût emballage (FCFA)</label>
              <input
                type="number" min="0" value={packagingCost}
                onChange={e => setPackagingCost(Math.max(0, Number(e.target.value)))}
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-[#1A5276]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Coût livraison (FCFA)</label>
              <input
                type="number" min="0" value={deliveryCost}
                onChange={e => setDeliveryCost(Math.max(0, Number(e.target.value)))}
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-[#1A5276]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Taux d'échec (%)
              </label>
              {/* CORRECTION : affichage arrondi pour éviter les flottants parasites */}
              <input
                type="number" min="0" max="99" step="0.1"
                value={parseFloat((failureRate * 100).toFixed(1))}
                onChange={e => setFailureRate(
                  Math.min(99, Math.max(0, Number(e.target.value))) / 100
                )}
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-[#1A5276]"
              />
            </div>
          </div>

          {/* Budget publicitaire */}
          <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
            <h3 className="font-medium text-sm">Budget Publicitaire (Facebook Ads)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Budget total (FCFA)</label>
                <input
                  type="number" min="0" value={adBudget}
                  onChange={e => setAdBudget(Math.max(0, Number(e.target.value)))}
                  className="w-full border p-2 rounded-lg bg-white focus:ring-2 focus:ring-[#1A5276]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Commandes générées</label>
                <input
                  type="number" min="1" value={ordersGenerated}
                  onChange={e => setOrdersGenerated(Math.max(1, Number(e.target.value)))}
                  className={`w-full border p-2 rounded-lg bg-white focus:ring-2 focus:ring-[#1A5276] ${
                    ordersGenerated <= 0 ? 'border-red-400' : ''
                  }`}
                />
                {/* CORRECTION : message de validation visible */}
                {ordersGenerated <= 0 && (
                  <p className="text-xs text-red-500 mt-1">Entrez au moins 1 commande</p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400">
              CAC calculé : <span className="font-semibold text-gray-600">
                {safeFormat(results.cac)} / commande
              </span>
            </p>
          </div>

          {/* Frais de retour */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Frais de retour estimés (FCFA)
            </label>
            <input
              type="number" min="0" value={returnCost}
              onChange={e => setReturnCost(Math.max(0, Number(e.target.value)))}
              className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-[#1A5276]"
            />
          </div>

          {/* Marge cible */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Marge cible souhaitée :
              <span className="font-bold text-[#1A5276] ml-1">{targetMargin}%</span>
            </label>
            <input
              type="range" min="10" max="60" value={targetMargin}
              onChange={e => setTargetMargin(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1A5276]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10%</span><span>35%</span><span>60%</span>
            </div>
          </div>
        </div>

        {/* ── PANNEAU DROIT : Résultats ────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Décomposition des coûts */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold border-b pb-3 mb-4">
              Décomposition du Coût Réel
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Coût d'achat</span>
                <span className="font-mono font-medium">{safeFormat(purchaseCost)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Emballage</span>
                <span className="font-mono font-medium">{safeFormat(packagingCost)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Livraison</span>
                <span className="font-mono font-medium">{safeFormat(deliveryCost)}</span>
              </div>

              {/* Coût des échecs — ligne mise en évidence */}
              <div className="flex justify-between text-red-600 bg-red-50 px-3 py-2 rounded-lg font-medium">
                <span className="flex items-center gap-1">
                  <AlertCircle size={14} />
                  Coût échecs livraisons
                  <span className="text-xs font-normal text-red-400">
                    (taux {parseFloat((failureRate * 100).toFixed(1))}%)
                  </span>
                </span>
                <span className="font-mono">{safeFormat(results.failedDeliveriesCost)}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-gray-600">Coût pub / commande</span>
                <span className="font-mono font-medium">{safeFormat(results.adCostPerOrder)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Frais de retour</span>
                <span className="font-mono font-medium">{safeFormat(returnCost)}</span>
              </div>

              <div className="border-t pt-3 mt-2 flex justify-between text-base font-bold text-[#1A5276]">
                <span>COÛT RÉEL PAR PRODUIT LIVRÉ</span>
                <span className="text-lg">{safeFormat(results.realCost)}</span>
              </div>
            </div>
          </div>

          {/* Recommandations de prix */}
          <div className="bg-gradient-to-br from-[#1A5276] to-blue-800 p-6 rounded-xl text-white shadow-lg">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={18} /> Recommandations de Prix
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-white/20 pb-3">
                <div>
                  <div className="text-xs text-blue-200">Minimum (Seuil de rentabilité)</div>
                  <div className="text-xl font-bold">{safeFormat(results.minPrice)}</div>
                </div>
                <div className="text-xs text-blue-200">Marge : 0%</div>
              </div>

              <div className="flex justify-between items-end border-b border-white/20 pb-3 bg-white/10 -mx-6 px-6 py-3 rounded">
                <div>
                  <div className="text-xs text-[#E67E22] font-bold uppercase tracking-wide">
                    ⭐ Recommandé
                  </div>
                  <div className="text-2xl font-bold">{safeFormat(results.recommendedPrice)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">
                    Bénéfice : {safeFormat(results.marginAmount)}
                  </div>
                  <div className="text-xs text-blue-200">Marge : {targetMargin}%</div>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs text-blue-200">Optimal (Croissance rapide)</div>
                  <div className="text-xl font-bold">{safeFormat(results.optimalPrice)}</div>
                </div>
                <div className="text-xs text-blue-200">Marge : 50%</div>
              </div>
            </div>
          </div>

          {/* Encart "sans cet outil" */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 text-amber-800 text-sm rounded-r-lg">
            <p className="font-bold mb-1">
              Sans cet outil, vous auriez estimé le coût à :{' '}
              <span className="line-through">{safeFormat(results.naiveCost)}</span>
            </p>
            <p>
              Risque de perte par unité si vendu au mauvais prix :{' '}
              <span className="font-bold text-red-600">
                {safeFormat(results.realCost - results.naiveCost)}
              </span>
            </p>
          </div>

          {/* CORRECTION : encart CAC + seuil rentabilité pub */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm space-y-2">
            <h4 className="font-semibold text-[#1A5276]">📊 Analyse Publicité</h4>
            <div className="flex justify-between">
              <span className="text-gray-600">Coût d'acquisition client (CAC)</span>
              <span className="font-bold text-[#1A5276]">{safeFormat(results.cac)}</span>
            </div>
            {results.unitsToBreakEven !== null && (
              <div className="flex justify-between">
                <span className="text-gray-600">Unités à vendre pour rentabiliser la pub</span>
                <span className="font-bold text-[#1A5276]">{results.unitsToBreakEven} unités</span>
              </div>
            )}
            {results.unitsToBreakEven === null && (
              <p className="text-xs text-red-500">
                Marge insuffisante pour rentabiliser la pub au prix recommandé.
              </p>
            )}
          </div>

          {/* CORRECTION : bouton sauvegarder */}
          <button
            onClick={saveCalculation}
            disabled={saving || saved}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
              saved
                ? 'bg-green-500 text-white cursor-default'
                : 'bg-[#1A5276] hover:bg-blue-800 text-white'
            }`}
          >
            {saved ? (
              <><CheckCircle size={16} /> Calcul sauvegardé !</>
            ) : saving ? (
              'Sauvegarde en cours...'
            ) : (
              <><Save size={16} /> Sauvegarder ce calcul</>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}