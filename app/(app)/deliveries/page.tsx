'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import {
  Truck, CheckCircle, XCircle, AlertTriangle,
  MapPin, Clock, RefreshCw, Plus, ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, Legend
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_city: string;
  status: string;
  failure_reason: string | null;
  carrier: string | null;
  tracking_number: string | null;
  total_amount: number;
  delivery_cost: number;
  return_cost: number;
  products: { purchase_cost: number } | null;
};

type CityStats = {
  city: string;
  total: number;
  delivered: number;
  failed: number;
  successRate: number;
};

// ── Constantes ────────────────────────────────────────────────────────────────

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#3b82f6'];
const STATUS_CLOSED = ['delivered', 'failed', 'returned'];
const STATUS_FAILED = ['failed', 'returned'];

const DELIVERY_STATUS_STYLES: Record<string, string> = {
  delivered: 'bg-green-100 text-green-800 border-green-200',
  shipped:   'bg-purple-100 text-purple-800 border-purple-200',
  failed:    'bg-red-100 text-red-800 border-red-200',
  returned:  'bg-gray-100 text-gray-800 border-gray-200',
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  delivered: 'Livré',
  shipped:   'En transit',
  failed:    'Échoué',
  returned:  'Retourné',
};

const FAILURE_LABELS: Record<string, string> = {
  absent:        'Absent',
  refused:       'Refus client',
  unreachable:   'Injoignable',
  wrong_address: 'Mauvaise adresse',
  damaged:       'Endommagé',
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function DeliveriesPage() {
  const router = useRouter();

  const [allOrders, setAllOrders]         = useState<Order[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [cityFilter, setCityFilter]       = useState('all');
  const [carrierFilter, setCarrierFilter] = useState('all');

  useEffect(() => { fetchDeliveries(); }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchDeliveries() {
    setLoading(true);
    setError(null);

    const { data, error: sbError } = await supabase
      .from('orders')
      .select('*, products(purchase_cost)')
      .in('status', ['shipped', 'delivered', 'failed', 'returned'])
      .order('created_at', { ascending: false });

    if (sbError) {
      console.error('Erreur livraisons:', sbError.message);
      setError('Impossible de charger les livraisons. Vérifiez votre connexion.');
      setLoading(false);
      return;
    }

    if (data) setAllOrders(data as Order[]);
    setLoading(false);
  }

  // ── Filtres ───────────────────────────────────────────────────────────────

  const cities = useMemo(() => {
    const unique = new Set(allOrders.map(o => o.customer_city).filter(Boolean) as string[]);
    return ['all', ...Array.from(unique).sort()];
  }, [allOrders]);

  const carriers = useMemo(() => {
    const unique = new Set(allOrders.map(o => o.carrier).filter(Boolean) as string[]);
    return ['all', ...Array.from(unique).sort()];
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => {
      const cityMatch    = cityFilter    === 'all' || o.customer_city === cityFilter;
      const carrierMatch = carrierFilter === 'all' || o.carrier       === carrierFilter;
      return cityMatch && carrierMatch;
    });
  }, [allOrders, cityFilter, carrierFilter]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const inTransit   = filteredOrders.filter(o => o.status === 'shipped').length;
    const closed      = filteredOrders.filter(o => STATUS_CLOSED.includes(o.status));
    const delivered   = closed.filter(o => o.status === 'delivered').length;
    const failed      = closed.filter(o => STATUS_FAILED.includes(o.status)).length;
    const successRate = closed.length > 0
      ? ((delivered / closed.length) * 100).toFixed(0) : '0';

    const failedCost = filteredOrders.reduce((acc, o) => {
      if (STATUS_FAILED.includes(o.status)) {
        return acc + (o.delivery_cost ?? 0) + (o.products?.purchase_cost ?? 0) + (o.return_cost ?? 0);
      }
      return acc;
    }, 0);

    return { total: filteredOrders.length, inTransit, delivered, failedCount: failed, successRate, failedCost };
  }, [filteredOrders]);

  // ── Graphique raisons d'échec ─────────────────────────────────────────────

  const failureChartData = useMemo(() => {
    const reasons: Record<string, number> = {};
    filteredOrders.forEach(o => {
      if (STATUS_FAILED.includes(o.status) && o.failure_reason) {
        reasons[o.failure_reason] = (reasons[o.failure_reason] || 0) + 1;
      }
    });
    return Object.entries(reasons).map(([key, value]) => ({
      name: FAILURE_LABELS[key] ?? key, value,
    }));
  }, [filteredOrders]);

  // ── Stats par ville ───────────────────────────────────────────────────────

  const cityStats = useMemo((): CityStats[] => {
    const map: Record<string, { total: number; delivered: number; failed: number }> = {};
    allOrders.forEach(o => {
      if (!o.customer_city || !STATUS_CLOSED.includes(o.status)) return;
      if (!map[o.customer_city]) map[o.customer_city] = { total: 0, delivered: 0, failed: 0 };
      map[o.customer_city].total++;
      if (o.status === 'delivered')           map[o.customer_city].delivered++;
      if (STATUS_FAILED.includes(o.status))   map[o.customer_city].failed++;
    });
    return Object.entries(map)
      .map(([city, s]) => ({
        city, total: s.total, delivered: s.delivered, failed: s.failed,
        successRate: s.total > 0 ? Math.round((s.delivered / s.total) * 100) : 0,
      }))
      .sort((a, b) => a.successRate - b.successRate);
  }, [allOrders]);

  // ── Rendu erreur ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center gap-4 text-center">
        <AlertTriangle size={40} className="text-red-500" />
        <p className="text-red-600 font-medium">{error}</p>
        <button onClick={fetchDeliveries}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A5276] text-white rounded-lg text-sm hover:bg-blue-800 transition">
          <RefreshCw size={14} /> Réessayer
        </button>
      </div>
    );
  }

  // ── Rendu principal ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Suivi des Livraisons</h1>
        <button onClick={fetchDeliveries}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* ── EMPTY STATE GLOBAL — aucune livraison ──────────────────────────── */}
      {!loading && allOrders.length === 0 && (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center bg-white rounded-2xl border shadow-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-50 to-indigo-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
            <Truck size={36} strokeWidth={1.5} className="text-[#1A5276] opacity-70" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Pas encore de données de livraison</h3>
          <p className="text-gray-500 text-sm max-w-sm leading-relaxed mb-6">
            Les statistiques de livraison apparaissent dès que vous enregistrez des commandes et mettez à jour leur statut (Expédiée, Livrée, Échouée...).
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push('/orders')}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1A5276] hover:bg-blue-900 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Plus size={16} /> Enregistrer des commandes
            </button>
            <button
              onClick={() => router.push('/orders')}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
            >
              Mettre à jour les statuts <ArrowRight size={16} />
            </button>
          </div>
          <div className="mt-6 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 max-w-sm">
            <p className="text-xs text-orange-700 leading-relaxed">
              💡 <span className="font-semibold">Astuce :</span> Passez une commande en statut "Expédiée" pour qu'elle apparaisse ici et que vous puissiez suivre son évolution.
            </p>
          </div>
        </div>
      )}

      {/* Contenu principal — visible seulement si des livraisons existent */}
      {(loading || allOrders.length > 0) && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Truck size={16} /> Total</div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-gray-400 mt-1">Expéditions</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 text-purple-600 text-sm mb-1"><Clock size={16} /> En transit</div>
              <p className="text-2xl font-bold text-purple-700">{stats.inTransit}</p>
              <p className="text-xs text-purple-500 mt-1">En cours</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200">
              <div className="flex items-center gap-2 text-green-600 text-sm mb-1"><CheckCircle size={16} /> Succès</div>
              <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
              <p className="text-xs text-gray-400 mt-1">Sur closes</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200">
              <div className="flex items-center gap-2 text-red-600 text-sm mb-1"><XCircle size={16} /> Échecs</div>
              <p className="text-2xl font-bold text-red-600">{stats.failedCount}</p>
              <p className="text-xs text-gray-400 mt-1">Livraisons</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 text-orange-600 text-sm mb-1"><AlertTriangle size={16} /> Pertes réelles</div>
              <p className="text-xl font-bold text-orange-600">{formatMoney(stats.failedCost)}</p>
              <p className="text-xs text-orange-500 mt-1">Achat + livraison + retour</p>
            </div>
          </div>

          {/* Corps principal */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Colonne gauche — filtres + graphiques */}
            <div className="lg:col-span-1 space-y-6">

              {/* Filtres */}
              <div className="bg-white p-4 rounded-xl shadow-sm border space-y-3">
                <h3 className="font-semibold text-sm text-gray-700">Filtres</h3>
                <div>
                  <label className="text-xs text-gray-500">Ville</label>
                  <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                    className="mt-1 w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5276]">
                    {cities.map(c => <option key={c} value={c}>{c === 'all' ? 'Toutes les villes' : c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Transporteur</label>
                  <select value={carrierFilter} onChange={e => setCarrierFilter(e.target.value)}
                    className="mt-1 w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5276]">
                    {carriers.map(c => <option key={c} value={c}>{c === 'all' ? 'Tous les transporteurs' : c}</option>)}
                  </select>
                </div>
                {(cityFilter !== 'all' || carrierFilter !== 'all') && (
                  <button onClick={() => { setCityFilter('all'); setCarrierFilter('all'); }}
                    className="text-xs text-[#E67E22] hover:underline">
                    Réinitialiser les filtres
                  </button>
                )}
              </div>

              {/* Graphique raisons d'échec */}
              {failureChartData.length > 0 ? (
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">Raisons des échecs</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={failureChartData} cx="50%" cy="42%"
                          innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                          {failureChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`${v} cas`, '']} />
                        <Legend iconType="circle" iconSize={8}
                          formatter={(value) => <span style={{ fontSize: 11, color: '#6b7280' }}>{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                /* Empty state graphique */
                <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} className="text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Aucun échec enregistré</p>
                  <p className="text-xs text-gray-400 mt-1">Excellent taux de livraison !</p>
                </div>
              )}

              {/* Taux de succès par ville */}
              {cityStats.length > 0 ? (
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                  <h3 className="font-semibold text-sm text-gray-700 mb-3">Taux de succès par ville</h3>
                  <div className="space-y-2">
                    {cityStats.slice(0, 6).map(s => (
                      <div key={s.city}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700 flex items-center gap-1">
                            <MapPin size={10} className="text-gray-400" /> {s.city}
                          </span>
                          <span className={`font-bold ${
                            s.successRate >= 70 ? 'text-green-600' :
                            s.successRate >= 50 ? 'text-orange-500' : 'text-red-600'
                          }`}>{s.successRate}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${
                            s.successRate >= 70 ? 'bg-green-500' :
                            s.successRate >= 50 ? 'bg-orange-400' : 'bg-red-500'
                          }`} style={{ width: `${s.successRate}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {s.delivered}/{s.total} livrées · {s.failed} échouées
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Colonne droite — tableau */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">
                  Détail des livraisons
                  <span className="ml-2 text-sm font-normal text-gray-400">({filteredOrders.length})</span>
                </h3>
              </div>

              {loading ? (
                <div className="p-8 space-y-3 animate-pulse">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}
                </div>
              ) : filteredOrders.length === 0 ? (
                /* Empty state tableau filtré */
                <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                    <Truck size={24} strokeWidth={1.5} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Aucune livraison pour ces filtres</p>
                  <button onClick={() => { setCityFilter('all'); setCarrierFilter('all'); }}
                    className="text-xs text-[#1A5276] hover:underline mt-1">
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="p-3 text-left">N°</th>
                        <th className="p-3 text-left">Client</th>
                        <th className="p-3 text-left">Transporteur</th>
                        <th className="p-3 text-center">Statut</th>
                        <th className="p-3 text-left">Raison échec</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredOrders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-mono text-blue-600 text-xs">{order.order_number}</td>
                          <td className="p-3">
                            <div className="font-medium text-gray-900">{order.customer_name}</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {order.customer_city || '—'}
                            </div>
                          </td>
                          <td className="p-3 text-xs">
                            {order.carrier
                              ? <span className="font-medium text-gray-700">{order.carrier}</span>
                              : <span className="text-gray-300">—</span>}
                            {order.tracking_number && (
                              <div className="text-gray-400 font-mono mt-0.5">{order.tracking_number}</div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium border ${
                              DELIVERY_STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}>
                              {DELIVERY_STATUS_LABELS[order.status] ?? order.status}
                            </span>
                          </td>
                          <td className="p-3 text-xs">
                            {order.failure_reason
                              ? <span className="text-red-600 font-medium">{FAILURE_LABELS[order.failure_reason] ?? order.failure_reason}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}