'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney, calculateMargin } from '@/lib/utils';
import { Plus, Minus, Edit2, Trash2, Package, Search, X, TrendingUp, AlertTriangle } from 'lucide-react';

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const emptyForm = {
    name: '', sku: '', category: '', photo_url: '',
    purchase_cost: 0, selling_price: 0, stock_quantity: 0, low_stock_threshold: 10
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
    setLoading(false);
  }

  const updateStock = async (id: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    setProducts(products.map(p => p.id === id ? {...p, stock_quantity: newQuantity} : p));
    await supabase.from('products').update({ stock_quantity: newQuantity }).eq('id', id);
  };

  const openAddModal = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category || '',
      photo_url: product.photo_url || '',
      purchase_cost: product.purchase_cost,
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold
    });
    setIsEditing(true);
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  // --- FONCTION MODIFIÉE AVEC user_id ---
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    // On récupère l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Vous devez être connecté");

    let error;
    if (isEditing && editingId) {
      const result = await supabase.from('products').update(formData).eq('id', editingId);
      error = result.error;
    } else {
      // On ajoute user_id lors de la création
      const result = await supabase.from('products').insert([{
          ...formData,
          user_id: user.id // LIAISON CRITIQUE
      }]);
      error = result.error;
    }
    
    if (error) alert("Erreur: " + error.message);
    else { setIsModalOpen(false); fetchProducts(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue Produits</h1>
          <p className="text-gray-500 text-sm">{products.length} produits</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2 border rounded-lg" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <button onClick={openAddModal} className="flex items-center gap-2 bg-[#1A5276] hover:bg-blue-900 text-white px-4 py-2 rounded-lg shadow-sm whitespace-nowrap">
            <Plus size={18} /> <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </div>

      {loading ? (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />)}
         </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const margin = calculateMargin(product.purchase_cost, product.selling_price);
            const isLowStock = product.stock_quantity <= product.low_stock_threshold;
            
            return (
              <div key={product.id} className={`bg-white rounded-xl shadow-sm border flex flex-col hover:shadow-md transition ${isLowStock ? 'border-orange-400 border-2' : 'border-gray-100'}`}>
                <div className="h-40 bg-gray-100 relative flex items-center justify-center text-gray-400 group">
                  {product.photo_url ? <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover" /> : <Package size={40} strokeWidth={1} />}
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(product)} className="p-2 bg-white rounded-full shadow hover:bg-gray-100 text-blue-600" title="Modifier"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 bg-white rounded-full shadow hover:bg-red-100 text-red-600" title="Supprimer"><Trash2 size={16} /></button>
                  </div>
                  {isLowStock && <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1"><AlertTriangle size={10} /> STOCK BAS</div>}
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-xs text-gray-400 font-mono">{product.sku}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{product.status}</span>
                  </div>
                  <div className="mb-4 text-sm">
                    <div className="flex justify-between items-center mb-1"><span className="text-gray-500">Achat:</span><span className="font-medium text-red-600">{formatMoney(product.purchase_cost)}</span></div>
                    <div className="flex justify-between items-center mb-1"><span className="text-gray-500">Vente:</span><span className="font-bold text-green-700">{formatMoney(product.selling_price)}</span></div>
                    <div className="flex justify-between items-center border-t pt-1 mt-1"><span className="text-gray-500 flex items-center gap-1"><TrendingUp size={12}/> Marge:</span><span className={`font-bold ${margin > 0 ? 'text-blue-600' : 'text-red-600'}`}>{margin.toFixed(1)}%</span></div>
                  </div>
                  <div className="mt-auto bg-gray-50 -mx-4 -mb-4 p-3 border-t flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">Stock</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateStock(product.id, product.stock_quantity - 1)} className="w-7 h-7 rounded-full bg-white border flex items-center justify-center text-gray-500 hover:bg-gray-100"><Minus size={14} /></button>
                      <span className={`font-bold w-8 text-center ${isLowStock ? 'text-orange-600' : 'text-gray-800'}`}>{product.stock_quantity}</span>
                      <button onClick={() => updateStock(product.id, product.stock_quantity + 1)} className="w-7 h-7 rounded-full bg-white border flex items-center justify-center text-gray-500 hover:bg-gray-100"><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FORMULAIRE COMPLET */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center">
              <h2 className="text-xl font-bold">{isEditing ? 'Modifier' : 'Nouveau Produit'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg p-2.5" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Référence)</label>
                  <input type="text" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="w-full border rounded-lg p-2.5" placeholder="PRD-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full border rounded-lg p-2.5" placeholder="Cosmétique" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix Achat (FCFA)</label>
                  <input type="number" required value={formData.purchase_cost} onChange={(e) => setFormData({...formData, purchase_cost: Number(e.target.value)})} className="w-full border rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix Vente (FCFA)</label>
                  <input type="number" required value={formData.selling_price} onChange={(e) => setFormData({...formData, selling_price: Number(e.target.value)})} className="w-full border rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Initial</label>
                  <input type="number" required value={formData.stock_quantity} onChange={(e) => setFormData({...formData, stock_quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seuil Alerte</label>
                  <input type="number" value={formData.low_stock_threshold} onChange={(e) => setFormData({...formData, low_stock_threshold: Number(e.target.value)})} className="w-full border rounded-lg p-2.5" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL Image</label>
                  <input type="text" value={formData.photo_url} onChange={(e) => setFormData({...formData, photo_url: e.target.value})} className="w-full border rounded-lg p-2.5" placeholder="https://..." />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button type="submit" className="px-6 py-2.5 bg-[#E67E22] text-white rounded-lg hover:bg-orange-600 shadow-sm font-medium">{isEditing ? 'Mettre à jour' : 'Sauvegarder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}