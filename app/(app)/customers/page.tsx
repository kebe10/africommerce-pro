'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney, getWhatsAppLink } from '@/lib/utils';
import {
  Phone, MapPin, ShieldCheck, AlertTriangle,
  Ban, TrendingUp, MessageCircle, Search,
  Users, DollarSign, ArrowUpDown, Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

type RawOrder = {
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  status: string;
  total_amount: number;
};

type Score = 'fiable' | 'surveiller' | 'bloque';
type SortKey = 'total_orders' | 'total_spent' | 'success_rate';

type Customer = {
  phone: string;
  name: string;
  city: string;
  total_orders: number;
  total_spent: number;
  delivered_count: number;
  failed_count: number;
  success_rate: number;
  score: Score;
};

// ── Constantes ────────────────────────────────────────────────────────────────

const SCORE_CONFIG: Record<Score, {
  label: string;
  icon: React.ReactNode;
  badge: string;
  btn: string;
  btnActive: string;
}> = {
  fiable: {
    label:     'Fiable',
    icon:      <ShieldCheck size={12} />,
    badge:     'bg-green-100 text-green-700 border-green-200',
    btn:       'bg-green-50 text-green-700 hover:bg-green-100',
    btnActive: 'bg-green-600 text-white',
  },
  surveiller: {
    label:     'À surveiller',
    icon:      <AlertTriangle size={12} />,
    badge:     'bg-yellow-100 text-yellow-700 border-yellow-200',
    btn:       'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
    btnActive: 'bg-yellow-500 text-white',
  },
  bloque: {
    label:     'Bloqué',
    icon:      <Ban size={12} />,
    badge:     'bg-red-100 text-red-700 border-red-200',
    btn:       'bg-red-50 text-red-700 hover:bg-red-100',
    btnActive: 'bg-red-600 text-white',
  },
};

const SORT_LABELS: Record<SortKey, string> = {
  total_orders: 'Commandes',
  total_spent:  'Dépenses',
  success_rate: 'Taux succès',
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const router = useRouter();

  const [orders, setOrders]                   = useState<RawOrder[]>([]);
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    'Bonjour {client}, merci pour votre fidélité !'
  );
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<'all' | Score>('all');
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState<SortKey>('total_orders');
  const [sortDesc, setSortDesc] = useState(true);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchOrders(), fetchSettings()]);
      setLoading(false);
    };
    init();
  }, []);

  async function fetchOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('customer_name, customer_phone, customer_city, status, total_amount')
      .not('customer_phone', 'is', null);
    if (error) console.error('Clients — fetch orders:', error.message);
    else if (data) setOrders(data as RawOrder[]);
  }

  async function fetchSettings() {
    const { data } = await supabase
      .from('app_settings')
      .select('whatsapp_customer_message')
      .eq('id', 1)
      .maybeSingle();
    if (data?.whatsapp_customer_message) {
      setWhatsappTemplate(data.whatsapp_customer_message);
    }
  }

  // ── Agrégation clients ────────────────────────────────────────────────────

  const customers = useMemo<Customer[]>(() => {
    const map = new Map<string, Customer>();

    orders.forEach(order => {
      if (!order.customer_phone) return;
      const phone = order.customer_phone;

      if (!map.has(phone)) {
        map.set(phone, {
          phone,
          name:            order.customer_name || 'Nom inconnu',
          city:            order.customer_city  || 'N/A',
          total_orders:    0,
          total_spent:     0,
          delivered_count: 0,
          failed_count:    0,
          success_rate:    -1,
          score:           'fiable',
        });
      }

      const c = map.get(phone)!;
      c.total_orders += 1;

      if (order.status === 'delivered') {
        c.delivered_count += 1;
        c.total_spent += order.total_amount ?? 0;
      }
      if (order.status === 'failed' || order.status === 'returned') {
        c.failed_count += 1;
      }
    });

    const result = Array.from(map.values());

    result.forEach(c => {
      const totalClosed = c.delivered_count + c.failed_count;
      c.success_rate = totalClosed > 0
        ? (c.delivered_count / totalClosed) * 100
        : -1;

      if (c.failed_count >= 3) {
        c.score = 'bloque';
      } else if (c.success_rate !== -1 && (c.success_rate < 70 || c.failed_count >= 2)) {
        c.score = 'surveiller';
      } else {
        c.score = 'fiable';
      }
    });

    return result;
  }, [orders]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:      customers.length,
    fiables:    customers.filter(c => c.score === 'fiable').length,
    surveiller: customers.filter(c => c.score === 'surveiller').length,
    bloques:    customers.filter(c => c.score === 'bloque').length,
    totalSpent: customers.reduce((acc, c) => acc + c.total_spent, 0),
  }), [customers]);

  // ── Filtrage + tri ────────────────────────────────────────────────────────

  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => {
        const matchScore  = filter === 'all' || c.score === filter;
        const matchSearch = search === ''
          || c.name.toLowerCase().includes(search.toLowerCase())
          || c.phone.includes(search);
        return matchScore && matchSearch;
      })
      .sort((a, b) => {
        const aVal = sortBy === 'success_rate' && a.success_rate === -1 ? -1 : a[sortBy];
        const bVal = sortBy === 'success_rate' && b.success_rate === -1 ? -1 : b[sortBy];
        return sortDesc ? bVal - aVal : aVal - bVal;
      });
  }, [customers, filter, search, sortBy, sortDesc]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function handleSort(key: SortKey) {
    if (sortBy === key) setSortDesc(prev => !prev);
    else { setSortBy(key); setSortDesc(true); }
  }

  function getSuccessRateDisplay(rate: number) {
    if (rate === -1) return <span className="text-gray-400 text-xs">N/A</span>;
    return (
      <div className="flex items-center justify-center gap-1">
        <TrendingUp size={14} className={rate >= 70 ? 'text-green-500' : 'text-red-500'} />
        <span className={rate >= 70 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
          {rate.toFixed(0)}%
        </span>
      </div>
    );
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Base Clients</h1>
          <p className="text-gray-500 text-sm mt-1">
            {stats.total} client{stats.total > 1 ? 's' : ''} unique{stats.total > 1 ? 's' : ''} identifié{stats.total > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-white border rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm">
            <Users size={16} className="text-[#1A5276]" />
            <div>
              <p className="text-xs text-gray-500">Clients total</p>
              <p className="font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white border rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm">
            <DollarSign size={16} className="text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Revenu total généré</p>
              <p className="font-bold text-green-700">{formatMoney(stats.totalSpent)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres score */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}>
          Tous ({stats.total})
        </button>
        {(Object.keys(SCORE_CONFIG) as Score[]).map(score => {
          const cfg   = SCORE_CONFIG[score];
          const count = stats[score === 'fiable' ? 'fiables' : score === 'surveiller' ? 'surveiller' : 'bloques'];
          return (
            <button key={score} onClick={() => setFilter(score)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-1 ${
                filter === score ? cfg.btnActive : cfg.btn
              }`}>
              {cfg.icon} {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Rechercher par nom ou numéro de téléphone..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5276]" />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded" />)}
          </div>
        ) : customers.length === 0 ? (
          /* ── EMPTY STATE — Aucun client (pas encore de commandes) ───────── */
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
              <Users size={36} strokeWidth={1.5} className="text-green-600 opacity-70" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun client pour l'instant</h3>
            <p className="text-gray-500 text-sm max-w-sm leading-relaxed mb-6">
              Vos clients apparaissent automatiquement dès que vous enregistrez des commandes. Chaque client reçoit un score de fiabilité basé sur son historique de livraisons.
            </p>
            <button
              onClick={() => router.push('/orders')}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1A5276] hover:bg-blue-900 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Plus size={16} /> Créer une première commande
            </button>
            <div className="mt-6 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 max-w-sm">
              <p className="text-xs text-orange-700 leading-relaxed">
                💡 <span className="font-semibold">Le scoring client :</span> un client avec 3 échecs ou moins de 70% de livraisons réussies passe automatiquement en "À surveiller" ou "Bloqué".
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                <tr>
                  <th className="p-4 text-left">Client</th>
                  <th className="p-4 text-left">Ville</th>
                  {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
                    <th key={key} className="p-4 text-center">
                      <button onClick={() => handleSort(key)}
                        className="inline-flex items-center gap-1 hover:text-gray-800 transition">
                        {SORT_LABELS[key]}
                        <ArrowUpDown size={12} className={sortBy === key ? 'text-[#1A5276]' : 'text-gray-300'} />
                      </button>
                    </th>
                  ))}
                  <th className="p-4 text-center">Score</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCustomers.length === 0 ? (
                  /* ── EMPTY STATE — Filtre/recherche sans résultat ─────── */
                  <tr>
                    <td colSpan={7}>
                      <div className="py-12 flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                          <Search size={24} strokeWidth={1.5} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 mb-1">
                          {search ? `Aucun client pour "${search}"` : `Aucun client dans la catégorie "${SCORE_CONFIG[filter as Score]?.label}"`}
                        </p>
                        <button
                          onClick={() => { setSearch(''); setFilter('all'); }}
                          className="text-xs text-[#1A5276] hover:underline mt-2"
                        >
                          Voir tous les clients
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(customer => {
                    const cfg = SCORE_CONFIG[customer.score];
                    return (
                      <tr key={customer.phone} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                              customer.score === 'fiable'     ? 'bg-green-100 text-green-700' :
                              customer.score === 'surveiller' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Phone size={10} /> {customer.phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-gray-600">
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin size={13} className="text-gray-400 shrink-0" />
                            {customer.city}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-semibold text-gray-900">{customer.total_orders}</span>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {customer.delivered_count} livrée{customer.delivered_count > 1 ? 's' : ''}
                            {customer.failed_count > 0 && (
                              <span className="text-red-400"> · {customer.failed_count} échec{customer.failed_count > 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-semibold text-green-700">{formatMoney(customer.total_spent)}</span>
                        </td>
                        <td className="p-4 text-center">{getSuccessRateDisplay(customer.success_rate)}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.badge}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <a
                            href={getWhatsAppLink(customer.phone, whatsappTemplate.replace('{client}', customer.name))}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full hover:bg-green-100 text-xs font-medium border border-green-200 transition"
                          >
                            <MessageCircle size={13} /> WhatsApp
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {filteredCustomers.length > 0 && (
              <div className="px-4 py-3 border-t bg-gray-50 text-xs text-gray-400 flex justify-between">
                <span>{filteredCustomers.length} client{filteredCustomers.length > 1 ? 's' : ''} affiché{filteredCustomers.length > 1 ? 's' : ''}</span>
                <span>Trié par {SORT_LABELS[sortBy]} · {sortDesc ? '↓' : '↑'}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}