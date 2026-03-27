'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import Link from 'next/link';
import {
  ShoppingBag, TrendingUp, CheckCircle, Clock,
  XCircle, DollarSign, Package, ArrowRight, Plus, AlertTriangle
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────

type OrderWithProduct = {
  id: string;
  created_at: string;
  customer_name: string;
  total_amount: number;
  status: string;
  quantity: number;
  unit_price: number;
  delivery_cost: number;       
  ad_cost_per_order: number;   
  products: { id: string; name: string; purchase_cost: number } | null;
};

type KPIs = {
  ordersToday: number;
  ordersMonth: number;
  deliveredRevenue: number;
  realProfit: number;
  successRate: number;
  pendingOrders: number;
  failedCost: number;
};

type ChartPoint  = { date: string; commandes: number };
type TopProduct  = { name: string; revenus: number };

// ── Constantes (ADAPTÉES À TON PROJET) ───────────────────────────────────────

// Commandes terminées (pour calcul taux succès)
const STATUS_CLOSED  = ['delivered', 'cancelled']; 
// Commandes en cours
const STATUS_PENDING = ['new', 'confirmed'];
// Commandes échouées (On utilise 'cancelled' qui est ton statut d'échec actuel)
const STATUS_FAILED  = ['cancelled']; 

const STATUS_LABELS: Record<string, string> = {
  new:       'Nouveau',
  confirmed: 'Confirmée',
  delivered: 'Livrée',
  cancelled: 'Annulée', // Utilisé comme échec
};

const STATUS_COLORS: Record<string, string> = {
  new:       'bg-blue-100 text-blue-700',
  confirmed: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const getStatusLabel = (s: string) => STATUS_LABELS[s] ?? s;
const getStatusColor = (s: string) => STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-700';

// ── Composant ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [orders, setOrders]         = useState<OrderWithProduct[]>([]);
  const [chartData, setChartData]   = useState<ChartPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [kpis, setKpis]             = useState<KPIs>({
    ordersToday: 0, ordersMonth: 0, deliveredRevenue: 0,
    realProfit: 0, successRate: 0, pendingOrders: 0, failedCost: 0,
  });

  useEffect(() => { fetchDashboardData(); }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);

    // ATTENTION : Ces colonnes doivent exister dans Supabase
    const { data, error: sbError } = await supabase
      .from('orders')
      .select(`
        id, created_at, customer_name, total_amount,
        status, quantity, unit_price,
        delivery_cost, ad_cost_per_order,
        products(id, name, purchase_cost)
      `)
      .order('created_at', { ascending: false });

    if (sbError) {
      console.error('Erreur Supabase:', sbError.message);
      setError('Impossible de charger les données. Avez-vous exécuté le SQL pour ajouter les colonnes ?');
      setLoading(false);
      return;
    }

        if (data) {
      // CORRECTION : On utilise 'unknown' pour forcer TypeScript à accepter le format
      const typed = data as unknown as OrderWithProduct[];
      setOrders(typed);
      setKpis(calculateKPIs(typed));
      setChartData(prepareChartData(typed));
      setTopProducts(calculateTopProducts(typed));
    }

    setLoading(false);
  }

  // ── Calculs KPIs ──────────────────────────────────────────────────────────

  function calculateKPIs(data: OrderWithProduct[]): KPIs {
    const now          = new Date();
    const todayStr     = now.toISOString().split('T')[0];
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let ordersToday      = 0;
    let ordersMonth      = 0;
    let deliveredRevenue = 0;
    let realProfit       = 0;
    let pendingOrders    = 0;
    let failedCost       = 0;
    let deliveredCount   = 0;

    data.forEach(order => {
      const orderDate = new Date(order.created_at);
      const dateStr   = order.created_at.split('T')[0];

      if (dateStr === todayStr)       ordersToday++;
      if (orderDate >= startOfMonth)  ordersMonth++;

      if (order.status === 'delivered') {
        deliveredCount++;
        deliveredRevenue += order.total_amount ?? 0;

        // Profit réel = CA - Coût Achat - Livraison - Pub
        const purchaseCost = (order.products?.purchase_cost ?? 0) * (order.quantity ?? 1);
        const deliveryCost = order.delivery_cost    ?? 0;
        const adCost       = order.ad_cost_per_order ?? 0;
        realProfit += (order.total_amount ?? 0) - purchaseCost - deliveryCost - adCost;
      }

      if (STATUS_PENDING.includes(order.status)) pendingOrders++;

      // Coût échec = Livraison perdue
      if (STATUS_FAILED.includes(order.status)) {
        failedCost += order.delivery_cost ?? 0;
      }
    });

    // Taux de succès sur commandes closes
    const closedOrders = data.filter(o => STATUS_CLOSED.includes(o.status)).length;
    const successRate  = closedOrders > 0
      ? Math.round((deliveredCount / closedOrders) * 100)
      : 0;

    return {
      ordersToday, ordersMonth, deliveredRevenue,
      realProfit, successRate, pendingOrders, failedCost,
    };
  }

  // ── Graphique lignes ──────────────────────────────────────────────────────

  function prepareChartData(data: OrderWithProduct[]): ChartPoint[] {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toISOString().split('T')[0]] = 0;
    }

    data.forEach(order => {
      const key = order.created_at.split('T')[0];
      if (key in days) days[key]++;
    });

    return Object.entries(days).map(([key, count]) => ({
      date:      new Date(key).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      commandes: count,
    }));
  }

  // ── Top produits ──────────────────────────────────────────────────────────

  function calculateTopProducts(data: OrderWithProduct[]): TopProduct[] {
    const map: Record<string, { name: string; revenue: number }> = {};

    data.forEach(order => {
      if (order.status === 'delivered' && order.products) {
        const id = order.products.id;
        if (!map[id]) map[id] = { name: order.products.name, revenue: 0 };
        map[id].revenue += order.total_amount ?? 0;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(p => ({ name: p.name, revenus: p.revenue }));
  }

  // ── Mémo ─────────────────────────────────────────────────────────────────

  const recentOrders = useMemo(() => orders.slice(0, 10), [orders]);

  // ── Rendu états spéciaux ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center gap-4 text-center">
        <AlertTriangle size={40} className="text-red-500" />
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-[#1A5276] text-white rounded-lg text-sm hover:bg-blue-800 transition"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // ── Rendu principal ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500">Performances détaillées</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Aujourd'hui</span>
            <ShoppingBag size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold">{kpis.ordersToday}</p>
          <p className="text-xs text-gray-400 mt-1">Commandes</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Ce mois</span>
            <Package size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold">{kpis.ordersMonth}</p>
          <p className="text-xs text-gray-400 mt-1">Commandes</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Revenus</span>
            <TrendingUp size={16} className="text-green-600" />
          </div>
          <p className="text-xl font-bold text-green-700">{formatMoney(kpis.deliveredRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">Commandes livrées</p>
        </div>

        <div className={`p-4 rounded-xl shadow-sm border ${
          kpis.realProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium ${kpis.realProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
              Profit réel
            </span>
            <DollarSign size={16} className={kpis.realProfit >= 0 ? 'text-green-600' : 'text-red-600'} />
          </div>
          <p className={`text-xl font-bold ${kpis.realProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatMoney(kpis.realProfit)}
          </p>
          <p className={`text-xs mt-1 ${kpis.realProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            Achat + livraison + pub
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Taux succès</span>
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold">{kpis.successRate}%</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2" title="Calculé sur les commandes closes (livrées + annulées)">
            <div className="bg-green-600 h-1.5 rounded-full transition-all" style={{ width: `${kpis.successRate}%` }} />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-red-600 font-medium">Coût échecs</span>
            <XCircle size={16} className="text-red-600" />
          </div>
          <p className="text-xl font-bold text-red-700">{formatMoney(kpis.failedCost)}</p>
          <p className="text-xs text-red-600 mt-1">Livraisons perdues</p>
        </div>
      </div>

      {/* Alerte commandes en attente */}
      {kpis.pendingOrders > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="text-orange-600" />
            <span className="text-sm font-medium text-orange-800">
              Vous avez <span className="font-bold">{kpis.pendingOrders} commandes</span> en attente de traitement.
            </span>
          </div>
          <Link href="/orders" className="text-sm font-medium text-orange-700 hover:underline">
            Voir →
          </Link>
        </div>
      )}

      {/* Graphiques */}
      <div className="grid lg:grid-cols-2 gap-6">

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Commandes (30 jours)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="commandes" stroke="#E67E22" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Top 5 Produits (Revenus)</h3>
          <div className="h-72">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatMoney(value)} />
                  <Bar dataKey="revenus" fill="#1A5276" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                <Package size={32} className="opacity-40" />
                <p className="text-sm">Aucune livraison réussie</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Commandes récentes */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Commandes récentes</h2>
          <Link href="/orders" className="text-sm text-[#E67E22] hover:underline flex items-center gap-1">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Client</th>
                <th className="px-6 py-3 text-left">Produit</th>
                <th className="px-6 py-3 text-right">Montant</th>
                <th className="px-6 py-3 text-left">Statut</th>
                <th className="px-6 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                    Aucune commande pour l'instant
                  </td>
                </tr>
              ) : (
                recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {order.customer_name || 'Client'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {order.products?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      {formatMoney(order.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-[#1A5276] to-blue-800 rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-lg font-bold mb-2">Prêt à vendre ?</h3>
          <p className="text-blue-100 text-sm mb-4">Ajoutez rapidement un nouveau produit.</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-white text-[#1A5276] px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-100 transition"
          >
            <Plus size={16} /> Ajouter un produit
          </Link>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          {kpis.pendingOrders === 0 ? (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Tout est à jour 👍</h3>
              <p className="text-gray-500 text-sm">Aucune commande en attente.</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Action requise</h3>
              <p className="text-gray-500 text-sm mb-3">
                {kpis.pendingOrders} commande{kpis.pendingOrders > 1 ? 's' : ''} à traiter.
              </p>
              <Link
                href="/orders"
                className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-orange-600 transition"
              >
                Traiter maintenant <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </div>

    </div>
  );
}