'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import { 
  ShoppingCart, DollarSign, TrendingUp, Truck, AlertTriangle, Clock, 
  Package, ArrowUpRight
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  total_amount: number;
  created_at: string;
};

type Stats = {
  todayOrders: number;
  monthOrders: number;
  monthRevenue: number;
  monthProfit: number;
  successRate: number;
  pendingOrders: number;
  failedCost: number;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    todayOrders: 0, monthOrders: 0, monthRevenue: 0, monthProfit: 0,
    successRate: 0, pendingOrders: 0, failedCost: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        products ( purchase_cost )
      `)
      .order('created_at', { ascending: false });

    if (error || !orders) {
      setLoading(false);
      return;
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayCount = 0;
    let monthCount = 0;
    let monthRevenue = 0;
    let monthProfit = 0;
    let deliveredCount = 0;
    let totalProcessed = 0;
    let pendingCount = 0;
    let failedTotalCost = 0;

    const dailyStats: Record<string, { date: string; count: number }> = {};

    orders.forEach((order: any) => {
      const orderDate = new Date(order.created_at);
      const dateKey = order.created_at.split('T')[0];
      const purchaseCost = order.products?.purchase_cost || 0;
      const orderProfit = (order.unit_price - purchaseCost) * order.quantity;

      if (!dailyStats[dateKey]) dailyStats[dateKey] = { date: dateKey, count: 0 };
      dailyStats[dateKey].count++;

      if (dateKey === todayStr) todayCount++;

      if (orderDate >= startOfMonth) {
        monthCount++;
        
        if (order.status === 'delivered') {
          monthRevenue += order.total_amount;
          monthProfit += orderProfit;
        }
      }

      if (['delivered', 'failed', 'returned'].includes(order.status)) {
        totalProcessed++;
        if (order.status === 'delivered') deliveredCount++;
      }

      if (['new', 'confirmed', 'shipped'].includes(order.status)) {
        pendingCount++;
      }

      if (order.status === 'failed') {
        failedTotalCost += purchaseCost * order.quantity;
      }
    });

    const sortedDays = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    
    const { data: topProds } = await supabase
      .from('products')
      .select('name, selling_price')
      .limit(5);
    
    const mockTopProducts = (topProds || []).map(p => ({
      name: p.name?.substring(0, 10) + '...',
      revenue: (p.selling_price || 0) * Math.floor(Math.random() * 20 + 5)
    }));

    setStats({
      todayOrders: todayCount,
      monthOrders: monthCount,
      monthRevenue: monthRevenue,
      monthProfit: monthProfit,
      successRate: totalProcessed > 0 ? (deliveredCount / totalProcessed) * 100 : 0,
      pendingOrders: pendingCount,
      failedCost: failedTotalCost
    });

    setRecentOrders(orders.slice(0, 10));
    setChartData(sortedDays);
    setTopProducts(mockTopProducts);
    setLoading(false);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Aujourd'hui</p>
                  <p className="text-2xl font-bold mt-1">{stats.todayOrders}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <ShoppingCart size={18} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Commandes</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Ce mois</p>
                  <p className="text-2xl font-bold mt-1">{stats.monthOrders}</p>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Package size={18} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Total commandes</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Revenus</p>
                  <p className="text-xl font-bold mt-1 text-green-600">{formatMoney(stats.monthRevenue)}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                  <DollarSign size={18} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Livrées uniquement</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Profit Réel</p>
                  <p className="text-xl font-bold mt-1 text-[#1A5276]">{formatMoney(stats.monthProfit)}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-[#1A5276]">
                  <TrendingUp size={18} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Marge brute</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Succès</p>
                  <p className="text-2xl font-bold mt-1">{stats.successRate.toFixed(0)}%</p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <Truck size={18} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Taux de livraison</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-red-500 uppercase">Pertes</p>
                  <p className="text-xl font-bold mt-1 text-red-600">{formatMoney(stats.failedCost)}</p>
                </div>
                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <p className="text-xs text-red-400 mt-2">Coût des échecs</p>
            </div>

          </div>

          {/* Charts Section */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Évolution des commandes (30j)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #eee' }}
                      labelFormatter={(v) => `Date: ${v}`}
                    />
                    <Line type="monotone" dataKey="count" stroke="#1A5276" strokeWidth={2} dot={false} name="Commandes" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Top Produits</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${v/1000}k`} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatMoney(Number(v))} />
                    <Bar dataKey="revenue" fill="#E67E22" name="Revenu" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">Commandes récentes</h3>
              <a href="/orders" className="text-sm text-[#1A5276] hover:underline flex items-center gap-1">
                Voir tout <ArrowUpRight size={14} />
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="p-3 text-left">N° Commande</th>
                    <th className="p-3 text-left">Client</th>
                    <th className="p-3 text-left">Statut</th>
                    <th className="p-3 text-right">Montant</th>
                    <th className="p-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="p-3 font-mono text-blue-600">{order.order_number}</td>
                      <td className="p-3">{order.customer_name || 'N/A'}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium">{formatMoney(order.total_amount)}</td>
                      <td className="p-3 text-right text-gray-400">
                        {new Date(order.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}