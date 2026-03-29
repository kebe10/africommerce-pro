'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import {
  Plus, X, CheckCircle, Truck, Search,
  Download, ShoppingBag, Clock, XCircle
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
};

type Order = {
  id: string;
  order_number: string;
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
  failure_reason: string | null;
  carrier: string | null;
  delivery_cost: number;
  ad_cost_per_order: number;
  products: { name: string } | null;
};

type NewOrderForm = {
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  product_id: string;
  quantity: number;
  source: string;
  status: string;
  failure_reason: string;
  carrier: string;
  delivery_cost: number;
  ad_cost_per_order: number;
};

// ── Constantes ────────────────────────────────────────────────────────────────

// CORRECTION : constante hors du composant
const EMPTY_ORDER: NewOrderForm = {
  customer_name:    '',
  customer_phone:   '',
  customer_city:    '',
  product_id:       '',
  quantity:         1,
  source:           'whatsapp', // source principale en Afrique
  status:           'new',
  failure_reason:   '',
  carrier:          '',
  delivery_cost:    0,
  ad_cost_per_order: 0,
};

// CORRECTION : 6 statuts complets alignés avec le schéma
const STATUS_LABELS: Record<string, string> = {
  new:       'Nouveau',
  confirmed: 'Confirmée',
  shipped:   'Expédiée',
  delivered: 'Livrée',
  failed:    'Échouée',
  returned:  'Retournée',
};

const STATUS_COLORS: Record<string, string> = {
  new:       'bg-blue-100 text-blue-700 border-blue-200',
  confirmed: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  shipped:   'bg-purple-100 text-purple-700 border-purple-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
  failed:    'bg-red-100 text-red-700 border-red-200',
  returned:  'bg-gray-100 text-gray-700 border-gray-200',
};

// CORRECTION : motifs d'échec traduits
const FAILURE_LABELS: Record<string, string> = {
  absent:        'Absent',
  refused:       'Refus client',
  unreachable:   'Injoignable',
  wrong_address: 'Mauvaise adresse',
  damaged:       'Endommagé',
};

