'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatMoney, calculateMargin } from '@/lib/utils';
import {
  Plus, Edit2, Trash2, Package,
  Search, X, TrendingUp, AlertTriangle,
  Lightbulb, BarChart2, Upload, Camera, Loader2, Tag
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
  status: string;
};

// ── Constantes ────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormData = {
  name: '', sku: '', category: '', photo_url: '',
  purchase_cost: 0, selling_price: 0,
  stock_quantity: 0, low_stock_threshold: 10,
  status: 'active',
};

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

// ── Sous-composant : ligne catégorie ──────────────────────────────────────────

type CategoryRowProps = {
  cat: string;
  count: number;
  onRename: (oldName: string, newName: string) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
};

function CategoryRow({ cat, count, onRename, onDelete }: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(cat);
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
      {editing ? (
        <>
          <input type="text" value={editVal} onChange={e => setEditVal(e.target.value)}
            className="flex-1 border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-[#1A5276]" autoFocus />
          <button onClick={async () => { await onRename(cat, editVal); setEditing(false); }}
            className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 text-xs">✓</button>
          <button onClick={() => { setEditing(false); setEditVal(cat); }}
            className="p-1.5 bg-gray-200 rounded hover:bg-gray-300 text-xs">✗</button>
        </>
      ) : (
        <>
          <Tag size={14} className="text-[#1A5276] shrink-0" />
          <span className="flex-1 text-sm font-medium text-gray-800">{cat}</span>
          <span className="text-xs text-gray-400 bg-white border px-2 py-0.5 rounded-full">
            {count} produit{count > 1 ? 's' : ''}
          </span>
          <button onClick={() => setEditing(true)} className="p-1.5 text-gray-400 hover:text-blue-600 transition"><Edit2 size={13} /></button>
          <button onClick={() => onDelete(cat)} className="p-1.5 text-gray-400 hover:text-red-600 transition"><Trash2 size={13} /></button>
        </>
      )}
    </div>
  );
}

// ── Sous-composant : contrôle stock éditable ──────────────────────────────────

type StockControlProps = {
  productId: string;
  quantity: number;
  isOutOfStock: boolean;
  isLowStock: boolean;
  onUpdate: (id: string, newQty: number) => Promise<void>;
};

