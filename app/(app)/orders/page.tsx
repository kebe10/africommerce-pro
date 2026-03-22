'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney, getWhatsAppLink } from '@/lib/utils';
import { 
  Plus, X, Check, Truck, XCircle, 
  Package, Phone, MapPin, User, Search, Download
} from 'lucide-react';

// Types
type Product = { id: string; name: string; selling_price: number; };
type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  status: 'new' | 'confirmed' | 'shipped' | 'delivered' | 'failed' | 'returned';
  source: string;
  total_amount: number;
  created_at: string;
  products: { name: string } | null;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customer_name: '', customer_phone: '', customer_city: '',
    product_id: '', quantity: 1, source: 'website', status: 'new'
  });

  // --- Data Fetching ---
  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, [statusFilter]);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('id, name, selling_price').eq('status', 'active');
    if (data) setProducts(data);
  }

  async function fetchOrders() {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, products(name)') 
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    if (data) setOrders(data);
    setLoading(false);
  }

  // --- Actions ---
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const product = products.find(p => p.id === newOrder.product_id);
    if (!product) return alert("Produit introuvable");
    
    const total = product.selling_price * newOrder.quantity;

    const { error } = await supabase.from('orders').insert({
      ...newOrder,
      unit_price: product.selling_price,
      total_amount: total,
    });

    if (error) {
      alert("Erreur lors de la création");
    } else {
      setIsModalOpen(false);
      setNewOrder({ customer_name: '', customer_phone: '', customer_city: '', product_id: '', quantity: 1, source: 'website', status: 'new' });
      fetchOrders();
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    
    if (!error) fetchOrders();
  };

  // --- EXPORT EXCEL (CSV) ---
  const exportToCSV = () => {
    if (filteredOrders.length === 0) {
      alert("Aucune commande à exporter.");
      return;
    }

    // En-têtes du fichier
    const headers = [
      "N° Commande", "Client", "Téléphone", "Ville", "Produit", "Statut", 
      "Montant Total (FCFA)", "Source", "Date"
    ];

    // Conversion des données
    const rows = filteredOrders.map(order => [
      order.order_number,
      order.customer_name,
      order.customer_phone,
      order.customer_city,
      order.products?.name || 'N/A',
      order.status,
      order.total_amount,
      order.source,
      new Date(order.created_at).toLocaleDateString('fr-FR')
    ]);

    // Création du contenu CSV (avec séparateur ; pour Excel Français)
    const csvContent = 
      "\uFEFF" + // BOM pour UTF-8
      headers.join(";") + "\n" + 
      rows.map(row => row.join(";")).join("\n");

    // Téléchargement
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `commandes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- UI Helpers ---
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      confirmed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      shipped: 'bg-purple-100 text-purple-800 border-purple-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      returned: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    const labels: Record<string, string> = {
      new: 'Nouveau', confirmed: 'Confirmé', shipped: 'Expédié',
      delivered: 'Livré', failed: 'Échoué', returned: 'Retourné'
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getSourceIcon = (source: string) => {
    switch(source) {
      case 'whatsapp': return <span className="text-green-600 font-bold text-xs">WA</span>;
      case 'facebook': return <span className="text-blue-600 font-bold text-xs">FB</span>;
      case 'instagram': return <span className="text-pink-600 font-bold text-xs">IG</span>;
      default: return <span className="text-gray-600 font-bold text-xs">WEB</span>;
    }
  };

  const filteredOrders = orders.filter(o => 
    o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.order_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Commandes</h1>
          <p className="text-gray-500 text-sm">{filteredOrders.length} commandes trouvées</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* BOUTON EXPORT EXCEL */}
          <button 
            onClick={exportToCSV}
            className="flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-sm whitespace-nowrap"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Exporter Excel</span>
          </button>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#E67E22] hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nouvelle Commande</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher (N°, Client...)" 
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-4 py-2 bg-white min-w-[180px]"
        >
          <option value="all">Tous les statuts</option>
          <option value="new">🟦 Nouveau</option>
          <option value="confirmed">🟨 Confirmé</option>
          <option value="shipped">🟪 Expédié</option>
          <option value="delivered">🟩 Livré</option>
          <option value="failed">🟥 Échoué</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
              <tr>
                <th className="p-4 text-left">Commande</th>
                <th className="p-4 text-left">Client</th>
                <th className="p-4 text-left">Produit</th>
                <th className="p-4 text-center">Source</th>
                <th className="p-4 text-center">Statut</th>
                <th className="p-4 text-right">Montant</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="text-center p-10 text-gray-400">Chargement...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-10 text-gray-400">Aucune commande trouvée</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 group">
                    <td className="p-4">
                      <div className="font-mono font-medium text-[#1A5276]">{order.order_number}</div>
                      <div className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{order.customer_name || 'N/A'}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone size={12} /> {order.customer_phone}
                      </div>
                    </td>
                    <td className="p-4 text-gray-700">{order.products?.name || 'Produit supprimé'}</td>
                    <td className="p-4 text-center">{getSourceIcon(order.source)}</td>
                    <td className="p-4 text-center">{getStatusBadge(order.status)}</td>
                    <td className="p-4 text-right font-semibold">{formatMoney(order.total_amount)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {order.status === 'new' && (
                          <button onClick={() => updateStatus(order.id, 'confirmed')} className="p-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200" title="Confirmer">
                            <Check size={14} />
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button onClick={() => updateStatus(order.id, 'shipped')} className="p-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200" title="Expédier">
                            <Truck size={14} />
                          </button>
                        )}
                         {order.status === 'shipped' && (
                           <div className="flex gap-1">
                              <button onClick={() => updateStatus(order.id, 'delivered')} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Livrer">
                                <Check size={14} />
                              </button>
                              <button onClick={() => updateStatus(order.id, 'failed')} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Échec">
                                <XCircle size={14} />
                              </button>
                           </div>
                        )}
                        {/* WhatsApp Button */}
                        <a
                          href={getWhatsAppLink(order.customer_phone, `Bonjour ${order.customer_name}, votre commande ${order.order_number} est ${order.status}.`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200" title="WhatsApp"
                        >
                          <Phone size={14} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL NOUVELLE COMMANDE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">Nouvelle Commande</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              
              {/* Section Client */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase flex items-center gap-2"><User size={14} /> Info Client</h3>
                <input 
                  type="text" placeholder="Nom complet" required
                  value={newOrder.customer_name}
                  onChange={(e) => setNewOrder({...newOrder, customer_name: e.target.value})}
                  className="w-full border rounded-lg p-2.5"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text" placeholder="Téléphone" required
                    value={newOrder.customer_phone}
                    onChange={(e) => setNewOrder({...newOrder, customer_phone: e.target.value})}
                    className="w-full border rounded-lg p-2.5"
                  />
                  <input 
                    type="text" placeholder="Ville" required
                    value={newOrder.customer_city}
                    onChange={(e) => setNewOrder({...newOrder, customer_city: e.target.value})}
                    className="w-full border rounded-lg p-2.5"
                  />
                </div>
              </div>

              {/* Section Commande */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-500 uppercase flex items-center gap-2"><Package size={14} /> Détails</h3>
                
                <select 
                  required
                  value={newOrder.product_id}
                  onChange={(e) => setNewOrder({...newOrder, product_id: e.target.value})}
                  className="w-full border rounded-lg p-2.5 bg-white"
                >
                  <option value="">Sélectionner un produit</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({formatMoney(p.selling_price)})</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Quantité</label>
                    <input 
                      type="number" min="1" value={newOrder.quantity}
                      onChange={(e) => setNewOrder({...newOrder, quantity: Number(e.target.value)})}
                      className="w-full border rounded-lg p-2.5 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Source</label>
                    <select 
                      value={newOrder.source}
                      onChange={(e) => setNewOrder({...newOrder, source: e.target.value})}
                      className="w-full border rounded-lg p-2.5 mt-1 bg-white"
                    >
                      <option value="website">Site Web</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="phone">Téléphone</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  Annuler
                </button>
                <button type="submit" className="px-6 py-2.5 bg-[#1A5276] text-white rounded-lg hover:bg-blue-900 shadow-sm font-medium">
                  Créer la commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}