// Source avec icône
const SOURCE_LABELS: Record<string, string> = {
  whatsapp:  '💬 WhatsApp',
  facebook:  '📘 Facebook',
  instagram: '📷 Instagram',
  website:   '🌐 Site Web',
  phone:     '📞 Téléphone',
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function OrdersPage() {

  // — Données
  const [orders, setOrders]     = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // — UI
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [newOrder, setNewOrder]         = useState<NewOrderForm>(EMPTY_ORDER);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    // CORRECTION : fetches en parallèle
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchOrders(), fetchProducts()]);
      setLoading(false);
    };
    init();
  }, []);

  async function fetchProducts() {
    // CORRECTION : gestion d'erreur explicite
    const { data, error } = await supabase
      .from('products')
      .select('id, name, selling_price, stock_quantity')
      .eq('status', 'active');
    if (error) console.error('Produits:', error.message);
    else if (data) setProducts(data as Product[]);
  }

  async function fetchOrders() {
    // CORRECTION : gestion d'erreur explicite
    const { data, error } = await supabase
      .from('orders')
      .select('*, products(name)')
      .order('created_at', { ascending: false });
    if (error) console.error('Commandes:', error.message);
    else if (data) setOrders(data as Order[]);
  }

  // ── Filtrage ──────────────────────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
        || o.customer_phone.includes(searchQuery)
        || o.order_number?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  // CORRECTION : déclaré après filteredOrders
  const stats = useMemo(() => {
    const delivered = filteredOrders.filter(o => o.status === 'delivered');
    const pending   = filteredOrders.filter(o => ['new', 'confirmed', 'shipped'].includes(o.status));
    const failed    = filteredOrders.filter(o => ['failed', 'returned'].includes(o.status));
    const revenue   = delivered.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
    return {
      total:   filteredOrders.length,
      revenue,
      pending: pending.length,
      failed:  failed.length,
    };
  }, [filteredOrders]);

  // ── Actions ───────────────────────────────────────────────────────────────

  // CORRECTION : mise à jour optimiste avec rollback
  const updateOrderStatus = async (id: string, status: string) => {
    const previous = orders;
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) {
      console.error('Statut:', error.message);
      setOrders(previous); // rollback
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Non connecté'); return; }

    const product = products.find(p => p.id === newOrder.product_id);
    if (!product) { alert('Produit introuvable'); return; }

    const total = product.selling_price * newOrder.quantity;

    const { error } = await supabase.from('orders').insert({
      ...newOrder,
      failure_reason: newOrder.failure_reason || null,
      unit_price:     product.selling_price,
      total_amount:   total,
      user_id:        user.id,
    });

    if (error) alert('Erreur lors de la création : ' + error.message);
    else {
      setIsModalOpen(false);
      // CORRECTION : réinitialisation via constante
      setNewOrder(EMPTY_ORDER);
      await fetchOrders();
    }
  };

  // ── Export CSV ────────────────────────────────────────────────────────────

  const exportToCSV = () => {
    if (filteredOrders.length === 0) { alert('Aucune donnée à exporter.'); return; }

    const headers = [
      'N° Commande', 'Client', 'Téléphone', 'Ville', 'Produit',
      'Qté', 'Montant', 'Source', 'Statut', 'Motif échec',
      'Transporteur', 'Frais livraison', 'Coût pub', 'Date',
    ];

    const rows = filteredOrders.map(o => [
      o.order_number || '',
      o.customer_name,
      o.customer_phone,
      o.customer_city,
      o.products?.name || 'N/A',
      o.quantity,
      o.total_amount,
      SOURCE_LABELS[o.source] ?? o.source,
      STATUS_LABELS[o.status] ?? o.status,
      o.failure_reason ? (FAILURE_LABELS[o.failure_reason] ?? o.failure_reason) : '',
      o.carrier || '',
      o.delivery_cost ?? 0,
      o.ad_cost_per_order ?? 0,
      new Date(o.created_at).toLocaleDateString('fr-FR'),
    ]);

    const csv  = '\uFEFF' + headers.join(';') + '\n' + rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href     = URL.createObjectURL(blob);
    link.download = `commandes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="text-gray-500 text-sm">{orders.length} commande{orders.length > 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Download size={16} /> Exporter
          </button>
          <button
            onClick={() => { setNewOrder(EMPTY_ORDER); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-[#E67E22] hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow-sm text-sm font-medium transition"
          >
            <Plus size={16} /> Nouvelle Commande
          </button>
        </div>
      </div>

      {/* CORRECTION : 4 KPIs complets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-lg shrink-0">
            <ShoppingBag size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total commandes</p>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
          <div className="p-2.5 bg-green-100 rounded-lg shrink-0">
            <Truck size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Revenus livrés</p>
            <p className="text-lg font-bold text-green-700">{formatMoney(stats.revenue)}</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl shadow-sm border flex items-center gap-3 ${
          stats.pending > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white'
        }`}>
          <div className={`p-2.5 rounded-lg shrink-0 ${
            stats.pending > 0 ? 'bg-orange-100' : 'bg-gray-100'
          }`}>
            <Clock size={18} className={stats.pending > 0 ? 'text-orange-500' : 'text-gray-400'} />
          </div>
          <div>
            <p className="text-xs text-gray-500">En attente</p>
            <p className={`text-xl font-bold ${stats.pending > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              {stats.pending}
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-xl shadow-sm border flex items-center gap-3 ${
          stats.failed > 0 ? 'bg-red-50 border-red-200' : 'bg-white'
        }`}>
          <div className={`p-2.5 rounded-lg shrink-0 ${
            stats.failed > 0 ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <XCircle size={18} className={stats.failed > 0 ? 'text-red-500' : 'text-gray-400'} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Échouées</p>
            <p className={`text-xl font-bold ${stats.failed > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {stats.failed}
            </p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone ou N° commande..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
          />
        </div>
        {/* CORRECTION : 6 statuts dans le filtre */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 bg-white text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
              <tr>
                <th className="p-4 text-left">N°</th>
                <th className="p-4 text-left">Client</th>
                <th className="p-4 text-left">Produit</th>
                <th className="p-4 text-left">Source</th>
                <th className="p-4 text-right">Montant</th>
                <th className="p-4 text-left">Statut</th>
                <th className="p-4 text-left">Transporteur</th>
                <th className="p-4 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <div className="space-y-3 animate-pulse">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                // CORRECTION : empty state
                <tr>
                  <td colSpan={8} className="text-center p-12 text-gray-400">
                    <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {searchQuery ? `Aucune commande pour "${searchQuery}"` : 'Aucune commande trouvée'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">

                    {/* N° commande */}
                    <td className="p-4">
                      <span className="font-mono text-xs text-blue-600">
                        {order.order_number || '—'}
                      </span>
                    </td>

                    {/* Client */}
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{order.customer_name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {order.customer_phone}
                        {order.customer_city && ` · ${order.customer_city}`}
                      </div>
                    </td>

                    {/* Produit */}
                    <td className="p-4">
                      <span className="text-gray-800">{order.products?.name ?? 'N/A'}</span>
                      <span className="text-gray-400 ml-1">×{order.quantity}</span>
                    </td>

                    {/* CORRECTION : source affichée avec emoji */}
                    <td className="p-4 text-xs text-gray-500">
                      {SOURCE_LABELS[order.source] ?? order.source}
                    </td>

                    {/* Montant */}
                    <td className="p-4 text-right font-medium">
                      {formatMoney(order.total_amount)}
                    </td>

                    {/* CORRECTION : select avec 6 statuts */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <select
                          value={order.status}
                          onChange={e => updateOrderStatus(order.id, e.target.value)}
                          className={`text-xs border rounded-lg px-2 py-1 cursor-pointer focus:outline-none w-full ${
                            STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        {/* CORRECTION : motif d'échec affiché si présent */}
                        {order.failure_reason && (
                          <span className="text-xs text-red-500 block">
                            {FAILURE_LABELS[order.failure_reason] ?? order.failure_reason}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Transporteur */}
                    <td className="p-4 text-xs text-gray-500">
                      {order.carrier || <span className="text-gray-300">—</span>}
                    </td>

                    {/* Date */}
                    <td className="p-4 text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pied de tableau */}
          {filteredOrders.length > 0 && (
            <div className="px-4 py-3 border-t bg-gray-50 text-xs text-gray-400">
              {filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''} affichée{filteredOrders.length > 1 ? 's' : ''}
              {statusFilter !== 'all' && ` · Filtre : ${STATUS_LABELS[statusFilter]}`}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL NOUVELLE COMMANDE ──────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">Nouvelle Commande</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-gray-500 transition">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">

                {/* Client */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du client *</label>
                  <input
                    type="text" required
                    value={newOrder.customer_name}
                    onChange={e => setNewOrder({ ...newOrder, customer_name: e.target.value })}
                    placeholder="Ex: Kouamé Yao"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                  <input
                    type="tel" required
                    value={newOrder.customer_phone}
                    onChange={e => setNewOrder({ ...newOrder, customer_phone: e.target.value })}
                    placeholder="+225 07 00 00 00"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    value={newOrder.customer_city}
                    onChange={e => setNewOrder({ ...newOrder, customer_city: e.target.value })}
                    placeholder="Abidjan"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>

                {/* Produit */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produit *</label>
                  <select
                    required
                    value={newOrder.product_id}
                    onChange={e => setNewOrder({ ...newOrder, product_id: e.target.value })}
                    className="w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#1A5276]"
                  >
                    <option value="">Sélectionner un produit</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatMoney(p.selling_price)} (Stock : {p.stock_quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité *</label>
                  <input
                    type="number" min="1" required
                    value={newOrder.quantity}
                    onChange={e => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>

                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select
                    value={newOrder.source}
                    onChange={e => setNewOrder({ ...newOrder, source: e.target.value })}
                    className="w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#1A5276]"
                  >
                    {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={newOrder.status}
                    onChange={e => setNewOrder({ ...newOrder, status: e.target.value })}
                    className="w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#1A5276]"
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* CORRECTION : motif d'échec conditionnel */}
                {(newOrder.status === 'failed' || newOrder.status === 'returned') && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motif d'échec</label>
                    <select
                      value={newOrder.failure_reason}
                      onChange={e => setNewOrder({ ...newOrder, failure_reason: e.target.value })}
                      className="w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#1A5276]"
                    >
                      <option value="">Sélectionner un motif</option>
                      {Object.entries(FAILURE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Transporteur */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transporteur</label>
                  <input
                    type="text"
                    value={newOrder.carrier}
                    onChange={e => setNewOrder({ ...newOrder, carrier: e.target.value })}
                    placeholder="Ex: Amana, Zem Moto..."
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>

                {/* Coûts */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frais livraison (FCFA)</label>
                  <input
                    type="number" min="0"
                    value={newOrder.delivery_cost}
                    onChange={e => setNewOrder({ ...newOrder, delivery_cost: Number(e.target.value) })}
                    placeholder="1 500"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coût pub (FCFA)</label>
                  <input
                    type="number" min="0"
                    value={newOrder.ad_cost_per_order}
                    onChange={e => setNewOrder({ ...newOrder, ad_cost_per_order: Number(e.target.value) })}
                    placeholder="500"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>

                {/* Aperçu total */}
                {newOrder.product_id && newOrder.quantity > 0 && (() => {
                  const product = products.find(p => p.id === newOrder.product_id);
                  if (!product) return null;
                  const total = product.selling_price * newOrder.quantity;
                  return (
                    <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex justify-between text-sm">
                      <span className="text-blue-700">Total commande</span>
                      <span className="font-bold text-blue-800">{formatMoney(total)}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#E67E22] text-white rounded-lg hover:bg-orange-600 font-medium transition"
                >
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