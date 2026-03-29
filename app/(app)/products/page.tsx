'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatMoney, calculateMargin } from '@/lib/utils';
import {
  Plus, Minus, Edit2, Trash2, Package,
  Search, X, TrendingUp, AlertTriangle,
  Lightbulb, BarChart2
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  sku: string;
  photo_url: string;
  category: string;
  purchase_cost: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  status: string;
};

type FormData = {
  name: string;
  sku: string;
  category: string;
  photo_url: string;
  purchase_cost: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
};

// ── Constantes ────────────────────────────────────────────────────────────────

// CORRECTION : hors du composant — ne pas recréer à chaque render
const EMPTY_FORM: FormData = {
  name: '', sku: '', category: '', photo_url: '',
  purchase_cost: 0, selling_price: 0,
  stock_quantity: 0, low_stock_threshold: 10,
};

// CORRECTION : statuts traduits en français
const STATUS_LABELS: Record<string, string> = {
  active:       'Actif',
  paused:       'En pause',
  out_of_stock: 'Rupture',
  archived:     'Archivé',
};

const STATUS_COLORS: Record<string, string> = {
  active:       'bg-green-100 text-green-700',
  paused:       'bg-yellow-100 text-yellow-700',
  out_of_stock: 'bg-red-100 text-red-700',
  archived:     'bg-gray-100 text-gray-500',
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const router = useRouter();

  // — Données
  const [products, setProducts] = useState<Product[]>([]);

  // — UI
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'out_of_stock' | 'archived'>('all');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isEditing, setIsEditing]       = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [formData, setFormData]         = useState<FormData>(EMPTY_FORM);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    setLoading(true);
    // CORRECTION : gestion d'erreur explicite
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('Produits:', error.message);
    else if (data) setProducts(data as Product[]);
    setLoading(false);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  // CORRECTION : KPIs ajoutés
  const stats = useMemo(() => ({
    total:      products.length,
    lowStock:   products.filter(p =>
      p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
    ).length,
    outOfStock: products.filter(p => p.stock_quantity === 0).length,
    totalValue: products.reduce(
      (acc, p) => acc + (p.purchase_cost * p.stock_quantity), 0
    ),
  }), [products]);

  // ── Filtrage ──────────────────────────────────────────────────────────────

  // CORRECTION : filteredProducts dans useMemo + filtre statut
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
        || p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [products, searchQuery, statusFilter]);

  // ── Actions stock ─────────────────────────────────────────────────────────

  // CORRECTION : rollback UI si erreur Supabase
  const updateStock = async (id: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    const previous = products;
    setProducts(prev =>
      prev.map(p => p.id === id ? { ...p, stock_quantity: newQuantity } : p)
    );
    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: newQuantity })
      .eq('id', id);
    if (error) {
      console.error('Stock:', error.message);
      setProducts(previous); // rollback
    }
  };

  // ── Actions CRUD ──────────────────────────────────────────────────────────

  function openAddModal() {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  }

  function openEditModal(product: Product) {
    setFormData({
      name:                product.name,
      sku:                 product.sku        || '',
      category:            product.category   || '',
      photo_url:           product.photo_url  || '',
      purchase_cost:       product.purchase_cost,
      selling_price:       product.selling_price,
      stock_quantity:      product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold,
    });
    setIsEditing(true);
    setEditingId(product.id);
    setIsModalOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Vous devez être connecté'); return; }

    let error;
    if (isEditing && editingId) {
      ({ error } = await supabase.from('products').update(formData).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('products').insert([{ ...formData, user_id: user.id }]));
    }

    if (error) alert('Erreur : ' + error.message);
    else { setIsModalOpen(false); fetchProducts(); }
  }

  // CORRECTION : handleDelete avec gestion d'erreur + suppression locale
  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce produit ?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('Erreur suppression : ' + error.message);
    else setProducts(prev => prev.filter(p => p.id !== id));
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue Produits</h1>
          <p className="text-gray-500 text-sm">{products.length} produit{products.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher par nom ou SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
            />
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-[#1A5276] hover:bg-blue-900 text-white px-4 py-2 rounded-lg shadow-sm text-sm transition whitespace-nowrap"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </div>

      {/* CORRECTION : KPIs en haut de page */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-lg shrink-0">
            <Package size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total produits</p>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className={`p-4 rounded-xl shadow-sm border flex items-center gap-3 ${
          stats.outOfStock > 0 ? 'bg-red-50 border-red-200' : 'bg-white'
        }`}>
          <div className={`p-2.5 rounded-lg shrink-0 ${
            stats.outOfStock > 0 ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <X size={18} className={stats.outOfStock > 0 ? 'text-red-600' : 'text-gray-400'} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Rupture de stock</p>
            <p className={`text-xl font-bold ${stats.outOfStock > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {stats.outOfStock}
            </p>
          </div>
        </div>
        <div className={`p-4 rounded-xl shadow-sm border flex items-center gap-3 ${
          stats.lowStock > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white'
        }`}>
          <div className={`p-2.5 rounded-lg shrink-0 ${
            stats.lowStock > 0 ? 'bg-orange-100' : 'bg-gray-100'
          }`}>
            <AlertTriangle size={18} className={stats.lowStock > 0 ? 'text-orange-500' : 'text-gray-400'} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Stock bas</p>
            <p className={`text-xl font-bold ${stats.lowStock > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              {stats.lowStock}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
          <div className="p-2.5 bg-green-100 rounded-lg shrink-0">
            <BarChart2 size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Valeur du stock</p>
            <p className="text-lg font-bold text-green-700">{formatMoney(stats.totalValue)}</p>
          </div>
        </div>
      </div>

      {/* CORRECTION : filtres par statut */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'active', 'paused', 'out_of_stock', 'archived'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              statusFilter === s
                ? 'bg-[#1A5276] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? `Tous (${products.length})` : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Grille produits */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {searchQuery ? `Aucun produit pour "${searchQuery}"` : 'Aucun produit dans cette catégorie'}
          </p>
          <button onClick={openAddModal} className="mt-4 text-sm text-[#1A5276] hover:underline">
            + Ajouter un produit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => {
            const margin     = calculateMargin(product.purchase_cost, product.selling_price);
            const isLowStock = product.stock_quantity > 0
              && product.stock_quantity <= product.low_stock_threshold;
            const isOutOfStock = product.stock_quantity === 0;

            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl shadow-sm border flex flex-col hover:shadow-md transition ${
                  isOutOfStock ? 'border-red-400 border-2' :
                  isLowStock   ? 'border-orange-400 border-2' : 'border-gray-100'
                }`}
              >
                {/* Image */}
                <div className="h-40 bg-gray-100 relative flex items-center justify-center text-gray-400 group overflow-hidden rounded-t-xl">
                  {product.photo_url ? (
                    <img
                      src={product.photo_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      // CORRECTION : fallback si image cassée
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Package size={40} strokeWidth={1} />
                  )}

                  {/* Actions hover */}
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-2 bg-white rounded-full shadow hover:bg-gray-100 text-blue-600 transition"
                      title="Modifier"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 bg-white rounded-full shadow hover:bg-red-100 text-red-600 transition"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Badges */}
                  {isOutOfStock && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1">
                      <X size={9} /> RUPTURE
                    </div>
                  )}
                  {isLowStock && !isOutOfStock && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1">
                      <AlertTriangle size={9} /> STOCK BAS
                    </div>
                  )}
                </div>

                {/* Contenu */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{product.sku || '—'}</p>
                    </div>
                    {/* CORRECTION : statut traduit en français */}
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      STATUS_COLORS[product.status] ?? 'bg-gray-100 text-gray-500'
                    }`}>
                      {STATUS_LABELS[product.status] ?? product.status}
                    </span>
                  </div>

                  {/* Prix et marge */}
                  <div className="mb-3 text-sm space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Achat</span>
                      <span className="font-medium text-red-600">{formatMoney(product.purchase_cost)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Vente</span>
                      <span className="font-bold text-green-700">{formatMoney(product.selling_price)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-1">
                      <span className="text-gray-500 flex items-center gap-1">
                        <TrendingUp size={11} />
                        {/* CORRECTION : précision "brute" pour ne pas induire en erreur */}
                        Marge brute
                      </span>
                      <span className={`font-bold text-sm ${margin > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* CORRECTION : bouton calculateur pour marge réelle */}
                  <button
                    onClick={() => router.push(`/calculator?product=${product.id}`)}
                    className="mb-3 w-full text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg py-1.5 flex items-center justify-center gap-1 transition"
                  >
                    <Lightbulb size={12} /> Calculer marge réelle
                  </button>

                  {/* Contrôle stock */}
                  <div className="mt-auto bg-gray-50 -mx-4 -mb-4 p-3 border-t rounded-b-xl flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">Stock</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateStock(product.id, product.stock_quantity - 1)}
                        className="w-7 h-7 rounded-full bg-white border flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
                        disabled={product.stock_quantity === 0}
                      >
                        <Minus size={13} />
                      </button>
                      <span className={`font-bold w-8 text-center text-sm ${
                        isOutOfStock ? 'text-red-600' :
                        isLowStock   ? 'text-orange-600' : 'text-gray-800'
                      }`}>
                        {product.stock_quantity}
                      </span>
                      <button
                        onClick={() => updateStock(product.id, product.stock_quantity + 1)}
                        className="w-7 h-7 rounded-full bg-white border flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL FORMULAIRE ────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center z-10">
              <h2 className="text-xl font-bold">
                {isEditing ? 'Modifier le produit' : 'Nouveau Produit'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-300 hover:text-gray-500 transition"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit *</label>
                  <input
                    type="text" required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Crème hydratante 200ml"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Référence)</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="PRD-001"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Cosmétique"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix Achat (FCFA) *</label>
                  <input
                    type="number" required min="0"
                    value={formData.purchase_cost}
                    onChange={e => setFormData({ ...formData, purchase_cost: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix Vente (FCFA) *</label>
                  <input
                    type="number" required min="0"
                    value={formData.selling_price}
                    onChange={e => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>

                {/* Aperçu marge dans le modal */}
                {formData.purchase_cost > 0 && formData.selling_price > 0 && (
                  <div className={`col-span-2 px-3 py-2 rounded-lg text-sm flex justify-between ${
                    calculateMargin(formData.purchase_cost, formData.selling_price) > 0
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    <span>Marge brute estimée</span>
                    <span className="font-bold">
                      {calculateMargin(formData.purchase_cost, formData.selling_price).toFixed(1)}%
                      {' '}({formatMoney(formData.selling_price - formData.purchase_cost)})
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Initial *</label>
                  <input
                    type="number" required min="0"
                    value={formData.stock_quantity}
                    onChange={e => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seuil Alerte Stock</label>
                  <input
                    type="number" min="0"
                    value={formData.low_stock_threshold}
                    onChange={e => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL Image</label>
                  <input
                    type="url"
                    value={formData.photo_url}
                    onChange={e => setFormData({ ...formData, photo_url: e.target.value })}
                    placeholder="https://exemple.com/image.jpg"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
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
                  {isEditing ? 'Mettre à jour' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}