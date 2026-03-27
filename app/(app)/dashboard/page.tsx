'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import Link from 'next/link';
import { ShoppingBag, Package, TrendingUp, AlertCircle, ArrowRight, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, products: 0, lowStock: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Données pour les graphiques
  const [revenueChartData, setRevenueChartData] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    // 1. Stats globales & Graphiques
    const { data: ordersData } = await supabase.from('orders').select('total_amount, status, created_at');
    const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
    const { data: lowStockData } = await supabase.from('products').select('id').lt('stock_quantity', 5);

    if (ordersData) {
      const revenue = ordersData.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      setStats({
        revenue,
        orders: ordersData.length,
        products: productsCount || 0,
        lowStock: lowStockData?.length || 0
      });

      // Préparer les données pour le graphique de revenus (7 derniers jours)
      const last7Days: { [key: string]: number } = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
        last7Days[key] = 0;
      }

      ordersData.forEach(order => {
        if (order.created_at) {
          const dateKey = order.created_at.split('T')[0];
          if (last7Days.hasOwnProperty(dateKey)) {
            last7Days[dateKey] += order.total_amount || 0;
          }
        }
      });

      const chartData = Object.keys(last7Days).map(date => ({
        date: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
        revenue: last7Days[date]
      }));
      setRevenueChartData(chartData);

      // Préparer les données pour le Pie Chart (Statuts)
      const statusCounts: { [key: string]: number } = { 'new': 0, 'confirmed': 0, 'delivered': 0, 'cancelled': 0 };
      ordersData.forEach(o => {
        if (statusCounts.hasOwnProperty(o.status)) statusCounts[o.status]++;
      });
      
      const pieData = [
        { name: 'Nouveaux', value: statusCounts.new, color: '#3B82F6' },
        { name: 'Confirmés', value: statusCounts.confirmed, color: '#F59E0B' },
        { name: 'Livrés', value: statusCounts.delivered, color: '#10B981' },
        { name: 'Annulés', value: statusCounts.cancelled, color: '#EF4444' },
      ];
      setOrderStatusData(pieData);
    }

    // 2. Commandes récentes
    const { data: recent } = await supabase
      .from('orders')
      .select('id, created_at, customer_name, total_amount, status, products(name)')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (recent) setRecentOrders(recent);

    setLoading(false);
  }

  // --- Fonctions Couleur et Traduction ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'confirmed': return 'bg-yellow-100 text-yellow-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Nouveau';
      case 'confirmed': return 'Confirmée';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500">Aperçu de votre activité</p>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Revenus</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoney(stats.revenue)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg text-green-600">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Commandes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.orders}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
              <ShoppingBag size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Produits</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.products}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Stock Bas</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.lowStock}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg text-orange-600">
              <AlertCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Graphique Revenus (2/3 de la largeur) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Revenus (7 derniers jours)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatMoney(value)} />
                <Line type="monotone" dataKey="revenue" stroke="#E67E22" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique Statuts (1/3 de la largeur) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Statut des commandes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Commandes Récentes */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Commandes Récentes</h2>
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
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentOrders.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Aucune commande récente</td></tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{order.customer_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{order.products?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">{formatMoney(order.total_amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions - Bouton Ajouter Produit en bas */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-[#1A5276] to-blue-800 rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-lg font-bold mb-2">Prêt à vendre ?</h3>
          <p className="text-blue-100 text-sm mb-4">Ajoutez rapidement un nouveau produit.</p>
          <Link href="/products" className="inline-flex items-center gap-2 bg-white text-[#1A5276] px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-100">
            <Plus size={16} /> Ajouter un produit
          </Link>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Besoin d'aide ?</h3>
          <p className="text-gray-500 text-sm mb-4">Notre support est là pour vous aider.</p>
          <button className="inline-flex items-center gap-2 text-[#E67E22] font-medium text-sm hover:underline">
            Contacter le support
          </button>
        </div>
      </div>
    </div>
  );
}