function StockControl({ productId, quantity, isOutOfStock, isLowStock, onUpdate }: StockControlProps) {
  const [editing, setEditing]   = useState(false);
  const [inputVal, setInputVal] = useState(String(quantity));

  // Sync si la quantité change depuis l'extérieur
  useEffect(() => { setInputVal(String(quantity)); }, [quantity]);

  function handleConfirm() {
    const parsed = parseInt(inputVal, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed !== quantity) {
      onUpdate(productId, parsed);
    } else {
      setInputVal(String(quantity)); // reset si invalide
    }
    setEditing(false);
  }

  const colorClass = isOutOfStock
    ? 'text-red-600'
    : isLowStock
      ? 'text-orange-600'
      : 'text-gray-800';

  return (
    <div className="mt-auto bg-gray-50 -mx-4 -mb-4 p-3 border-t rounded-b-xl flex items-center justify-between">
      <span className="text-xs font-medium text-gray-600">Stock</span>
      <div className="flex items-center gap-2">
        {/* AMÉLIORATION : champ éditable au clic sur le chiffre */}
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number" min="0"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onBlur={handleConfirm}
              onKeyDown={e => {
                if (e.key === 'Enter') handleConfirm();
                if (e.key === 'Escape') { setInputVal(String(quantity)); setEditing(false); }
              }}
              className="w-16 border rounded px-1.5 py-0.5 text-sm text-center focus:ring-2 focus:ring-[#1A5276] font-bold"
              autoFocus
            />
            <button onClick={handleConfirm}
              className="text-xs bg-green-500 text-white px-2 py-0.5 rounded hover:bg-green-600">✓</button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            title="Cliquer pour modifier le stock"
            className={`font-bold w-10 text-center text-sm ${colorClass} hover:bg-gray-200 rounded px-1 py-0.5 transition cursor-pointer border border-transparent hover:border-gray-300`}
          >
            {quantity}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [statusFilter, setStatusFilter]   = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditing, setIsEditing]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [formData, setFormData]     = useState<FormData>(EMPTY_FORM);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef                        = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview]     = useState<string | null>(null);
  const [photoFile, setPhotoFile]           = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products').select('*').order('created_at', { ascending: false });
    if (error) console.error('Produits:', error.message);
    else if (data) setProducts(data as Product[]);
    setLoading(false);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:      products.length,
    active:     products.filter(p => p.status === 'active').length,
    paused:     products.filter(p => p.status === 'paused').length,
    outOfStock: products.filter(p => p.stock_quantity === 0 || p.status === 'out_of_stock').length,
    archived:   products.filter(p => p.status === 'archived').length,
    lowStock:   products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold).length,
    totalValue: products.reduce((acc, p) => acc + (p.purchase_cost * p.stock_quantity), 0),
  }), [products]);

  // ── Catégories ────────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const cats = products.map(p => p.category).filter(c => c && c.trim() !== '');
    return [...new Set(cats)].sort();
  }, [products]);

  // ── Filtrage ──────────────────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchQuery
        || p.name.toLowerCase().includes(searchQuery.toLowerCase())
        || (p.sku ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        || (p.category ?? '').toLowerCase().includes(searchQuery.toLowerCase());

      let matchStatus = false;
      if (statusFilter === 'all') matchStatus = true;
      else if (statusFilter === 'out_of_stock') matchStatus = p.status === 'out_of_stock' || p.stock_quantity === 0;
      else matchStatus = p.status === statusFilter;

      const matchCategory = categoryFilter === 'all'
        || (categoryFilter === 'none' && (!p.category || p.category.trim() === ''))
        || p.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [products, searchQuery, statusFilter, categoryFilter]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  // ── Gestion photo ─────────────────────────────────────────────────────────

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Sélectionnez une image (JPG, PNG, WEBP...)'); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Image trop lourde. Maximum 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setPhotoFile(file);
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    setUploadingPhoto(true);
    const ext      = file.name.split('.').pop();
    const fileName = `product_${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
    const { error } = await supabase.storage.from('products').upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) { alert("Erreur upload : " + error.message); setUploadingPhoto(false); return null; }
    const { data } = supabase.storage.from('products').getPublicUrl(fileName);
    setUploadingPhoto(false);
    return data.publicUrl;
  }

  function removePhoto() {
    setPhotoPreview(null);
    setPhotoFile(null);
    setFormData(prev => ({ ...prev, photo_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Actions stock ─────────────────────────────────────────────────────────

  // AMÉLIORATION : mise à jour directe par saisie
  const updateStock = async (id: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    const previous = products;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock_quantity: newQuantity } : p));
    const { error } = await supabase.from('products').update({ stock_quantity: newQuantity }).eq('id', id);
    if (error) { console.error('Stock:', error.message); setProducts(previous); }
    else showSuccess(`Stock mis à jour : ${newQuantity} unités`);
  };

  // ── Actions CRUD ──────────────────────────────────────────────────────────

  function openAddModal() {
    setFormData(EMPTY_FORM);
    setPhotoPreview(null);
    setPhotoFile(null);
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  }

  function openEditModal(product: Product) {
    setFormData({
      name: product.name, sku: product.sku || '',
      category: product.category || '', photo_url: product.photo_url || '',
      purchase_cost: product.purchase_cost, selling_price: product.selling_price,
      stock_quantity: product.stock_quantity, low_stock_threshold: product.low_stock_threshold,
      status: product.status || 'active',
    });
    setPhotoPreview(product.photo_url || null);
    setPhotoFile(null);
    setIsEditing(true);
    setEditingId(product.id);
    setIsModalOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Vous devez être connecté'); return; }
    let finalPhotoUrl = formData.photo_url;
    if (photoFile) {
      const url = await uploadPhoto(photoFile);
      if (!url) return;
      finalPhotoUrl = url;
    }
    const dataToSave = { ...formData, photo_url: finalPhotoUrl };
    let error;
    if (isEditing && editingId) {
      ({ error } = await supabase.from('products').update(dataToSave).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('products').insert([{ ...dataToSave, user_id: user.id }]));
    }
    if (error) alert('Erreur : ' + error.message);
    else {
      setIsModalOpen(false);
      setPhotoPreview(null);
      setPhotoFile(null);
      fetchProducts();
      showSuccess(isEditing ? 'Produit mis à jour !' : 'Produit ajouté !');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce produit ?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('Erreur suppression : ' + error.message);
    else { setProducts(prev => prev.filter(p => p.id !== id)); showSuccess('Produit supprimé.'); }
  }

  // ── Gestion catégories ────────────────────────────────────────────────────

  async function handleRenameCategory(oldName: string, newName: string) {
    if (!newName.trim() || newName === oldName) return;
    const toUpdate = products.filter(p => p.category === oldName);
    for (const p of toUpdate) {
      await supabase.from('products').update({ category: newName.trim() }).eq('id', p.id);
    }
    await fetchProducts();
    showSuccess(`Catégorie "${oldName}" renommée en "${newName}"`);
  }

  async function handleDeleteCategory(name: string) {
    if (!confirm(`Supprimer la catégorie "${name}" ?`)) return;
    const toUpdate = products.filter(p => p.category === name);
    for (const p of toUpdate) {
      await supabase.from('products').update({ category: '' }).eq('id', p.id);
    }
    await fetchProducts();
    showSuccess(`Catégorie "${name}" supprimée.`);
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Toast */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-[100] bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-pulse">
          <Package size={16} /> {successMsg}
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue Produits</h1>
          <p className="text-gray-500 text-sm">{products.length} produit{products.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Rechercher..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5276]" />
          </div>
          <button onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm transition whitespace-nowrap">
            <Tag size={15} /> Catégories
            {categories.length > 0 && (
              <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{categories.length}</span>
            )}
          </button>
          <button onClick={openAddModal}
            className="flex items-center gap-2 bg-[#1A5276] hover:bg-blue-900 text-white px-4 py-2 rounded-lg shadow-sm text-sm transition whitespace-nowrap">
            <Plus size={16} /> <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-lg shrink-0"><Package size={18} className="text-blue-600" /></div>
          <div><p className="text-xs text-gray-500">Total produits</p><p className="text-xl font-bold text-gray-900">{stats.total}</p></div>
        </div>
        <div className={`p-4 rounded-xl shadow-sm border flex items-center gap-3 ${stats.outOfStock > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
          <div className={`p-2.5 rounded-lg shrink-0 ${stats.outOfStock > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
            <X size={18} className={stats.outOfStock > 0 ? 'text-red-600' : 'text-gray-400'} />
          </div>
          <div><p className="text-xs text-gray-500">Rupture de stock</p><p className={`text-xl font-bold ${stats.outOfStock > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.outOfStock}</p></div>
        </div>
        <div className={`p-4 rounded-xl shadow-sm border flex items-center gap-3 ${stats.lowStock > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
          <div className={`p-2.5 rounded-lg shrink-0 ${stats.lowStock > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
            <AlertTriangle size={18} className={stats.lowStock > 0 ? 'text-orange-500' : 'text-gray-400'} />
          </div>
          <div><p className="text-xs text-gray-500">Stock bas</p><p className={`text-xl font-bold ${stats.lowStock > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{stats.lowStock}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
          <div className="p-2.5 bg-green-100 rounded-lg shrink-0"><BarChart2 size={18} className="text-green-600" /></div>
          <div><p className="text-xs text-gray-500">Valeur du stock</p><p className="text-lg font-bold text-green-700">{formatMoney(stats.totalValue)}</p></div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-xl shadow-sm border space-y-3">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-400 font-medium mr-1">Statut :</span>
          {([
            { value: 'all',          label: `Tous (${stats.total})` },
            { value: 'active',       label: `Actifs (${stats.active})` },
            { value: 'paused',       label: `En pause (${stats.paused})` },
            { value: 'out_of_stock', label: `Rupture (${stats.outOfStock})` },
            { value: 'archived',     label: `Archivés (${stats.archived})` },
          ]).map(({ value, label }) => (
            <button key={value} onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                statusFilter === value
                  ? 'bg-[#1A5276] text-white border-[#1A5276]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Tag size={14} className="text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400 font-medium">Catégorie :</span>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#1A5276]">
              <option value="all">Toutes ({products.length})</option>
              <option value="none">Sans catégorie ({products.filter(p => !p.category).length})</option>
              {categories.map(c => (
                <option key={c} value={c}>{c} ({products.filter(p => p.category === c).length})</option>
              ))}
            </select>
            {categoryFilter !== 'all' && (
              <button onClick={() => setCategoryFilter('all')} className="text-xs text-red-400 hover:text-red-600"><X size={14} /></button>
            )}
          </div>
        )}

        {(statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery) && (
          <div className="flex items-center justify-between pt-1 border-t">
            <p className="text-xs text-gray-400">
              {filteredProducts.length} résultat{filteredProducts.length > 1 ? 's' : ''} sur {products.length} produits
            </p>
            <button onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setSearchQuery(''); }}
              className="text-xs text-red-500 hover:text-red-700 underline">Réinitialiser</button>
          </div>
        )}
      </div>

      {/* Grille produits */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-72 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">{searchQuery ? `Aucun produit pour "${searchQuery}"` : 'Aucun produit dans cette sélection'}</p>
          <button onClick={openAddModal} className="mt-4 text-sm text-[#1A5276] hover:underline">+ Ajouter un produit</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => {
            const margin       = calculateMargin(product.purchase_cost, product.selling_price);
            const isLowStock   = product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold;
            const isOutOfStock = product.stock_quantity === 0 || product.status === 'out_of_stock';
            return (
              <div key={product.id} className={`bg-white rounded-xl shadow-sm border flex flex-col hover:shadow-md transition ${isOutOfStock ? 'border-red-400 border-2' : isLowStock ? 'border-orange-400 border-2' : 'border-gray-100'}`}>

                {/* Image */}
                <div className="h-52 bg-gray-100 relative flex items-center justify-center text-gray-400 group overflow-hidden rounded-t-xl">
                  {product.photo_url ? (
                    <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <Package size={40} strokeWidth={1} />
                      <span className="text-xs">Pas de photo</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(product)} className="p-2 bg-white rounded-full shadow hover:bg-gray-100 text-blue-600 transition"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 bg-white rounded-full shadow hover:bg-red-100 text-red-600 transition"><Trash2 size={14} /></button>
                  </div>
                  {isOutOfStock && <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1"><X size={9} /> RUPTURE</div>}
                  {isLowStock && !isOutOfStock && <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1"><AlertTriangle size={9} /> STOCK BAS</div>}
                  {product.category && (
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">{product.category}</div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{product.sku || '—'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[product.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[product.status] ?? product.status}
                    </span>
                  </div>

                  <div className="mb-3 text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Achat</span><span className="font-medium text-red-600">{formatMoney(product.purchase_cost)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Vente</span><span className="font-bold text-green-700">{formatMoney(product.selling_price)}</span></div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-gray-500 flex items-center gap-1"><TrendingUp size={11} /> Marge brute</span>
                      <span className={`font-bold text-sm ${margin > 0 ? 'text-blue-600' : 'text-red-600'}`}>{margin.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* AMÉLIORATION : bouton orange bien visible */}
                  <button
                    onClick={() => router.push(`/calculator?product=${product.id}`)}
                    className="mb-3 w-full text-xs text-white bg-[#E67E22] hover:bg-orange-600 rounded-lg py-2 flex items-center justify-center gap-1.5 transition font-semibold shadow-sm"
                  >
                    <Lightbulb size={13} /> Calculer marge réelle
                  </button>

                  {/* AMÉLIORATION : stock éditable au clic */}
                  <StockControl
                    productId={product.id}
                    quantity={product.stock_quantity}
                    isOutOfStock={isOutOfStock}
                    isLowStock={isLowStock}
                    onUpdate={updateStock}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL PRODUIT ─────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center z-10">
              <h2 className="text-xl font-bold">{isEditing ? 'Modifier le produit' : 'Nouveau Produit'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-gray-500 transition"><X size={22} /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit *</label>
                  <input type="text" required value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Crème hydratante 200ml"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Référence)</label>
                  <input type="text" value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="PRD-001"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <input type="text" value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Cosmétique"
                    list="categories-list"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]" />
                  <datalist id="categories-list">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#1A5276]">
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix Achat (FCFA) *</label>
                  <input type="number" required min="0" value={formData.purchase_cost}
                    onChange={e => setFormData({ ...formData, purchase_cost: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix Vente (FCFA) *</label>
                  <input type="number" required min="0" value={formData.selling_price}
                    onChange={e => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]" />
                </div>
                {formData.purchase_cost > 0 && formData.selling_price > 0 && (
                  <div className={`col-span-2 px-3 py-2 rounded-lg text-sm flex justify-between ${calculateMargin(formData.purchase_cost, formData.selling_price) > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <span>Marge brute estimée</span>
                    <span className="font-bold">
                      {calculateMargin(formData.purchase_cost, formData.selling_price).toFixed(1)}%
                      {' '}({formatMoney(formData.selling_price - formData.purchase_cost)})
                    </span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Initial *</label>
                  <input type="number" required min="0" value={formData.stock_quantity}
                    onChange={e => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seuil Alerte Stock</label>
                  <input type="number" min="0" value={formData.low_stock_threshold}
                    onChange={e => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]" />
                </div>

                {/* Upload photo */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Photo du produit</label>
                  {photoPreview ? (
                    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 mb-2">
                      <img src={photoPreview} alt="Aperçu" className="w-full h-full object-cover" />
                      <button type="button" onClick={removePhoto}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow transition"><X size={14} /></button>
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg shadow text-xs font-medium flex items-center gap-1 transition border">
                        <Camera size={12} /> Changer
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="w-full h-36 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#1A5276] hover:bg-blue-50 transition cursor-pointer">
                      <div className="p-3 bg-gray-100 rounded-full"><Upload size={22} className="text-gray-400" /></div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">Appuyer pour choisir une photo</p>
                        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP · Max 5MB</p>
                      </div>
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                  {uploadingPhoto && (
                    <div className="flex items-center gap-2 text-sm text-[#1A5276] mt-2 bg-blue-50 px-3 py-2 rounded-lg">
                      <Loader2 size={14} className="animate-spin" /> Upload en cours...
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Annuler</button>
                <button type="submit" disabled={uploadingPhoto}
                  className="px-6 py-2.5 bg-[#E67E22] text-white rounded-lg hover:bg-orange-600 font-medium transition disabled:opacity-50 flex items-center gap-2">
                  {uploadingPhoto && <Loader2 size={14} className="animate-spin" />}
                  {isEditing ? 'Mettre à jour' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CATÉGORIES ─────────────────────────────────────────────── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold">Gérer les catégories</h2>
                <p className="text-xs text-gray-400 mt-0.5">{categories.length} catégorie{categories.length > 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-300 hover:text-gray-500 transition"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-4">
              {categories.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Tag size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune catégorie créée.</p>
                  <p className="text-xs mt-1">Ajoutez une catégorie lors de la création d'un produit.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map(cat => (
                    <CategoryRow
                      key={cat}
                      cat={cat}
                      count={products.filter(p => p.category === cat).length}
                      onRename={handleRenameCategory}
                      onDelete={handleDeleteCategory}
                    />
                  ))}
                </div>
              )}
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-400 text-center">
                  Pour ajouter une catégorie, créez ou modifiez un produit et renseignez le champ "Catégorie".
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}