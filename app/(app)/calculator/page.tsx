'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import {
  Lightbulb, AlertCircle, TrendingUp, Save,
  CheckCircle, History, Trash2, ChevronDown, ChevronUp,
  Info, Download, RefreshCw, Database
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

// ── Composant Info-bulle ──────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(p => !p)}
        className="text-gray-400 hover:text-[#1A5276] transition"
      >
        <Info size={13} />
      </button>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function CalculatorPage() {

  // — Données
  const [products, setProducts]               = useState<Product[]>([]);
  const [countrySettings, setCountrySettings] = useState<CountrySetting[]>([]);
  const [history, setHistory]                 = useState<SavedCalculation[]>([]);

  // — Formulaire
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

  // — UI
  const [saved, setSaved]                     = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [deletingId, setDeletingId]           = useState<string | null>(null);
  const [showHistory, setShowHistory]         = useState(true);
  const [expandedId, setExpandedId]           = useState<string | null>(null);
  const [loadingRealRate, setLoadingRealRate] = useState(false);
  const [realRateLoaded, setRealRateLoaded]   = useState(false);
  const [exportingPDF, setExportingPDF]       = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

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
      const { data: prods, error: e1 } = await supabase
        .from('products').select('id, name, purchase_cost').eq('status', 'active');
      if (e1) console.error('Produits:', e1.message);
      else if (prods) setProducts(prods);

      const { data: settings, error: e2 } = await supabase
        .from('country_settings').select('country, default_failure_rate, is_default');
      if (e2) console.error('Pays:', e2.message);
      else if (settings?.length) {
        setCountrySettings(settings);
        const def = settings.find(s => s.is_default) ?? settings[0];
        setSelectedCountry(def.country);
        setFailureRate(def.default_failure_rate);
      }

      await fetchHistory();
    };
    init();
  }, [fetchHistory]);

  // ── Handlers ──────────────────────────────────────────────────────────────

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
    setRealRateLoaded(false);
  }

  // ── NOUVEAU : Charger le taux d'échec réel depuis Livraisons ─────────────

  async function loadRealFailureRate() {
    setLoadingRealRate(true);
    const { data, error } = await supabase
      .from('orders')
      .select('status')
      .in('status', ['delivered', 'failed', 'returned']);

    if (error) {
      console.error('Taux réel:', error.message);
      setLoadingRealRate(false);
      return;
    }

    if (!data || data.length === 0) {
      alert('Pas encore assez de données de livraison pour calculer un taux réel.');
      setLoadingRealRate(false);
      return;
    }

    const closed    = data.length;
    const failed    = data.filter(o => o.status === 'failed' || o.status === 'returned').length;
    const realRate  = failed / closed;

    setFailureRate(Math.min(realRate, 0.99));
    setRealRateLoaded(true);
    setLoadingRealRate(false);
  }

  // ── Calculs ───────────────────────────────────────────────────────────────

  const results = useMemo(() => {
    const safeOrders      = Math.max(ordersGenerated, 1);
    const safeFailureRate = Math.min(failureRate, 0.99);
    const failedCost      = deliveryCost * (safeFailureRate / (1 - safeFailureRate));
    const adPerOrder      = adBudget / safeOrders;
    const realCost        = purchaseCost + packagingCost + deliveryCost + failedCost + adPerOrder + returnCost;
    const safeMargin      = Math.min(targetMargin, 99) / 100;
    const recommended     = realCost / (1 - safeMargin);
    const margin          = recommended - realCost;

    return {
      failedDeliveriesCost: isNaN(failedCost) ? 0 : failedCost,
      adCostPerOrder:       adPerOrder,
      realCost,
      minPrice:             realCost,
      recommendedPrice:     recommended,
      optimalPrice:         realCost / 0.50,
      naiveCost:            purchaseCost + deliveryCost,
      marginAmount:         margin,
      marginPercentage:     recommended > 0 ? (margin / recommended) * 100 : 0,
      netProfitAfterAds:    margin - adPerOrder,
      unitsToBreakEven:     margin > 0 ? Math.ceil(adBudget / margin) : null,
    };
  }, [purchaseCost, packagingCost, deliveryCost, failureRate, adBudget, ordersGenerated, returnCost, targetMargin]);

  // ── Sauvegarder ───────────────────────────────────────────────────────────

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
      await fetchHistory();
    } else {
      console.error('Sauvegarde:', error.message);
    }
  }

  // ── NOUVEAU : Export PDF via impression navigateur ────────────────────────

  function exportToPDF() {
    setExportingPDF(true);
    const productName = selectedProductId !== 'manual'
      ? products.find(p => p.id === selectedProductId)?.name ?? 'Saisie manuelle'
      : 'Saisie manuelle';

    const date = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Calcul de Rentabilité — AfriCommerce Pro</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px; }
          .header { border-bottom: 3px solid #1A5276; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo { font-size: 22px; font-weight: bold; color: #1A5276; }
          .subtitle { color: #666; font-size: 12px; margin-top: 4px; }
          .date { color: #888; font-size: 11px; text-align: right; }
          .product-badge { background: #EFF6FF; border: 1px solid #BFDBFE; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 20px; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 14px; font-weight: bold; color: #1A5276; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
          .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #f3f4f6; }
          .row.highlight { background: #FEF2F2; padding: 8px 10px; border-radius: 6px; color: #dc2626; font-weight: bold; border-bottom: none; margin: 4px 0; }
          .row.total { border-top: 2px solid #1A5276; padding-top: 10px; font-weight: bold; font-size: 15px; color: #1A5276; border-bottom: none; }
          .prices { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
          .price-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; text-align: center; }
          .price-card.recommended { border: 2px solid #E67E22; background: #FFF7ED; }
          .price-label { font-size: 11px; color: #888; margin-bottom: 4px; }
          .price-label.orange { color: #E67E22; font-weight: bold; }
          .price-value { font-size: 18px; font-weight: bold; color: #1a1a1a; }
          .price-value.big { font-size: 22px; color: #E67E22; }
          .price-margin { font-size: 11px; color: #888; margin-top: 4px; }
          .alert { background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 16px; }
          .alert-title { font-weight: bold; color: #92400E; margin-bottom: 4px; }
          .alert-text { color: #78350F; font-size: 12px; }
          .pub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .pub-item { background: #EFF6FF; border-radius: 8px; padding: 12px; }
          .pub-label { font-size: 11px; color: #3b82f6; margin-bottom: 4px; }
          .pub-value { font-weight: bold; color: #1e40af; }
          .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; color: #999; font-size: 11px; }
          .formula { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #64748b; margin-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">AfriCommerce Pro</div>
            <div class="subtitle">Calculateur de Rentabilité Intelligent</div>
          </div>
          <div class="date">Généré le ${date}</div>
        </div>

        <div class="product-badge">📦 Produit : ${productName} · ${COUNTRY_LABELS[selectedCountry] ?? selectedCountry}</div>

        <!-- Décomposition des coûts -->
        <div class="section">
          <div class="section-title">Décomposition du Coût Réel</div>
          <div class="row"><span>Coût d'achat</span><span>${safeFormat(purchaseCost)}</span></div>
          <div class="row"><span>Emballage</span><span>${safeFormat(packagingCost)}</span></div>
          <div class="row"><span>Livraison unitaire</span><span>${safeFormat(deliveryCost)}</span></div>
          <div class="row highlight">
            <span>⚠️ Coût des échecs de livraison (${parseFloat((failureRate * 100).toFixed(1))}%)</span>
            <span>${safeFormat(results.failedDeliveriesCost)}</span>
          </div>
          <div class="formula">
            Formule : frais livraison × taux d'échec ÷ (1 – taux d'échec) = amortissement des colis non livrés sur les colis livrés
          </div>
          <div class="row" style="margin-top:8px"><span>Coût publicité / commande</span><span>${safeFormat(results.adCostPerOrder)}</span></div>
          <div class="row"><span>Frais de retour</span><span>${safeFormat(returnCost)}</span></div>
          <div class="row total">
            <span>COÛT RÉEL PAR PRODUIT LIVRÉ</span>
            <span>${safeFormat(results.realCost)}</span>
          </div>
          <div class="formula" style="margin-top:8px">
            Formule prix recommandé : coût réel ÷ (1 – marge cible) = ${safeFormat(results.realCost)} ÷ (1 – ${targetMargin}%) = ${safeFormat(results.recommendedPrice)}
          </div>
        </div>

        <!-- Recommandations de prix -->
        <div class="section">
          <div class="section-title">Recommandations de Prix</div>
          <div class="prices">
            <div class="price-card">
              <div class="price-label">Minimum (seuil)</div>
              <div class="price-value">${safeFormat(results.minPrice)}</div>
              <div class="price-margin">Marge : 0%</div>
            </div>
            <div class="price-card recommended">
              <div class="price-label orange">⭐ RECOMMANDÉ</div>
              <div class="price-value big">${safeFormat(results.recommendedPrice)}</div>
              <div class="price-margin">Bénéfice : ${safeFormat(results.marginAmount)} · Marge : ${targetMargin}%</div>
            </div>
            <div class="price-card">
              <div class="price-label">Optimal</div>
              <div class="price-value">${safeFormat(results.optimalPrice)}</div>
              <div class="price-margin">Marge : 50%</div>
            </div>
          </div>
        </div>

        <!-- Alerte coût naïf -->
        <div class="alert">
          <div class="alert-title">⚠️ Sans cet outil, vous auriez estimé le coût à : ${safeFormat(results.naiveCost)}</div>
          <div class="alert-text">Risque de perte par unité si vendu au mauvais prix : ${safeFormat(results.realCost - results.naiveCost)}</div>
        </div>

        <!-- Analyse publicité -->
        <div class="section">
          <div class="section-title">📊 Analyse Publicité</div>
          <div class="pub-grid">
            <div class="pub-item">
              <div class="pub-label">Coût d'acquisition client (CAC)</div>
              <div class="pub-value">${safeFormat(results.adCostPerOrder)}</div>
            </div>
            <div class="pub-item">
              <div class="pub-label">Budget pub total</div>
              <div class="pub-value">${safeFormat(adBudget)}</div>
            </div>
            ${results.unitsToBreakEven !== null ? `
            <div class="pub-item">
              <div class="pub-label">Unités à vendre pour rentabiliser la pub</div>
              <div class="pub-value">${results.unitsToBreakEven} unités</div>
            </div>` : ''}
            <div class="pub-item">
              <div class="pub-label">Bénéfice net par unité (après pub)</div>
              <div class="pub-value">${safeFormat(results.marginAmount)}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          Rapport généré par AfriCommerce Pro · Confidentiel · ${date}
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        setExportingPDF(false);
      }, 500);
    } else {
      setExportingPDF(false);
    }
  }

  // ── Recharger un calcul ───────────────────────────────────────────────────

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
    setRealRateLoaded(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Supprimer un calcul ───────────────────────────────────────────────────

  async function deleteCalculation(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from('saved_calculations').delete().eq('id', id);
    if (error) console.error('Suppression:', error.message);
    else setHistory(prev => prev.filter(c => c.id !== id));
    setDeletingId(null);
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Lightbulb className="text-[#E67E22]" />
          Calculateur de Rentabilité Intelligent
        </h1>
        <p className="text-gray-500 mt-1">
          Calculez votre vrai prix de vente en tenant compte des échecs de livraison et de la publicité.
        </p>
      </div>

      {/* Formulaire + Résultats */}
      <div className="grid lg:grid-cols-2 gap-8">

        {/* ── GAUCHE : Paramètres ─────────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
          <h2 className="text-lg font-semibold border-b pb-3">Paramètres</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produit</label>
            <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}
              className="w-full border-gray-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-[#1A5276]">
              <option value="manual">✏️ Saisie manuelle</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {selectedProductId !== 'manual' && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle size={11} /> Coût d'achat pré-rempli depuis vos produits
              </p>
            )}
          </div>

          {countrySettings.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pays de livraison</label>
              <select value={selectedCountry} onChange={e => handleCountryChange(e.target.value)}
                className="w-full border-gray-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-[#1A5276]">
                {countrySettings.map(s => (
                  <option key={s.country} value={s.country}>{COUNTRY_LABELS[s.country] ?? s.country}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Le taux d'échec est mis à jour automatiquement.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Coût d'achat (FCFA)", value: purchaseCost, set: setPurchaseCost },
              { label: 'Coût emballage (FCFA)', value: packagingCost, set: setPackagingCost },
              { label: 'Coût livraison (FCFA)', value: deliveryCost, set: setDeliveryCost },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-sm text-gray-600 mb-1">{label}</label>
                <input type="number" min="0" value={value}
                  onChange={e => set(Math.max(0, Number(e.target.value)))}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-[#1A5276]" />
              </div>
            ))}

            {/* Taux d'échec avec bouton données réelles */}
            <div>
              <label className="block text-sm text-gray-600 mb-1 flex items-center">
                Taux d'échec (%)
                <Tooltip text="Pourcentage de livraisons échouées (refus, absent, injoignable). Ce taux est amorti sur les commandes réussies pour calculer le vrai coût par produit livré." />
              </label>
              <input type="number" min="0" max="99" step="0.1"
                value={parseFloat((failureRate * 100).toFixed(1))}
                onChange={e => {
                  setFailureRate(Math.min(99, Math.max(0, Number(e.target.value))) / 100);
                  setRealRateLoaded(false);
                }}
                className={`w-full border p-2 rounded-lg focus:ring-2 focus:ring-[#1A5276] ${realRateLoaded ? 'border-green-400 bg-green-50' : ''}`} />
            </div>
          </div>

          {/* NOUVEAU : Bouton "Utiliser mes données réelles" */}
          <button
            type="button"
            onClick={loadRealFailureRate}
            disabled={loadingRealRate}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition ${
              realRateLoaded
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {loadingRealRate ? (
              <><RefreshCw size={14} className="animate-spin" /> Calcul en cours...</>
            ) : realRateLoaded ? (
              <><CheckCircle size={14} /> Taux réel chargé ({parseFloat((failureRate * 100).toFixed(1))}%)</>
            ) : (
              <><Database size={14} /> Utiliser mon taux d'échec réel (depuis Livraisons)</>
            )}
          </button>

          <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
            <h3 className="font-medium text-sm">Budget Publicitaire (Facebook Ads)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Budget total (FCFA)</label>
                <input type="number" min="0" value={adBudget}
                  onChange={e => setAdBudget(Math.max(0, Number(e.target.value)))}
                  className="w-full border p-2 rounded-lg bg-white focus:ring-2 focus:ring-[#1A5276]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Commandes générées</label>
                <input type="number" min="1" value={ordersGenerated}
                  onChange={e => setOrdersGenerated(Math.max(1, Number(e.target.value)))}
                  className="w-full border p-2 rounded-lg bg-white focus:ring-2 focus:ring-[#1A5276]" />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              CAC calculé : <span className="font-semibold text-gray-600">{safeFormat(results.adCostPerOrder)} / commande</span>
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Frais de retour estimés (FCFA)</label>
            <input type="number" min="0" value={returnCost}
              onChange={e => setReturnCost(Math.max(0, Number(e.target.value)))}
              className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-[#1A5276]" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Marge cible : <span className="font-bold text-[#1A5276] text-base">{targetMargin}%</span>
            </label>
            <input type="range" min="10" max="60" value={targetMargin}
              onChange={e => setTargetMargin(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1A5276]" />
            {/* AMÉLIORATION : marqueurs plus visibles */}
            <div className="flex justify-between mt-2">
              {[10, 20, 30, 40, 50, 60].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTargetMargin(v)}
                  className={`text-xs px-1.5 py-0.5 rounded transition ${
                    targetMargin === v
                      ? 'bg-[#1A5276] text-white font-bold'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── DROITE : Résultats ──────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Décomposition */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold border-b pb-3 mb-4">Décomposition du Coût Réel</h2>
            <div className="space-y-2 text-sm">
              {[
                { label: "Coût d'achat", value: purchaseCost },
                { label: 'Emballage', value: packagingCost },
                { label: 'Livraison', value: deliveryCost },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-mono font-medium">{safeFormat(value)}</span>
                </div>
              ))}

              {/* Ligne coût échecs avec info-bulle */}
              <div className="flex justify-between text-red-600 bg-red-50 px-3 py-2 rounded-lg font-medium">
                <span className="flex items-center gap-1">
                  <AlertCircle size={14} />
                  Coût échecs livraisons
                  <span className="text-xs font-normal text-red-400">
                    ({parseFloat((failureRate * 100).toFixed(1))}%)
                  </span>
                  <Tooltip text={`Formule : frais livraison × taux ÷ (1 – taux) = ${safeFormat(deliveryCost)} × ${parseFloat((failureRate * 100).toFixed(1))}% ÷ ${parseFloat(((1 - failureRate) * 100).toFixed(1))}% = ${safeFormat(results.failedDeliveriesCost)}. C'est le coût que vous payez sur chaque livraison réussie pour amortir les livraisons échouées.`} />
                </span>
                <span className="font-mono">{safeFormat(results.failedDeliveriesCost)}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-gray-600 flex items-center gap-1">
                  Coût pub / commande
                  <Tooltip text="Budget pub total divisé par le nombre de commandes générées. C'est votre Coût d'Acquisition Client (CAC)." />
                </span>
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

          {/* Recommandations */}
          <div className="bg-gradient-to-br from-[#1A5276] to-blue-800 p-6 rounded-xl text-white shadow-lg">
            <h3 className="font-bold mb-1 flex items-center gap-2">
              <TrendingUp size={18} /> Recommandations de Prix
            </h3>
            {/* AMÉLIORATION : formule visible */}
            <p className="text-blue-200 text-xs mb-4">
              Formule : coût réel ÷ (1 – marge cible) = {safeFormat(results.realCost)} ÷ {100 - targetMargin}%
            </p>
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
                  <div className="text-xs text-[#E67E22] font-bold uppercase tracking-wide">⭐ Recommandé</div>
                  <div className="text-2xl font-bold">{safeFormat(results.recommendedPrice)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">Bénéfice : {safeFormat(results.marginAmount)}</div>
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

          {/* Alerte naïf */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 text-amber-800 text-sm rounded-r-lg">
            <p className="font-bold mb-1">
              Sans cet outil, vous auriez estimé le coût à :{' '}
              <span className="line-through">{safeFormat(results.naiveCost)}</span>
            </p>
            <p>
              Risque de perte par unité :{' '}
              <span className="font-bold text-red-600">{safeFormat(results.realCost - results.naiveCost)}</span>
            </p>
          </div>

          {/* AMÉLIORATION : Analyse pub enrichie */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm space-y-2">
            <h4 className="font-semibold text-[#1A5276]">📊 Analyse Publicité</h4>
            <div className="flex justify-between">
              <span className="text-gray-600">Coût d'acquisition client (CAC)</span>
              <span className="font-bold text-[#1A5276]">{safeFormat(results.adCostPerOrder)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Bénéfice net par unité vendue</span>
              <span className="font-bold text-green-600">{safeFormat(results.marginAmount)}</span>
            </div>
            {results.unitsToBreakEven !== null ? (
              <div className="bg-white border border-blue-200 rounded-lg px-3 py-2 flex justify-between items-center">
                <span className="text-gray-600 text-xs">
                  Unités à vendre pour rentabiliser votre budget pub
                </span>
                <span className="font-bold text-[#1A5276] text-base ml-2 shrink-0">
                  {results.unitsToBreakEven} unités
                </span>
              </div>
            ) : (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                ⚠️ Marge insuffisante pour rentabiliser la pub. Réduisez votre budget ou augmentez le prix.
              </p>
            )}
          </div>

          {/* Boutons actions */}
          <div className="flex gap-3">
            {/* Sauvegarder */}
            <button onClick={saveCalculation} disabled={saving || saved}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
                saved ? 'bg-green-500 text-white cursor-default' : 'bg-[#1A5276] hover:bg-blue-800 text-white'
              }`}>
              {saved ? <><CheckCircle size={16} /> Sauvegardé !</>
                : saving ? 'Sauvegarde...'
                : <><Save size={16} /> Sauvegarder</>}
            </button>

            {/* NOUVEAU : Export PDF */}
            <button onClick={exportToPDF} disabled={exportingPDF}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition bg-[#E67E22] hover:bg-orange-600 text-white disabled:opacity-50">
              {exportingPDF
                ? <><RefreshCw size={14} className="animate-spin" /> Export...</>
                : <><Download size={16} /> Exporter PDF</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── HISTORIQUE ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <button onClick={() => setShowHistory(p => !p)}
          className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition">
          <div className="flex items-center gap-2">
            <History size={18} className="text-[#1A5276]" />
            <h2 className="text-lg font-semibold text-gray-900">Calculs sauvegardés</h2>
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {history.length}
            </span>
          </div>
          {showHistory ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {showHistory && (
          <>
            {history.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <Save size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun calcul sauvegardé pour l'instant.</p>
              </div>
            ) : (
              <div className="divide-y">
                {history.map(calc => (
                  <div key={calc.id} className="p-5 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900 truncate">{calc.products?.name ?? 'Saisie manuelle'}</span>
                          {calc.country && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              {COUNTRY_LABELS[calc.country] ?? calc.country}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(calc.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                          <div><span className="text-gray-400 text-xs block">Coût réel</span><span className="font-bold text-[#1A5276]">{formatMoney(calc.real_cost)}</span></div>
                          <div><span className="text-gray-400 text-xs block">Prix recommandé</span><span className="font-bold text-green-600">{formatMoney(calc.recommended_price)}</span></div>
                          <div><span className="text-gray-400 text-xs block">Marge cible</span><span className="font-bold text-gray-700">{calc.target_margin}%</span></div>
                          <div><span className="text-gray-400 text-xs block">Taux d'échec</span><span className="font-bold text-red-500">{parseFloat((calc.failure_rate * 100).toFixed(1))}%</span></div>
                        </div>
                        {expandedId === calc.id && (
                          <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            {[
                              { label: "Coût achat", value: calc.purchase_cost },
                              { label: 'Emballage', value: calc.packaging_cost },
                              { label: 'Livraison', value: calc.delivery_cost },
                              { label: 'Frais retour', value: calc.return_cost },
                              { label: 'Budget pub', value: calc.ad_budget },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <span className="block text-gray-400">{label}</span>
                                <span className="font-medium text-gray-700">{formatMoney(value)}</span>
                              </div>
                            ))}
                            <div>
                              <span className="block text-gray-400">Commandes générées</span>
                              <span className="font-medium text-gray-700">{calc.orders_generated}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setExpandedId(expandedId === calc.id ? null : calc.id)}
                          className="text-xs text-gray-400 hover:text-gray-600 underline whitespace-nowrap">
                          {expandedId === calc.id ? 'Moins' : 'Détail'}
                        </button>
                        <button onClick={() => loadCalculation(calc)}
                          className="text-xs bg-[#1A5276] text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition whitespace-nowrap">
                          Recharger
                        </button>
                        <button onClick={() => deleteCalculation(calc.id)} disabled={deletingId === calc.id}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition" title="Supprimer">
                          {deletingId === calc.id ? <span className="text-xs text-gray-400">...</span> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}