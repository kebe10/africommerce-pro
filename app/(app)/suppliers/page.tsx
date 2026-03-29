'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney, getWhatsAppLink } from '@/lib/utils';
import {
  Plus, X, Phone, Edit2, Trash2, Package, Search,
  User, DollarSign, Eye, MessageCircle, CreditCard,
  CheckCircle, CalendarDays, History, AlertTriangle
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Supplier = {
  id: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  status: string;
};

// CORRECTION : purchase_cost ajouté
type Product = {
  id: string;
  name: string;
  purchase_cost: number;
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

type SupplierForm = {
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
};

type PurchaseForm = {
  product_id: string;
  quantity: number;
  unit_cost: number;
  amount_paid: number;
};

// ── Constantes ────────────────────────────────────────────────────────────────

// CORRECTION : hors du composant
const EMPTY_SUPPLIER_FORM: SupplierForm = {
  name: '', contact_name: '', phone: '', email: '', address: '',
};

const EMPTY_PURCHASE_FORM: PurchaseForm = {
  product_id: '', quantity: 1, unit_cost: 0, amount_paid: 0,
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function SuppliersPage() {

  // — Données
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);

  // — KPIs
  const [totalSpendingMonth,   setTotalSpendingMonth]   = useState(0);
  const [totalSpendingAllTime, setTotalSpendingAllTime] = useState(0);
  const [totalDebt,            setTotalDebt]            = useState(0);

  // — UI
  const [loading, setLoading]         = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);

  // — Modal fournisseur
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing]     = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [formData, setFormData]       = useState<SupplierForm>(EMPTY_SUPPLIER_FORM);

  // — Modal commande fournisseur
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier]       = useState<Supplier | null>(null);
  const [purchaseForm, setPurchaseForm]               = useState<PurchaseForm>(EMPTY_PURCHASE_FORM);

  // — Modal historique
  const [isHistoryModalOpen, setIsHistoryModalOpen]   = useState(false);
  const [historyData, setHistoryData]                 = useState<Purchase[]>([]);
  const [historyLoading, setHistoryLoading]           = useState(false);
  const [historySupplierTotal, setHistorySupplierTotal] = useState(0);
  const [historySupplierDebt,  setHistorySupplierDebt]  = useState(0);

  // CORRECTION : paiement inline sans prompt()
  const [payingId, setPayingId]   = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    // CORRECTION : fetches en parallèle
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSuppliers(), fetchProducts()]);
      setLoading(false);
    };
    init();
  }, []);

  async function fetchProducts() {
    // CORRECTION : gestion d'erreur + purchase_cost inclus
    const { data, error } = await supabase
      .from('products')
      .select('id, name, purchase_cost, selling_price, stock_quantity')
      .eq('status', 'active');
    if (error) console.error('Produits:', error.message);
    else if (data) setProducts(data as Product[]);
  }

  async function fetchSuppliers() {
    // CORRECTION : gestion d'erreur explicite
    const { data: suppData, error: suppError } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    if (suppError) console.error('Fournisseurs:', suppError.message);
    else if (suppData) setSuppliers(suppData as Supplier[]);

    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('total_cost, amount_paid, created_at');
    if (purchasesError) { console.error('Achats:', purchasesError.message); return; }

    if (purchases) {
      const totalSpent = purchases.reduce((sum, p) => sum + (p.total_cost ?? 0), 0);
      const totalPaid  = purchases.reduce((sum, p) => sum + (p.amount_paid ?? 0), 0);
      setTotalSpendingAllTime(totalSpent);
      setTotalDebt(totalSpent - totalPaid);

      const startOfMonth  = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const monthlySpent  = purchases
        .filter(p => new Date(p.created_at) >= startOfMonth)
        .reduce((sum, p) => sum + (p.total_cost ?? 0), 0);
      setTotalSpendingMonth(monthlySpent);
    }
  }

  // ── Filtrage ──────────────────────────────────────────────────────────────

  // CORRECTION : useMemo + recherche sur contact_name aussi
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contact_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [suppliers, searchQuery]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  // ── Actions fournisseurs ──────────────────────────────────────────────────

  function openModal(supplier?: Supplier) {
    if (supplier) {
      setFormData({
        name:         supplier.name,
        contact_name: supplier.contact_name || '',
        phone:        supplier.phone        || '',
        email:        supplier.email        || '',
        address:      supplier.address      || '',
      });
      setIsEditing(true);
      setEditingId(supplier.id);
    } else {
      setFormData(EMPTY_SUPPLIER_FORM);
      setIsEditing(false);
      setEditingId(null);
    }
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name) { alert('Le nom est obligatoire'); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Vous devez être connecté'); return; }

    let error;
    if (isEditing && editingId) {
      ({ error } = await supabase.from('suppliers').update(formData).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('suppliers').insert([{ ...formData, user_id: user.id }]));
    }

    if (error) alert('Erreur : ' + error.message);
    else {
      setIsModalOpen(false);
      await fetchSuppliers();
      showSuccess(isEditing ? 'Fournisseur mis à jour !' : 'Fournisseur ajouté !');
    }
  }

  // CORRECTION : handleDelete avec gestion d'erreur + suppression locale
  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce fournisseur ?')) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) alert('Erreur suppression : ' + error.message);
    else setSuppliers(prev => prev.filter(s => s.id !== id));
  }

  // ── Actions historique ────────────────────────────────────────────────────

  async function openHistoryModal(supplier: Supplier) {
    setSelectedSupplier(supplier);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryData([]);
    setPayingId(null);

    const { data, error } = await supabase
      .from('purchases')
      .select('id, created_at, quantity, unit_cost, total_cost, amount_paid, products(name)')
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false });

    if (error) { console.error('Historique:', error.message); }
    else if (data) {
      setHistoryData(data as unknown as Purchase[]);
      const totalSpent = data.reduce((sum, p) => sum + (p.total_cost ?? 0), 0);
      const totalPaid  = data.reduce((sum, p) => sum + (p.amount_paid ?? 0), 0);
      setHistorySupplierTotal(totalSpent);
      setHistorySupplierDebt(totalSpent - totalPaid);
    }
    setHistoryLoading(false);
  }

  // CORRECTION : paiement inline sans prompt()
  async function handlePayDebt(purchaseId: string, currentPaid: number, totalCost: number) {
    if (payAmount <= 0) { alert('Montant invalide'); return; }
    const newPaid = currentPaid + payAmount;

    const { error } = await supabase
      .from('purchases')
      .update({ amount_paid: newPaid })
      .eq('id', purchaseId);

    if (error) {
      alert('Erreur lors du paiement : ' + error.message);
    } else {
      setPayingId(null);
      setPayAmount(0);
      if (selectedSupplier) await openHistoryModal(selectedSupplier);
      await fetchSuppliers();
      showSuccess('Paiement enregistré !');
    }
  }

  // ── Actions commande fournisseur ──────────────────────────────────────────

  function openPurchaseModal(supplier: Supplier) {
    setSelectedSupplier(supplier);
    setPurchaseForm(EMPTY_PURCHASE_FORM);
    setIsPurchaseModalOpen(true);
  }

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplier || !purchaseForm.product_id) {
      alert('Remplissez tous les champs'); return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Non connecté'); return; }

    const totalCost = purchaseForm.quantity * purchaseForm.unit_cost;

    const { error: purchaseError } = await supabase.from('purchases').insert({
      supplier_id:  selectedSupplier.id,
      product_id:   purchaseForm.product_id,
      quantity:     purchaseForm.quantity,
      unit_cost:    purchaseForm.unit_cost,
      total_cost:   totalCost,
      amount_paid:  purchaseForm.amount_paid,
      status:       'delivered',
      user_id:      user.id,
    });

    if (purchaseError) { alert("Erreur lors de l'enregistrement : " + purchaseError.message); return; }

    // Mise à jour du stock
    const product = products.find(p => p.id === purchaseForm.product_id);
    if (product) {
      const newStock = product.stock_quantity + purchaseForm.quantity;
      // CORRECTION : gestion d'erreur sur la mise à jour du stock
      const { error: stockError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', purchaseForm.product_id);
      if (stockError) console.error('Stock:', stockError.message);
      else {
        setProducts(prev => prev.map(p =>
          p.id === purchaseForm.product_id ? { ...p, stock_quantity: newStock } : p
        ));
      }
    }

    // CORRECTION : alert() remplacé par feedback visuel
    setIsPurchaseModalOpen(false);
    await fetchSuppliers();
    showSuccess('Commande enregistrée et stock mis à jour !');
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Toast succès */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-[100] bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-pulse">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-500 text-sm">{suppliers.length} partenaire{suppliers.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher par nom ou contact..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
            />
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-[#1A5276] hover:bg-blue-900 text-white px-4 py-2 rounded-lg shadow-sm text-sm transition whitespace-nowrap"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Nouveau</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Achats ce mois</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoney(totalSpendingMonth)}</p>
          </div>
          <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
            <CalendarDays size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total historique</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoney(totalSpendingAllTime)}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
            <History size={22} />
          </div>
        </div>

        <div className={`p-5 rounded-xl shadow-sm border flex items-center justify-between ${
          totalDebt > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        }`}>
          <div>
            <p className={`text-sm font-medium ${totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Dettes fournisseurs
            </p>
            <p className={`text-2xl font-bold mt-1 ${totalDebt > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {formatMoney(totalDebt)}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${totalDebt > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
            <CreditCard size={22} />
          </div>
        </div>
      </div>

      {/* Liste fournisseurs */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CORRECTION : empty state */}
          {filteredSuppliers.length === 0 ? (
            <div className="md:col-span-3 text-center py-16 text-gray-400">
              <User size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {searchQuery
                  ? `Aucun fournisseur pour "${searchQuery}"`
                  : 'Aucun fournisseur enregistré'}
              </p>
              <button
                onClick={() => openModal()}
                className="mt-4 text-sm text-[#1A5276] hover:underline"
              >
                + Ajouter un fournisseur
              </button>
            </div>
          ) : (
            filteredSuppliers.map(supplier => (
              <div
                key={supplier.id}
                className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition relative group"
              >
                {/* Actions hover */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition flex gap-1.5">
                  <button
                    onClick={() => openModal(supplier)}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Infos */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                    {supplier.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{supplier.name}</h3>
                    {/* CORRECTION : badge statut affiché */}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      supplier.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {supplier.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                  {supplier.contact_name && (
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate">{supplier.contact_name}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-gray-400 shrink-0" />
                      <a href={`tel:${supplier.phone}`} className="text-[#1A5276] hover:underline truncate">
                        {supplier.phone}
                      </a>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate text-xs">{supplier.address}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openHistoryModal(supplier)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 text-gray-700 border rounded-lg hover:bg-gray-100 text-xs font-medium transition"
                    >
                      <Eye size={13} /> Historique
                    </button>
                    {supplier.phone && (
                      <a
                        href={getWhatsAppLink(supplier.phone, `Bonjour ${supplier.name}, je souhaite passer une commande.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-xs font-medium transition"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => openPurchaseModal(supplier)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 text-sm font-medium transition"
                  >
                    <Package size={14} /> Passer une commande
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── MODAL FOURNISSEUR ────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">{isEditing ? 'Modifier' : 'Nouveau Fournisseur'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-gray-500 transition">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom de l'entreprise *</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Marché de Gros Adjamé"
                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nom du contact</label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Ex: Mamadou Koné"
                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+225 07 00 00 00"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ex: Marché Adjamé, Abidjan"
                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                  Annuler
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-[#1A5276] text-white rounded-lg hover:bg-blue-900 transition">
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL HISTORIQUE ─────────────────────────────────────────────────── */}
      {isHistoryModalOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center z-10">
              <div>
                <h2 className="text-lg font-bold">Historique des achats</h2>
                <p className="text-sm text-gray-500">{selectedSupplier.name}</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-300 hover:text-gray-500 transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* KPIs fournisseur */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <span className="text-xs text-blue-600 font-medium">Total dépensé</span>
                  <p className="text-xl font-bold text-blue-800 mt-1">{formatMoney(historySupplierTotal)}</p>
                </div>
                <div className={`p-4 rounded-lg border ${
                  historySupplierDebt > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                }`}>
                  <span className={`text-xs font-medium ${historySupplierDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {historySupplierDebt > 0 ? 'Dette restante' : 'Tout soldé ✓'}
                  </span>
                  <p className={`text-xl font-bold mt-1 ${historySupplierDebt > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {formatMoney(historySupplierDebt)}
                  </p>
                </div>
              </div>

              {historyLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun achat enregistré.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
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
                      {historyData.map(purchase => {
                        const remaining = purchase.total_cost - (purchase.amount_paid ?? 0);
                        const isPaid    = remaining <= 0;

                        return (
                          <tr key={purchase.id} className="hover:bg-gray-50">
                            <td className="p-3 text-gray-500 text-xs">
                              {new Date(purchase.created_at).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="p-3 font-medium">{purchase.products?.name || 'N/A'}</td>
                            <td className="p-3 text-center">{purchase.quantity}</td>
                            <td className="p-3 text-right">{formatMoney(purchase.total_cost)}</td>
                            <td className="p-3 text-right text-green-600">{formatMoney(purchase.amount_paid ?? 0)}</td>
                            <td className={`p-3 text-right font-bold ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
                              {isPaid ? 'Soldé' : formatMoney(remaining)}
                            </td>
                            <td className="p-3 text-center">
                              {isPaid ? (
                                <CheckCircle size={18} className="text-green-500 inline" />
                              ) : payingId === purchase.id ? (
                                // CORRECTION : paiement inline sans prompt()
                                <div className="flex items-center gap-1 justify-center">
                                  <input
                                    type="number" min="1"
                                    max={remaining}
                                    value={payAmount}
                                    onChange={e => setPayAmount(Number(e.target.value))}
                                    placeholder={`Max ${formatMoney(remaining)}`}
                                    className="w-24 border rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-green-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handlePayDebt(purchase.id, purchase.amount_paid ?? 0, purchase.total_cost)}
                                    className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                  >✓</button>
                                  <button
                                    onClick={() => { setPayingId(null); setPayAmount(0); }}
                                    className="px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200"
                                  >✗</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setPayingId(purchase.id); setPayAmount(0); }}
                                  className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200 transition"
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL COMMANDE FOURNISSEUR ───────────────────────────────────────── */}
      {isPurchaseModalOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Commande Fournisseur</h2>
                <p className="text-sm text-gray-500">{selectedSupplier.name}</p>
              </div>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="text-gray-300 hover:text-gray-500 transition">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePurchase} className="p-6 space-y-4">

              <div>
                <label className="block text-sm font-medium mb-1">Produit *</label>
                <select
                  required
                  value={purchaseForm.product_id}
                  onChange={e => {
                    const prod = products.find(p => p.id === e.target.value);
                    setPurchaseForm({
                      ...purchaseForm,
                      product_id: e.target.value,
                      // CORRECTION : pré-remplir avec purchase_cost (pas selling_price)
                      unit_cost: prod?.purchase_cost ?? 0,
                    });
                  }}
                  className="w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#1A5276]"
                >
                  <option value="">Choisir un produit</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock : {p.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantité *</label>
                  <input
                    type="number" min="1" required
                    value={purchaseForm.quantity}
                    onChange={e => setPurchaseForm({ ...purchaseForm, quantity: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Coût unitaire (FCFA) *</label>
                  <input
                    type="number" min="0" required
                    value={purchaseForm.unit_cost}
                    onChange={e => setPurchaseForm({ ...purchaseForm, unit_cost: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total achat :</span>
                  <span className="text-[#1A5276] font-bold">
                    {formatMoney(purchaseForm.quantity * purchaseForm.unit_cost)}
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Montant payé maintenant (laisser 0 si crédit total)
                  </label>
                  <input
                    type="number" min="0"
                    value={purchaseForm.amount_paid}
                    onChange={e => setPurchaseForm({ ...purchaseForm, amount_paid: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2 bg-white focus:ring-2 focus:ring-[#1A5276]"
                  />
                </div>
                <div className="flex justify-between text-sm font-bold text-red-600 pt-2 border-t">
                  <span>Dette (reste à payer) :</span>
                  <span>
                    {formatMoney(Math.max(0, (purchaseForm.quantity * purchaseForm.unit_cost) - purchaseForm.amount_paid))}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                  Annuler
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition">
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