'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney, getWhatsAppLink } from '@/lib/utils';
import { Plus, X, Phone, Mail, MapPin, Edit2, Trash2, Package, Search, User, DollarSign, Eye, MessageCircle, CreditCard, CheckCircle } from 'lucide-react';

type Supplier = {
  id: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  status: string;
};

type Product = {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
};

type Purchase = {
  id: string;
  created_at: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  amount_paid: number;
  products: { name: string } | null;
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // KPIs
  const [totalSpending, setTotalSpending] = useState(0); // Total Investissement
  const [totalDebt, setTotalDebt] = useState(0); // Total Dettes

  // Pour le modal de commande
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [purchaseForm, setPurchaseForm] = useState({
    product_id: '',
    quantity: 1,
    unit_cost: 0,
    amount_paid: 0
  });

  // Pour le modal d'historique
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<Purchase[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySupplierTotal, setHistorySupplierTotal] = useState(0);
  const [historySupplierDebt, setHistorySupplierDebt] = useState(0);

  const emptyForm = { name: '', contact_name: '', phone: '', email: '', address: '' };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('id, name, selling_price, stock_quantity').eq('status', 'active');
    if (data) setProducts(data);
  }

  async function fetchSuppliers() {
    setLoading(true);
    
    // 1. Fournisseurs
    const { data: suppData } = await supabase.from('suppliers').select('*').order('name');
    if (suppData) setSuppliers(suppData);

    // 2. Calculs Financiers
    const { data: purchases } = await supabase.from('purchases').select('total_cost, amount_paid');
    if (purchases) {
      const totalSpent = purchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);
      const totalPaid = purchases.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
      
      setTotalSpending(totalSpent); // Investissement Total
      setTotalDebt(totalSpent - totalPaid); // Dette Totale
    }

    setLoading(false);
  }

  // --- Gestion Fournisseurs ---
  const openModal = (supplier?: Supplier) => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        contact_name: supplier.contact_name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || ''
      });
      setEditingId(supplier.id);
    } else {
      setFormData(emptyForm);
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("Le nom est obligatoire");

    let error;
    if (editingId) {
      const result = await supabase.from('suppliers').update(formData).eq('id', editingId);
      error = result.error;
    } else {
      const result = await supabase.from('suppliers').insert([formData]);
      error = result.error;
    }

    if (error) alert("Erreur: " + error.message);
    else {
      setIsModalOpen(false);
      fetchSuppliers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    await supabase.from('suppliers').delete().eq('id', id);
    fetchSuppliers();
  };

  // --- Gestion Historique & Dette ---
  const openHistoryModal = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryData([]);
    setHistorySupplierTotal(0);
    setHistorySupplierDebt(0);

    const { data, error } = await supabase
      .from('purchases')
      .select('id, created_at, quantity, unit_cost, total_cost, amount_paid, products(name)')
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false });

    if (data) {
      setHistoryData(data as Purchase[]);
      const totalSpent = data.reduce((sum, p) => sum + (p.total_cost || 0), 0);
      const totalPaid = data.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
      setHistorySupplierTotal(totalSpent);
      setHistorySupplierDebt(totalSpent - totalPaid);
    }
    setHistoryLoading(false);
  };

  // Fonction pour payer une dette
  const handlePayDebt = async (purchaseId: string, currentPaid: number, totalCost: number) => {
    const remaining = totalCost - currentPaid;
    const amountToAddStr = prompt(`Montant restant : ${formatMoney(remaining)}\n\nEntrez le montant à payer maintenant :`);
    if (!amountToAddStr) return;
    
    const amountToAdd = parseInt(amountToAddStr);
    if (isNaN(amountToAdd) || amountToAdd <= 0) return alert("Montant invalide");

    const newPaidAmount = currentPaid + amountToAdd;
    
    const { error } = await supabase
      .from('purchases')
      .update({ amount_paid: newPaidAmount })
      .eq('id', purchaseId);

    if (error) {
      alert("Erreur lors du paiement");
    } else {
      // Rafraîchir les données
      if (selectedSupplier) openHistoryModal(selectedSupplier);
      fetchSuppliers(); // Pour mettre à jour les KPIs globaux
    }
  };

  // --- Gestion Commandes ---
  const openPurchaseModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setPurchaseForm({ product_id: '', quantity: 1, unit_cost: 0, amount_paid: 0 });
    setIsPurchaseModalOpen(true);
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !purchaseForm.product_id) return alert("Remplissez tous les champs");

    const totalCost = purchaseForm.quantity * purchaseForm.unit_cost;

    const { error: purchaseError } = await supabase.from('purchases').insert({
      supplier_id: selectedSupplier.id,
      product_id: purchaseForm.product_id,
      quantity: purchaseForm.quantity,
      unit_cost: purchaseForm.unit_cost,
      total_cost: totalCost,
      amount_paid: purchaseForm.amount_paid,
      status: 'delivered'
    });

    if (purchaseError) {
      alert("Erreur lors de l'enregistrement");
      return;
    }

    // Mise à jour du stock
    const product = products.find(p => p.id === purchaseForm.product_id);
    if (product) {
      const newStock = product.stock_quantity + purchaseForm.quantity;
      await supabase.from('products').update({ stock_quantity: newStock }).eq('id', purchaseForm.product_id);
    }

    alert("Commande enregistrée !");
    setIsPurchaseModalOpen(false);
    fetchSuppliers();
    fetchProducts();
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-500 text-sm">{suppliers.length} partenaires</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-[#1A5276] hover:bg-blue-900 text-white px-4 py-2 rounded-lg shadow-sm whitespace-nowrap"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nouveau</span>
          </button>
        </div>
      </div>

      {/* KPIs : Investissement & Dettes */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Carte Investissement */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm text-blue-600 font-medium uppercase">Total des Achats</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{formatMoney(totalSpending)}</p>
          </div>
          <div className="p-4 bg-white rounded-full shadow-sm text-blue-600">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Carte Dettes */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm text-red-600 font-medium uppercase">Dettes Fournisseurs (Reste à payer)</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{formatMoney(totalDebt)}</p>
          </div>
          <div className="p-4 bg-white rounded-full shadow-sm text-red-600">
            <CreditCard size={24} />
          </div>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Chargement...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition relative group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition flex gap-2">
                <button onClick={() => openModal(supplier)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(supplier.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>

              <h3 className="font-bold text-lg text-gray-900 mb-2">{supplier.name}</h3>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {supplier.contact_name && (
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400" />
                    <span>{supplier.contact_name}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    <a href={`tel:${supplier.phone}`} className="text-[#1A5276] hover:underline">{supplier.phone}</a>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="space-y-2 pt-4 border-t">
                
                <div className="flex gap-2">
                   <button 
                    onClick={() => openHistoryModal(supplier)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 text-gray-700 border rounded-lg hover:bg-gray-100 text-xs font-medium"
                  >
                    <Eye size={14} /> Historique
                  </button>

                   <a 
                    href={getWhatsAppLink(supplier.phone, `Bonjour ${supplier.name}, je souhaite passer une commande.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-xs font-medium"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </div>

                <button 
                  onClick={() => openPurchaseModal(supplier)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 text-sm font-medium"
                >
                  <Package size={14} /> Passer une commande
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL AJOUT FOURNISSEUR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">{editingId ? 'Modifier' : 'Nouveau Fournisseur'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom de l'entreprise *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg p-2.5" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nom du contact</label>
                <input type="text" value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} className="w-full border rounded-lg p-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border rounded-lg p-2.5" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Adresse</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border rounded-lg p-2.5" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-[#1A5276] text-white rounded-lg hover:bg-blue-900">Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIQUE ACHATS */}
      {isHistoryModalOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Historique des achats</h2>
                <p className="text-sm text-gray-500">{selectedSupplier.name}</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={20} /></button>
            </div>

            <div className="p-6">
              {/* Totaux Fournisseur */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-blue-50 p-4 rounded-lg">
                    <span className="text-xs text-blue-600 font-medium">Total Dépensé</span>
                    <p className="text-xl font-bold text-blue-800">{formatMoney(historySupplierTotal)}</p>
                 </div>
                 <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <span className="text-xs text-red-600 font-medium">Dette Restante</span>
                    <p className="text-xl font-bold text-red-700">{formatMoney(historySupplierDebt)}</p>
                 </div>
              </div>

              {historyLoading ? (
                <div className="text-center py-10 text-gray-400">Chargement...</div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-10 text-gray-400">Aucun achat enregistré.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Produit</th>
                      <th className="p-3 text-center">Qté</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-right">Payé</th>
                      <th className="p-3 text-right">Reste</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historyData.map((purchase) => {
                      const remaining = purchase.total_cost - (purchase.amount_paid || 0);
                      const isPaid = remaining <= 0;
                      
                      return (
                        <tr key={purchase.id} className="hover:bg-gray-50">
                          <td className="p-3 text-gray-500">{new Date(purchase.created_at).toLocaleDateString('fr-FR')}</td>
                          <td className="p-3 font-medium">{purchase.products?.name || 'N/A'}</td>
                          <td className="p-3 text-center">{purchase.quantity}</td>
                          <td className="p-3 text-right">{formatMoney(purchase.total_cost)}</td>
                          <td className="p-3 text-right text-green-600">{formatMoney(purchase.amount_paid || 0)}</td>
                          <td className={`p-3 text-right font-bold ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
                            {isPaid ? 'Soldé' : formatMoney(remaining)}
                          </td>
                          <td className="p-3 text-center">
                            {isPaid ? (
                              <span className="text-green-500"><CheckCircle size={18} className="inline"/></span>
                            ) : (
                              <button 
                                onClick={() => handlePayDebt(purchase.id, purchase.amount_paid || 0, purchase.total_cost)}
                                className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200"
                              >
                                Payer
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PASSER COMMANDE */}
      {isPurchaseModalOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Commande Fournisseur</h2>
                <p className="text-sm text-gray-500">{selectedSupplier.name}</p>
              </div>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="text-gray-300 hover:text-gray-500"><X size={20} /></button>
            </div>
            <form onSubmit={handlePurchase} className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-medium mb-1">Produit</label>
                <select 
                  required
                  value={purchaseForm.product_id}
                  onChange={e => {
                    const prod = products.find(p => p.id === e.target.value);
                    setPurchaseForm({
                      ...purchaseForm, 
                      product_id: e.target.value,
                      unit_cost: prod?.selling_price || 0
                    });
                  }}
                  className="w-full border rounded-lg p-2.5 bg-white"
                >
                  <option value="">Choisir un produit</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantité</label>
                  <input 
                    type="number" min="1" required
                    value={purchaseForm.quantity}
                    onChange={e => setPurchaseForm({...purchaseForm, quantity: Number(e.target.value)})}
                    className="w-full border rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Coût Unitaire (FCFA)</label>
                  <input 
                    type="number" required
                    value={purchaseForm.unit_cost}
                    onChange={e => setPurchaseForm({...purchaseForm, unit_cost: Number(e.target.value)})}
                    className="w-full border rounded-lg p-2.5"
                  />
                </div>
              </div>

              {/* Section Paiement / Dette */}
              <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Achat :</span>
                  <span className="font-bold">{formatMoney(purchaseForm.quantity * purchaseForm.unit_cost)}</span>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Montant payé maintenant (Laisser 0 si crédit)</label>
                  <input 
                    type="number" 
                    value={purchaseForm.amount_paid}
                    onChange={e => setPurchaseForm({...purchaseForm, amount_paid: Number(e.target.value)})}
                    className="w-full border rounded-lg p-2 bg-white"
                  />
                </div>
                <div className="flex justify-between text-sm font-medium text-red-600 pt-2 border-t">
                  <span>Dette (Reste à payer) :</span>
                  <span>{formatMoney((purchaseForm.quantity * purchaseForm.unit_cost) - purchaseForm.amount_paid)}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsPurchaseModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  Valider la commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}