'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, TrendingUp, CheckCircle, Clock,
  XCircle, DollarSign, Package, ArrowRight, Plus,
  AlertTriangle, X, Zap, ChevronRight
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderWithProduct = {
  id: string;
  created_at: string;
  customer_name: string;
  total_amount: number;
  status: string;
  quantity: number;
  unit_price: number;
  delivery_cost: number;
  ad_cost_per_order: number;
  products: { id: string; name: string; purchase_cost: number } | null;
};

type KPIs = {
  ordersToday: number;
  ordersMonth: number;
  deliveredRevenue: number;
  realProfit: number;
  successRate: number;
  pendingOrders: number;
  failedCost: number;
};

type ChartPoint = { date: string; commandes: number };
type TopProduct = { name: string; revenus: number };

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_CLOSED  = ['delivered', 'failed', 'returned'];
const STATUS_PENDING = ['new', 'confirmed', 'shipped'];
const STATUS_FAILED  = ['failed', 'returned'];

const STATUS_LABELS: Record<string, string> = {
  new:       'Nouveau',
  confirmed: 'Confirmée',
  shipped:   'Expédiée',
  delivered: 'Livrée',
  failed:    'Échouée',
  returned:  'Retournée',
};

const STATUS_COLORS: Record<string, string> = {
  new:       'bg-blue-100 text-blue-700',
  confirmed: 'bg-yellow-100 text-yellow-700',
  shipped:   'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  failed:    'bg-red-100 text-red-700',
  returned:  'bg-gray-100 text-gray-700',
};

const getStatusLabel = (s: string) => STATUS_LABELS[s] ?? s;
const getStatusColor = (s: string) => STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-700';

// ── Composant : Modal de bienvenue ────────────────────────────────────────────

type WelcomeModalProps = {
  userName: string;
  onClose: () => void;
};

