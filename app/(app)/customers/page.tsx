'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney, getWhatsAppLink } from '@/lib/utils';
import { User, Phone, MapPin, ShieldCheck, AlertTriangle, Ban, TrendingUp, MessageCircle } from 'lucide-react';

type Customer = {
  phone: string;
  name: string;
  city: string;
  total_orders: number;
  total_spent: number;
  delivered_count: number;
  failed_count: number;
  success_rate: number;
  score: 'fiable' | 'surveiller' | 'bloque';
};

export default function CustomersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'fiable' | 'surveiller' | 'bloque'>('all');
  
  // État pour stocker le modèle de message WhatsApp
  const [whatsappTemplate, setWhatsappTemplate] = useState('Bonjour {client}, merci pour votre fidélité !');

  useEffect(() => {
    fetchOrders();
    fetchSettings();
  }, []);

  // Récupération des paramètres (message personnalisé)
  async function fetchSettings() {
    const { data } = await supabase
      .from('app_settings')
      .select('whatsapp_customer_message')
      .eq('id', 1)
      .single();
      
    if (data && data.whatsapp_customer_message) {
      setWhatsappTemplate(data.whatsapp_customer_message);
    }
  }

  // Récupération brute de toutes les commandes
  async function fetchOrders() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('customer_name, customer_phone, customer_city, status, total_amount')
      .not('customer_phone', 'is', null);

    if (data) setOrders(data);
    setLoading(false);
  }

  // --- Magie : Agrégation côté client ---
  const customers = useMemo(() => {
    const map = new Map<string, Customer>();

    orders.forEach(order => {
      if (!order.customer_phone) return;

      const phone = order.customer_phone;
      
      if (!map.has(phone)) {
        map.set(phone, {
          phone: phone,
          name: order.customer_name || 'Nom inconnu',
          city: order.customer_city || 'N/A',
          total_orders: 0,
          total_spent: 0,
          delivered_count: 0,
          failed_count: 0,
          success_rate: 100,
          score: 'fiable'
        });
      }

      const customer = map.get(phone)!;
      customer.total_orders += 1;

      if (order.status === 'delivered') {
        customer.delivered_count += 1;
        customer.total_spent += order.total_amount || 0;
      }
      
      if (order.status === 'failed' || order.status === 'returned') {
        customer.failed_count += 1;
      }
    });

    const customersArray = Array.from(map.values());
    
    customersArray.forEach(c => {
      const totalProcessed = c.delivered_count + c.failed_count;
      if (totalProcessed > 0) {
        c.success_rate = (c.delivered_count / totalProcessed) * 100;
      }

      // Logique de scoring
      if (c.failed_count >= 3) {
        c.score = 'bloque';
      } else if (c.success_rate < 80 || c.failed_count >= 1) {
        c.score = 'surveiller';
      } else {
        c.score = 'fiable';
      }
    });

    return customersArray.sort((a, b) => b.total_orders - a.total_orders);

  }, [orders]);

  // Filtrage
  const filteredCustomers = customers.filter(c => {
    if (filter === 'all') return true;
    return c.score === filter;
  });

  // Stats globales
  const stats = useMemo(() => {
    const total = customers.length;
    const bloques = customers.filter(c => c.score === 'bloque').length;
    return { total, bloques };
  }, [customers]);

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Base Clients</h1>
          <p className="text-gray-500 text-sm">{stats.total} clients uniques identifiés</p>
        </div>
      </div>

      {/* Filtres Rapides */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
          Tous
        </button>
        <button onClick={() => setFilter('fiable')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-1 ${filter === 'fiable' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
          <ShieldCheck size={14} /> Fiables
        </button>
        <button onClick={() => setFilter('surveiller')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-1 ${filter === 'surveiller' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}>
          <AlertTriangle size={14} /> À surveiller
        </button>
        <button onClick={() => setFilter('bloque')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-1 ${filter === 'bloque' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
          <Ban size={14} /> Bloqués ({stats.bloques})
        </button>
      </div>

      {/* Liste des Clients */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Analyse des clients...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                <tr>
                  <th className="p-4 text-left">Client</th>
                  <th className="p-4 text-left">Ville</th>
                  <th className="p-4 text-center">Commandes</th>
                  <th className="p-4 text-right">Total Dépensé</th>
                  <th className="p-4 text-center">Taux Succès</th>
                  <th className="p-4 text-center">Score Fiabilité</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCustomers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-10 text-gray-400">Aucun client trouvé.</td></tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.phone} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{customer.name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone size={10} /> {customer.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="text-gray-400" /> {customer.city}
                        </div>
                      </td>
                      <td className="p-4 text-center font-medium">{customer.total_orders}</td>
                      <td className="p-4 text-right font-semibold text-green-700">{formatMoney(customer.total_spent)}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TrendingUp size={14} className={customer.success_rate >= 80 ? 'text-green-500' : 'text-red-500'} />
                          {customer.success_rate.toFixed(0)}%
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {customer.score === 'fiable' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                            <ShieldCheck size={12} /> Fiable
                          </span>
                        )}
                        {customer.score === 'surveiller' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                            <AlertTriangle size={12} /> À surveiller
                          </span>
                        )}
                        {customer.score === 'bloque' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                            <Ban size={12} /> Bloqué
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <a
                          href={getWhatsAppLink(
                            customer.phone, 
                            whatsappTemplate.replace('{client}', customer.name) // Remplace {client} par le nom
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full hover:bg-green-100 text-xs font-medium border border-green-200"
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}