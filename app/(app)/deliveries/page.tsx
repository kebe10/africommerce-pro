'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import { Truck, CheckCircle, XCircle, AlertTriangle, MapPin } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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
  products: { purchase_cost: number } | null;
};

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#3b82f6'];

export default function DeliveriesPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('all');
  const [carrierFilter, setCarrierFilter] = useState('all');

  useEffect(() => {
    fetchDeliveries();
  }, []);

  async function fetchDeliveries() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, products(purchase_cost)')
      .in('status', ['shipped', 'delivered', 'failed', 'returned'])
      .order('created_at', { ascending: false });

    if (data) setAllOrders(data);
    setLoading(false);
  }

  const cities = useMemo(() => {
    // On force le type string avec "as string[]"
    const unique = new Set(allOrders.map(o => o.customer_city).filter(Boolean) as string[]);
    return ['all', ...Array.from(unique)];
  }, [allOrders]);

  const carriers = useMemo(() => {
    // On force le type string avec "as string[]"
    const unique = new Set(allOrders.map(o => o.carrier).filter(Boolean) as string[]);
    return ['all', ...Array.from(unique)];
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => {
      const cityMatch = cityFilter === 'all' || o.customer_city === cityFilter;
      const carrierMatch = carrierFilter === 'all' || o.carrier === carrierFilter;
      return cityMatch && carrierMatch;
    });
  }, [allOrders, cityFilter, carrierFilter]);

  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const delivered = filteredOrders.filter(o => o.status === 'delivered').length;
    const failed = filteredOrders.filter(o => o.status === 'failed').length;
    
    const failedCost = filteredOrders.reduce((acc, o) => {
      if (o.status === 'failed' && o.products) return acc + (o.products.purchase_cost || 0);
      return acc;
    }, 0);

    return { total, successRate: total > 0 ? ((delivered / total) * 100).toFixed(0) : 0, failedCount: failed, failedCost };
  }, [filteredOrders]);

  const failureChartData = useMemo(() => {
    const reasons: Record<string, number> = {};
    filteredOrders.forEach(o => {
      if (o.status === 'failed' && o.failure_reason) reasons[o.failure_reason] = (reasons[o.failure_reason] || 0) + 1;
    });
    const labels: Record<string, string> = { absent: 'Absent', refused: 'Refusé', unreachable: 'Injoignable', wrong_address: 'Mauvaise adresse', damaged: 'Endommagé' };
    return Object.entries(reasons).map(([name, value]) => ({ name: labels[name] || name, value }));
  }, [filteredOrders]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Suivi des Livraisons</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border"><div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Truck size={16} /> Total</div><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200"><div className="flex items-center gap-2 text-green-600 text-sm mb-1"><CheckCircle size={16} /> Succès</div><p className="text-2xl font-bold text-green-600">{stats.successRate}%</p></div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200"><div className="flex items-center gap-2 text-red-600 text-sm mb-1"><XCircle size={16} /> Échecs</div><p className="text-2xl font-bold text-red-600">{stats.failedCount}</p></div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-200 bg-orange-50"><div className="flex items-center gap-2 text-orange-600 text-sm mb-1"><AlertTriangle size={16} /> Pertes</div><p className="text-xl font-bold text-orange-600">{formatMoney(stats.failedCost)}</p></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Filtres</h3>
            <div><label className="text-xs text-gray-500">Ville</label><select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="mt-1 w-full border rounded-lg p-2 text-sm">{cities.map(c => <option key={c} value={c}>{c === 'all' ? 'Toutes' : c}</option>)}</select></div>
            <div><label className="text-xs text-gray-500">Transporteur</label><select value={carrierFilter} onChange={(e) => setCarrierFilter(e.target.value)} className="mt-1 w-full border rounded-lg p-2 text-sm">{carriers.map(c => <option key={c} value={c}>{c === 'all' ? 'Tous' : c}</option>)}</select></div>
          </div>
          {failureChartData.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Raisons des échecs</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={failureChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">{failureChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-semibold">Détail</h3></div>
          {loading ? <div className="p-10 text-center text-gray-400">Chargement...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs"><tr><th className="p-3 text-left">N°</th><th className="p-3 text-left">Client</th><th className="p-3 text-left">Transporteur</th><th className="p-3 text-center">Statut</th><th className="p-3 text-left">Raison</th></tr></thead>
                <tbody className="divide-y">
                  {filteredOrders.length === 0 ? <tr><td colSpan={5} className="text-center p-10 text-gray-400">Aucune donnée</td></tr> : filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-blue-600 text-xs">{order.order_number}</td>
                      <td className="p-3"><div className="font-medium">{order.customer_name}</div><div className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} /> {order.customer_city}</div></td>
                      <td className="p-3 text-xs">{order.carrier ? <span className="font-medium">{order.carrier}</span> : <span className="text-gray-400">-</span>}</td>
                      <td className="p-3 text-center"><span className={`text-xs px-2 py-1 rounded-full font-medium border ${order.status === 'delivered' ? 'bg-green-100 text-green-800 border-green-200' : ''} ${order.status === 'shipped' ? 'bg-purple-100 text-purple-800 border-purple-200' : ''} ${order.status === 'failed' ? 'bg-red-100 text-red-800 border-red-200' : ''}`}>{order.status === 'delivered' ? 'Livré' : order.status === 'shipped' ? 'En cours' : 'Échoué'}</span></td>
                      <td className="p-3 text-xs text-red-600 font-medium">{order.failure_reason ? order.failure_reason.replace('_', ' ') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}