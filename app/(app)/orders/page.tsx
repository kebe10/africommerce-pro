'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import { Plus, X, CheckCircle, Truck, Loader2, Search, Download } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
};

type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  source: string;
  status: string;
  carrier: string | null;
  delivery_cost: number;
  ad_cost_per_order: number;
  products: { name: string } | null;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [newOrder, setNewOrder] = useState({
    customer_name: '',
    customer_phone: '',
    customer_city: '',
    product_id: '',
    quantity: 1,
    source: 'website',
    status: 'new',
    carrier: '',
    delivery_cost: 0,        // NOUVEAU
    ad_cost_per_order: 0     // NOUVEAU
  });

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('id, name, selling_price, stock_quantity').eq('status', 'active');
    if (data) setProducts(data);
  }

  async function fetchOrders() {
    setLoading(true);
    // On sélectionne aussi les nouveaux champs
    const { data } = await supabase.from('orders').select('*, products(name)').order('created_at', { ascending: false });
    if (data) setOrders(data as Order[]);
    setLoading(false);
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Non connecté");

    const product = products.find(p => p.id === newOrder.product_id);
    if (!product) return alert("Produit introuvable");
    
    const total = product.selling_price * newOrder.quantity;

    const { error } = await supabase.from('orders').insert({
      ...newOrder,
      unit_price: product.selling_price,
      total_amount: total,
      user_id: user.id
    });

    if (error) alert("Erreur lors de la création");
    else {
      setIsModalOpen(false);
      setNewOrder({ 
        customer_name: '', customer_phone: '', customer_city: '', product_id: '', quantity: 1, 
        source: 'website', status: 'new', carrier: '', delivery_cost: 0, ad_cost_per_order: 0 
      });
      fetchOrders();
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) alert("Erreur mise à jour: " + error.message);
    else fetchOrders();
  };

  // --- EXPORT CSV ---
  const exportToCSV = () => {
    if (filteredOrders.length === 0) return alert("Aucune donnée à exporter.");
    
    const headers = ["Client", "Téléphone", "Ville", "Produit", "Quantité", "Montant Total", "Statut", "Transporteur", "Frais Livraison", "Coût Pub", "Date"];
    
    const rows = filteredOrders.map(order => [
      order.customer_name,
      order.customer_phone,
      order.customer_city,
      order.products?.name || 'N/A',
      order.quantity,
      order.total_amount,
      getStatusLabel(order.status),
      order.carrier || '',
      order.delivery_cost || 0,
      order.ad_cost_per_order || 0,
      new Date(order.created_at).toLocaleDateString('fr-FR')
    ]);

    const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `commandes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_phone.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const revenue = filteredOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const count = filteredOrders.length;
    return { revenue, count };
  }, [filteredOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'confirmed': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Commandes</h1><p className="text-gray-500 text-sm">{stats.count} commandes</p></div>
        <div className="flex gap-2">
            <button onClick={exportToCSV} className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
                <Download size={18} /> Exporter
            </button>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-[#E67E22] hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow-sm text-sm font-medium">
                <Plus size={18} /> Nouvelle Commande
            </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><Truck size={22} /></div>
          <div><p className="text-xs text-gray-500">Revenus Total</p><p className="text-xl font-bold text-gray-900">{formatMoney(stats.revenue)}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg text-green-600"><CheckCircle size={22} /></div>
          <div><p className="text-xs text-gray-500">Commandes</p><p className="text-xl font-bold text-gray-900">{stats.count}</p></div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2 border rounded-lg" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-4 py-2 bg-white min-w-[150px]">
          <option value="all">Tous les statuts</option>
          <option value="new">Nouveau</option>
          <option value="confirmed">Confirmée</option>
          <option value="delivered">Livrée</option>
          <option value="cancelled">Annulée</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs"><tr>
              <th className="p-4 text-left">Client</th>
              <th className="p-4 text-left">Produit</th>
              <th className="p-4 text-right">Montant</th>
              <th className="p-4 text-left">Statut</th>
              <th className="p-4 text-left">Transporteur</th>
              <th className="p-4 text-left">Date</th>
            </tr></thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={6} className="text-center p-10 text-gray-400">Chargement...</td></tr> : 
               filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-semibold text-gray-900">{order.customer_name}</div>
                    <div className="text-xs text-gray-400">{order.customer_phone} - {order.customer_city}</div>
                  </td>
                  <td className="p-4">{order.products?.name} <span className="text-gray-400">x{order.quantity}</span></td>
                  <td className="p-4 text-right font-medium">{formatMoney(order.total_amount)}</td>
                  <td className="p-4">
                    <select 
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className={`text-xs border rounded-lg px-2 py-1 cursor-pointer focus:outline-none ${getStatusColor(order.status)}`}
                    >
                      <option value="new">Nouveau</option>
                      <option value="confirmed">Confirmée</option>
                      <option value="delivered">Livrée</option>
                      <option value="cancelled">Annulée</option>
                    </select>
                  </td>
                  <td className="p-4 text-xs text-gray-500">{order.carrier || '-'}</td>
                  <td className="p-4 text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOUVELLE COMMANDE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">Nouvelle Commande</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                  <input type="text" required value={newOrder.customer_name} onChange={(e) => setNewOrder({...newOrder, customer_name: e.target.value})} className="w-full border rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                  <input type="tel" required value={newOrder.customer_phone} onChange={(e) => setNewOrder({...newOrder, customer_phone: e.target.value})} className="w-full border rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input type="text" value={newOrder.customer_city} onChange={(e) => setNewOrder({...newOrder, customer_city: e.target.value})} className="w-full border rounded-lg p-2.5" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produit *</label>
                  <select required value={newOrder.product_id} onChange={(e) => setNewOrder({...newOrder, product_id: e.target.value})} className="w-full border rounded-lg p-2.5 bg-white">
                    <option value="">Sélectionner</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité *</label>
                  <input type="number" min="1" required value={newOrder.quantity} onChange={(e) => setNewOrder({...newOrder, quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2.5" />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select value={newOrder.source} onChange={(e) => setNewOrder({...newOrder, source: e.target.value})} className="w-full border rounded-lg p-2.5 bg-white">
                    <option value="website">Site Web</option>
                    <option value="facebook">Facebook</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transporteur</label>
                  <input
                    type="text"
                    value={newOrder.carrier}
                    onChange={(e) => setNewOrder({...newOrder, carrier: e.target.value})}
                    className="w-full border rounded-lg p-2.5"
                    placeholder="Ex: Zem Moto..."
                  />
                </div>

                {/* NOUVEAUX CHAMPS */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frais Livraison</label>
                  <input
                    type="number"
                    value={newOrder.delivery_cost}
                    onChange={(e) => setNewOrder({...newOrder, delivery_cost: Number(e.target.value)})}
                    className="w-full border rounded-lg p-2.5"
                    placeholder="Ex: 1500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coût Pub</label>
                  <input
                    type="number"
                    value={newOrder.ad_cost_per_order}
                    onChange={(e) => setNewOrder({...newOrder, ad_cost_per_order: Number(e.target.value)})}
                    className="w-full border rounded-lg p-2.5"
                    placeholder="Ex: 500"
                  />
                </div>

              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button type="submit" className="px-6 py-2.5 bg-[#E67E22] text-white rounded-lg hover:bg-orange-600 shadow-sm font-medium">Créer la commande</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}