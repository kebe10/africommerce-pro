'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import { Lightbulb, AlertCircle, TrendingUp } from 'lucide-react';

interface Product { id: string; name: string; purchase_cost: number; }
interface CountrySetting { country: string; default_failure_rate: number; }

export default function CalculatorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('manual');
  const [purchaseCost, setPurchaseCost] = useState<number>(0);
  const [packagingCost, setPackagingCost] = useState<number>(500);
  const [deliveryCost, setDeliveryCost] = useState<number>(1500);
  const [failureRate, setFailureRate] = useState<number>(0.30);
  const [adBudget, setAdBudget] = useState<number>(50000);
  const [ordersGenerated, setOrdersGenerated] = useState<number>(20);
  const [returnCost, setReturnCost] = useState<number>(0);
  const [targetMargin, setTargetMargin] = useState<number>(30);

  useEffect(() => {
    const fetchData = async () => {
      const { data: prods } = await supabase.from('products').select('id, name, purchase_cost');
      if (prods) setProducts(prods);
      
      const { data: settings } = await supabase.from('country_settings').select('*').eq('is_default', true).single();
      if (settings) setFailureRate(settings.default_failure_rate);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedProductId !== 'manual') {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) setPurchaseCost(prod.purchase_cost);
    }
  }, [selectedProductId, products]);

  const results = useMemo(() => {
    const safeOrders = ordersGenerated || 1;
    const failedDeliveriesCost = deliveryCost * (failureRate / (1 - failureRate));
    const adCostPerOrder = adBudget / safeOrders;
    const realCost = purchaseCost + packagingCost + deliveryCost + failedDeliveriesCost + adCostPerOrder + returnCost;
    const minPrice = realCost;
    const recommendedPrice = realCost / (1 - (targetMargin / 100));
    const optimalPrice = realCost / (1 - 0.50);
    const naiveCost = purchaseCost + deliveryCost;

    return {
      failedDeliveriesCost: isNaN(failedDeliveriesCost) ? 0 : failedDeliveriesCost,
      adCostPerOrder, realCost, minPrice, recommendedPrice, optimalPrice, naiveCost,
      marginAmount: recommendedPrice - realCost
    };
  }, [purchaseCost, packagingCost, deliveryCost, failureRate, adBudget, ordersGenerated, returnCost, targetMargin]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Lightbulb className="text-[#E67E22]" />
          Calculateur de Rentabilité Intelligent
        </h1>
        <p className="text-gray-500 mt-1">Calculez votre vrai prix de vente en tenant compte des échecs de livraison et des pubs.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* LEFT PANEL: Inputs */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
          <h2 className="text-lg font-semibold border-b pb-3">Paramètres</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produit</label>
            <select 
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full border-gray-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-[#1A5276]"
            >
              <option value="manual">Saisie manuelle</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-600 mb-1">Coût d'achat (FCFA)</label><input type="number" value={purchaseCost} onChange={e => setPurchaseCost(Number(e.target.value))} className="w-full border p-2 rounded-lg" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">Coût emballage (FCFA)</label><input type="number" value={packagingCost} onChange={e => setPackagingCost(Number(e.target.value))} className="w-full border p-2 rounded-lg" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">Coût livraison (FCFA)</label><input type="number" value={deliveryCost} onChange={e => setDeliveryCost(Number(e.target.value))} className="w-full border p-2 rounded-lg" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">Taux d'échec (%)</label><input type="number" step="0.01" value={failureRate * 100} onChange={e => setFailureRate(Number(e.target.value) / 100)} className="w-full border p-2 rounded-lg" /></div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-medium mb-3 text-sm">Budget Publicitaire</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-500 mb-1">Budget Total (FCFA)</label><input type="number" value={adBudget} onChange={e => setAdBudget(Number(e.target.value))} className="w-full border p-2 rounded-lg bg-white" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Commandes générées</label><input type="number" value={ordersGenerated} onChange={e => setOrdersGenerated(Number(e.target.value))} className="w-full border p-2 rounded-lg bg-white" /></div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Marge cible souhaitée: {targetMargin}%</label>
            <input type="range" min="10" max="60" value={targetMargin} onChange={e => setTargetMargin(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1A5276]" />
          </div>
        </div>

        {/* RIGHT PANEL: Results */}
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold border-b pb-3 mb-4">Décomposition du Coût Réel</h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Coût d'achat</span><span className="font-mono">{formatMoney(purchaseCost)}</span></div>
              <div className="flex justify-between"><span>Emballage</span><span className="font-mono">{formatMoney(packagingCost)}</span></div>
              <div className="flex justify-between"><span>Livraison</span><span className="font-mono">{formatMoney(deliveryCost)}</span></div>
              
              <div className="flex justify-between text-red-600 bg-red-50 p-2 rounded-lg font-medium">
                <span className="flex items-center gap-1"><AlertCircle size={14} /> Coût échecs livraisons</span>
                <span className="font-mono">{formatMoney(results.failedDeliveriesCost)}</span>
              </div>

              <div className="flex justify-between"><span>Coût pub / commande</span><span className="font-mono">{formatMoney(results.adCostPerOrder)}</span></div>
              <div className="flex justify-between"><span>Retours (estimé)</span><span className="font-mono">{formatMoney(returnCost)}</span></div>
              
              <div className="border-t my-2 pt-2 flex justify-between text-base font-bold text-[#1A5276]">
                <span>COÛT RÉEL PAR PRODUIT LIVRÉ</span>
                <span>{formatMoney(results.realCost)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1A5276] to-blue-800 p-6 rounded-xl text-white shadow-lg">
            <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} /> Recommandations de Prix</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-white/20 pb-2">
                <div><div className="text-xs text-blue-200">Minimum (Seuil de rentabilité)</div><div className="text-xl font-bold">{formatMoney(results.minPrice)}</div></div>
                <div className="text-xs text-right">Marge: 0%</div>
              </div>

              <div className="flex justify-between items-end border-b border-white/20 pb-2 bg-white/10 -mx-6 px-6 py-2">
                <div><div className="text-xs text-[#E67E22] font-bold">RECOMMANDÉ</div><div className="text-2xl font-bold">{formatMoney(results.recommendedPrice)}</div></div>
                <div className="text-right"><div className="text-sm font-bold">Bénéfice: {formatMoney(results.marginAmount)}</div><div className="text-xs">Marge: {targetMargin}%</div></div>
              </div>

              <div className="flex justify-between items-end">
                <div><div className="text-xs text-blue-200">Optimal (Croissance rapide)</div><div className="text-xl font-bold">{formatMoney(results.optimalPrice)}</div></div>
                <div className="text-xs text-right">Marge: 50%</div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 text-amber-800 text-sm rounded-r-lg">
            <p className="font-bold">Sans cet outil, vous auriez estimé le coût à : <span className="line-through">{formatMoney(results.naiveCost)}</span></p>
            <p>Risque de perte par unité si vendu au prix naïf : <span className="font-bold text-red-600">{formatMoney(results.realCost - results.naiveCost)}</span></p>
          </div>

        </div>
      </div>
    </div>
  );
}