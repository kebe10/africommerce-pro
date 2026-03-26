'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Home, 
  Package, 
  ShoppingBag, 
  Users, 
  Truck, 
  Calculator, 
  Megaphone, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  DollarSign,
  Sparkles
} from 'lucide-react';

const navItems = [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home },
  { name: 'Commandes', href: '/orders', icon: Package },
  { name: 'Produits', href: '/products', icon: ShoppingBag },
  { name: 'Clients', href: '/customers', icon: Users },
  { name: 'Livraisons', href: '/deliveries', icon: Truck },
  { name: 'Fournisseurs', href: '/suppliers', icon: DollarSign },
  { name: 'Campagnes', href: '/campaigns', icon: Megaphone },
  { name: 'Calculateur', href: '/calculator', icon: Calculator, highlight: true },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (pathname === '/login' || pathname === '/pricing' || pathname === '/update-password') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Sidebar (Overlay) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Fond noir transparent */}
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          ></div>
          
          {/* Panneau du menu latéral */}
          <div className="fixed inset-y-0 left-0 flex flex-col w-full max-w-xs bg-white shadow-xl">
            
            {/* En-tête du menu (Logo + Fermer) */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
              <h1 className="text-xl font-bold text-[#1A5276]">AfriCommerce Pro</h1>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {/* Partie centrale scrollable (Liens) */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-[#1A5276] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  } ${item.highlight ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:text-green-800' : ''}`}
                >
                  <item.icon size={20} />
                  {item.name}
                </Link>
              ))}
            </div>

            {/* PIED DE PAGE FIXE (Déconnexion) */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut size={20} />
                Déconnexion
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow border-r border-gray-200 bg-white overflow-y-auto">
          <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-gray-200 bg-white">
            <h1 className="text-xl font-bold text-[#1A5276]">AfriCommerce Pro</h1>
          </div>
          <div className="flex-grow flex flex-col py-6 px-4 space-y-1.5">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-[#1A5276] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${item.highlight ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:text-green-800' : ''}`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            ))}
            
            {/* IA Button Sidebar */}
            <div className="pt-4">
              <Link
                href="/campaigns"
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 hover:bg-purple-100"
              >
                <Sparkles size={18} />
                Planificateur IA
              </Link>
            </div>
          </div>
          
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-[#E67E22] flex items-center justify-center text-white text-sm font-bold">
                  {user?.email?.[0].toUpperCase()}
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{user?.user_metadata?.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 p-1 text-gray-400 hover:text-red-600"
                title="Déconnexion"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top Bar Mobile */}
        <div className="sticky top-0 z-10 md:hidden bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-bold text-[#1A5276]">AfriCommerce Pro</h1>
            <div className="w-8 h-8 rounded-full bg-[#E67E22] flex items-center justify-center text-white text-xs font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}