function WelcomeModal({ userName, onClose }: WelcomeModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: <Package size={28} />,
      title: 'Ajoutez vos produits',
      description: 'Commencez par enregistrer vos produits avec leur coût d\'achat et prix de vente. AfriCommerce Pro calculera votre marge brute automatiquement.',
      action: 'Ajouter un produit',
      href: '/products',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
    },
    {
      icon: <Zap size={28} />,
      title: 'Calculez votre prix idéal',
      description: 'Le Calculateur tient compte des échecs de livraison, de la publicité et de tous les coûts cachés pour vous donner le vrai prix de vente rentable.',
      action: 'Ouvrir le calculateur',
      href: '/calculator',
      color: 'text-[#E67E22]',
      bgColor: 'bg-orange-50 border-orange-200',
    },
    {
      icon: <ShoppingBag size={28} />,
      title: 'Enregistrez vos commandes',
      description: 'Chaque commande livrée déduit automatiquement votre stock. Suivez vos livraisons et identifiez vos clients fiables grâce au scoring.',
      action: 'Voir les commandes',
      href: '/orders',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
    },
  ];

  function handleAction(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative">

        {/* Bouton fermer */}
        <button onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition">
          <X size={18} />
        </button>

        {/* ── ÉTAPE 0 : Intro ───────────────────────────────────────────── */}
        {step === 0 && (
          <>
            <div className="bg-gradient-to-br from-[#1A5276] to-blue-800 p-8 text-white text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#E67E22] rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-300 rounded-full blur-2xl" />
              </div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <Zap size={32} className="text-[#E67E22]" />
                </div>
                <h2 className="text-2xl font-extrabold mb-2">
                  Bienvenue{userName ? `, ${userName.split(' ')[0]}` : ''} ! 🎉
                </h2>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Votre compte AfriCommerce Pro est prêt.<br />
                  Découvrez comment démarrer en 3 étapes simples.
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-2 mb-6">
                {steps.map((s, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${s.bgColor}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color} bg-white shrink-0 shadow-sm`}>
                      {s.icon}
                    </div>
                    <span className="font-semibold text-gray-900 text-sm flex-1">
                      <span className="text-gray-400 mr-1">{i + 1}.</span> {s.title}
                    </span>
                    <ChevronRight size={15} className="text-gray-300 shrink-0" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-[#E67E22] hover:bg-orange-600 text-white rounded-xl font-semibold text-sm transition">
                  Commencer la visite guidée
                </button>
                <button onClick={onClose}
                  className="px-4 py-3 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 transition">
                  Passer
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── ÉTAPES 1, 2, 3 ────────────────────────────────────────────── */}
        {step > 0 && step <= 3 && (() => {
          const current = steps[step - 1];
          return (
            <>
              {/* Barre de progression */}
              <div className="flex gap-1.5 p-4 pb-0">
                {steps.map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                    i < step ? 'bg-[#E67E22]' : 'bg-gray-100'
                  }`} />
                ))}
              </div>

              <div className={`m-4 p-6 rounded-xl border ${current.bgColor}`}>
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${current.color} bg-white shadow-sm`}>
                  {current.icon}
                </div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Étape {step} sur 3
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{current.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{current.description}</p>
              </div>

              <div className="px-4 pb-4 flex gap-3">
                {step < 3 ? (
                  <>
                    <button onClick={() => handleAction(current.href)}
                      className="flex-1 py-3 bg-[#1A5276] hover:bg-blue-900 text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2">
                      {current.action} <ChevronRight size={16} />
                    </button>
                    <button onClick={() => setStep(s => s + 1)}
                      className="px-4 py-3 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 transition">
                      Suivant
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleAction(current.href)}
                      className="flex-1 py-3 bg-[#E67E22] hover:bg-orange-600 text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> C'est parti !
                    </button>
                    <button onClick={onClose}
                      className="px-4 py-3 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 transition">
                      Dashboard
                    </button>
                  </>
                )}
              </div>

              {/* Points de navigation */}
              <div className="flex justify-center gap-2 pb-4">
                {steps.map((_, i) => (
                  <button key={i} onClick={() => setStep(i + 1)}
                    className={`h-2 rounded-full transition-all ${
                      i + 1 === step ? 'bg-[#E67E22] w-5' : 'bg-gray-200 w-2'
                    }`} />
                ))}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ── Composant : Checklist de démarrage ────────────────────────────────────────

type DashboardChecklistProps = {
  hasProducts: boolean;
  hasOrders: boolean;
  hasCampaigns: boolean;
  userName: string;
};

function DashboardChecklist({ hasProducts, hasOrders, hasCampaigns, userName }: DashboardChecklistProps) {
  const router = useRouter();

  const items = [
    { label: 'Ajouter mon premier produit',      done: hasProducts,  href: '/products'   },
    { label: 'Calculer mon prix de vente idéal',  done: false,        href: '/calculator' },
    { label: 'Enregistrer ma première commande',  done: hasOrders,    href: '/orders'     },
    { label: 'Ajouter une campagne publicitaire',  done: hasCampaigns, href: '/campaigns'  },
  ];

  const doneCount = items.filter(i => i.done).length;
  const progress  = Math.round((doneCount / items.length) * 100);

  if (doneCount === items.length) return null; // masquer si tout est fait

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-11 h-11 bg-gradient-to-br from-[#1A5276] to-blue-700 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <Zap size={22} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">
            {userName ? `Bienvenue ${userName.split(' ')[0]} !` : 'Démarrer avec AfriCommerce Pro'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Complétez ces étapes pour tirer le meilleur de l'application.
          </p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Progression</span>
          <span className="font-semibold text-[#1A5276]">{doneCount}/{items.length} étapes</span>
        </div>
        <div className="h-2 bg-white rounded-full overflow-hidden border border-blue-100">
          <div
            className="h-full bg-gradient-to-r from-[#1A5276] to-[#E67E22] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <button key={item.label} onClick={() => !item.done && router.push(item.href)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition ${
              item.done
                ? 'bg-white/60 cursor-default'
                : 'bg-white hover:bg-white/90 shadow-sm cursor-pointer hover:border-blue-100 border border-white'
            }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
              item.done ? 'bg-green-100 text-green-600' : 'bg-[#1A5276] text-white'
            }`}>
              {item.done ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-medium flex-1 ${
              item.done ? 'line-through text-gray-400' : 'text-gray-800'
            }`}>
              {item.label}
            </span>
            {!item.done && <ArrowRight size={15} className="text-gray-300 shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Composant principal : Dashboard ──────────────────────────────────────────

export default function DashboardPage() {
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [orders, setOrders]           = useState<OrderWithProduct[]>([]);
  const [chartData, setChartData]     = useState<ChartPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [kpis, setKpis]               = useState<KPIs>({
    ordersToday: 0, ordersMonth: 0, deliveredRevenue: 0,
    realProfit: 0, successRate: 0, pendingOrders: 0, failedCost: 0,
  });
  const [hasProducts, setHasProducts]   = useState(false);
  const [hasCampaigns, setHasCampaigns] = useState(false);

  // — État modal de bienvenue
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName]       = useState('');

  // ── Vérification premier affichage ────────────────────────────────────────

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const name = user.user_metadata?.full_name ?? '';
      setUserName(name);

      // CORRECTION : clé unique par utilisateur dans localStorage
      const key = `welcome_shown_${user.id}`;
      const alreadyShown = localStorage.getItem(key);

      if (!alreadyShown) {
        // Petit délai pour laisser le dashboard se charger d'abord
        setTimeout(() => setShowWelcome(true), 800);
        localStorage.setItem(key, 'true');
      }
    };
    checkUser();
  }, []);

  // ── Fetch données ─────────────────────────────────────────────────────────

  useEffect(() => { fetchDashboardData(); }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);

    // Chargement en parallèle
    const [ordersRes, productsRes, campaignsRes] = await Promise.all([
      supabase.from('orders').select(`
        id, created_at, customer_name, total_amount,
        status, quantity, unit_price,
        delivery_cost, ad_cost_per_order,
        products(id, name, purchase_cost)
      `).order('created_at', { ascending: false }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }),
    ]);

    if (ordersRes.error) {
      console.error('Erreur:', ordersRes.error.message);
      setError('Impossible de charger les données.');
      setLoading(false);
      return;
    }

    const typed = ordersRes.data as unknown as OrderWithProduct[];
    setOrders(typed);
    setKpis(calculateKPIs(typed));
    setChartData(prepareChartData(typed));
    setTopProducts(calculateTopProducts(typed));
    setHasProducts((productsRes.count ?? 0) > 0);
    setHasCampaigns((campaignsRes.count ?? 0) > 0);
    setLoading(false);
  }

  // ── Calculs ───────────────────────────────────────────────────────────────

  function calculateKPIs(data: OrderWithProduct[]): KPIs {
    const now          = new Date();
    const todayStr     = now.toISOString().split('T')[0];
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let ordersToday = 0, ordersMonth = 0, deliveredRevenue = 0;
    let realProfit  = 0, pendingOrders = 0, failedCost = 0, deliveredCount = 0;

    data.forEach(order => {
      const orderDate = new Date(order.created_at);
      if (order.created_at.split('T')[0] === todayStr) ordersToday++;
      if (orderDate >= startOfMonth) ordersMonth++;

      if (order.status === 'delivered') {
        deliveredCount++;
        deliveredRevenue += order.total_amount ?? 0;
        const purchaseCost = (order.products?.purchase_cost ?? 0) * (order.quantity ?? 1);
        realProfit += (order.total_amount ?? 0) - purchaseCost - (order.delivery_cost ?? 0) - (order.ad_cost_per_order ?? 0);
      }

      if (STATUS_PENDING.includes(order.status)) pendingOrders++;
      if (STATUS_FAILED.includes(order.status))  failedCost += order.delivery_cost ?? 0;
    });

    const closedOrders = data.filter(o => STATUS_CLOSED.includes(o.status)).length;
    const successRate  = closedOrders > 0 ? Math.round((deliveredCount / closedOrders) * 100) : 0;

    return { ordersToday, ordersMonth, deliveredRevenue, realProfit, successRate, pendingOrders, failedCost };
  }

  function prepareChartData(data: OrderWithProduct[]): ChartPoint[] {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toISOString().split('T')[0]] = 0;
    }
    data.forEach(o => { const k = o.created_at.split('T')[0]; if (k in days) days[k]++; });
    return Object.entries(days).map(([key, count]) => ({
      date: new Date(key).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      commandes: count,
    }));
  }

  function calculateTopProducts(data: OrderWithProduct[]): TopProduct[] {
    const map: Record<string, { name: string; revenue: number }> = {};
    data.forEach(o => {
      if (o.status === 'delivered' && o.products) {
        const id = o.products.id;
        if (!map[id]) map[id] = { name: o.products.name, revenue: 0 };
        map[id].revenue += o.total_amount ?? 0;
      }
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5).map(p => ({ name: p.name, revenus: p.revenue }));
  }

  const recentOrders = useMemo(() => orders.slice(0, 10), [orders]);
  const hasOrders    = orders.length > 0;

  // ── États spéciaux ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center gap-4 text-center">
        <AlertTriangle size={40} className="text-red-500" />
        <p className="text-red-600 font-medium">{error}</p>
        <button onClick={fetchDashboardData}
          className="px-4 py-2 bg-[#1A5276] text-white rounded-lg text-sm hover:bg-blue-800 transition">
          Réessayer
        </button>
      </div>
    );
  }

  // ── Rendu principal ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── MODAL DE BIENVENUE ────────────────────────────────────────── */}
      {showWelcome && (
        <WelcomeModal
          userName={userName}
          onClose={() => setShowWelcome(false)}
        />
      )}

      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          {userName && <p className="text-sm text-gray-500 mt-0.5">Bonjour {userName.split(' ')[0]} 👋</p>}
        </div>
        <p className="text-sm text-gray-500">Performances détaillées</p>
      </div>

      {/* ── CHECKLIST DÉMARRAGE (visible tant que pas tout complété) ──── */}
      <DashboardChecklist
        hasProducts={hasProducts}
        hasOrders={hasOrders}
        hasCampaigns={hasCampaigns}
        userName={userName}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Aujourd'hui</span>
            <ShoppingBag size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold">{kpis.ordersToday}</p>
          <p className="text-xs text-gray-400 mt-1">Commandes</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Ce mois</span>
            <Package size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold">{kpis.ordersMonth}</p>
          <p className="text-xs text-gray-400 mt-1">Commandes</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Revenus</span>
            <TrendingUp size={16} className="text-green-600" />
          </div>
          <p className="text-xl font-bold text-green-700">{formatMoney(kpis.deliveredRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">Commandes livrées</p>
        </div>

        <div className={`p-4 rounded-xl shadow-sm border ${
          kpis.realProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium ${kpis.realProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>Profit réel</span>
            <DollarSign size={16} className={kpis.realProfit >= 0 ? 'text-green-600' : 'text-red-600'} />
          </div>
          <p className={`text-xl font-bold ${kpis.realProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatMoney(kpis.realProfit)}
          </p>
          <p className={`text-xs mt-1 ${kpis.realProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            Achat + livraison + pub
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Taux succès</span>
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold">{kpis.successRate}%</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div className="bg-green-600 h-1.5 rounded-full transition-all" style={{ width: `${kpis.successRate}%` }} />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-red-600 font-medium">Coût échecs</span>
            <XCircle size={16} className="text-red-600" />
          </div>
          <p className="text-xl font-bold text-red-700">{formatMoney(kpis.failedCost)}</p>
          <p className="text-xs text-red-600 mt-1">Livraisons perdues</p>
        </div>
      </div>

      {/* Alerte commandes en attente */}
      {kpis.pendingOrders > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="text-orange-600" size={18} />
            <span className="text-sm font-medium text-orange-800">
              Vous avez <span className="font-bold">{kpis.pendingOrders} commandes</span> en attente.
            </span>
          </div>
          <Link href="/orders" className="text-sm font-medium text-orange-700 hover:underline">Voir →</Link>
        </div>
      )}

      {/* Graphiques */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Commandes (30 jours)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="commandes" stroke="#E67E22" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Top 5 Produits (Revenus)</h3>
          <div className="h-72">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatMoney(value)} />
                  <Bar dataKey="revenus" fill="#1A5276" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                <Package size={32} className="opacity-40" />
                <p className="text-sm">Aucune livraison réussie pour l'instant</p>
                <Link href="/orders" className="text-xs text-[#1A5276] hover:underline">Enregistrer des commandes →</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Commandes récentes */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Commandes récentes</h2>
          <Link href="/orders" className="text-sm text-[#E67E22] hover:underline flex items-center gap-1">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Client</th>
                <th className="px-6 py-3 text-left">Produit</th>
                <th className="px-6 py-3 text-right">Montant</th>
                <th className="px-6 py-3 text-left">Statut</th>
                <th className="px-6 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune commande pour l'instant</p>
                    <Link href="/orders" className="text-xs text-[#1A5276] hover:underline mt-1 inline-block">
                      Créer ma première commande →
                    </Link>
                  </td>
                </tr>
              ) : (
                recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{order.customer_name || 'Client'}</td>
                    <td className="px-6 py-4 text-gray-500">{order.products?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-right font-medium">{formatMoney(order.total_amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-[#1A5276] to-blue-800 rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-lg font-bold mb-2">Prêt à vendre ?</h3>
          <p className="text-blue-100 text-sm mb-4">Ajoutez rapidement un nouveau produit.</p>
          <Link href="/products"
            className="inline-flex items-center gap-2 bg-white text-[#1A5276] px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-100 transition">
            <Plus size={16} /> Ajouter un produit
          </Link>
        </div>
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          {kpis.pendingOrders === 0 ? (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Tout est à jour 👍</h3>
              <p className="text-gray-500 text-sm">Aucune commande en attente de traitement.</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Action requise</h3>
              <p className="text-gray-500 text-sm mb-3">
                {kpis.pendingOrders} commande{kpis.pendingOrders > 1 ? 's' : ''} à traiter.
              </p>
              <Link href="/orders"
                className="inline-flex items-center gap-2 bg-[#E67E22] text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-orange-600 transition">
                Traiter maintenant <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </div>

    </div>
  );
}