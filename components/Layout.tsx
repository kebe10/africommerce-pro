'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Ajout de useRouter
import { 
  Home, 
  Package, 
  ShoppingBag, 
  Calculator, 
  Truck, 
  Megaphone, 
  Users, 
  Settings, 
  Menu,
  X,
  LogOut // Ajout de l'icône Déconnexion
} from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Import de Supabase

const navItems = [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home },
  { name: 'Commandes', href: '/orders', icon: Package },
  { name: 'Produits', href: '/products', icon: ShoppingBag },
  { name:'Fournisseurs', href: '/suppliers', icon: Truck },
  { name: 'Calculateur', href: '/calculator', icon: Calculator, highlight: true },
  { name: 'Livraisons', href: '/deliveries', icon: Truck },
  { name: 'Campagnes', href: '/campaigns', icon: Megaphone },
  { name: 'Clients', href: '/customers', icon: Users },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter(); // Pour rediriger après déconnexion
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fonction de déconnexion
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login'); // Redirige vers la page de connexion
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center justify-center border-b border-gray-200 px-6">
          <Link href="/dashboard" className="text-xl font-bold text-[#1A5276]">AfriCommerce Pro</Link>
        </div>
        
        {/* Navigation (pousse le bouton déconnexion vers le bas) */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-[#1A5276] text-white' 
                    : 'text-gray-600 hover:bg-gray-100'}
                  ${item.highlight && !isActive ? 'text-[#E67E22] font-bold' : ''}`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bouton Déconnexion (en bas) */}
        <div className="p-4 border-t">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <h1 className="text-lg font-bold text-[#1A5276]">AfriCommerce Pro</h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)}>
           <div className="w-64 h-full bg-white flex flex-col" onClick={e => e.stopPropagation()}>
             <nav className="flex-1 pt-16 p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
             </nav>
             {/* Bouton Déconnexion Mobile */}
             <div className="p-4 border-t">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 w-full"
              >
                <LogOut className="h-5 w-5" />
                Déconnexion
              </button>
             </div>
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-40">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center p-2 text-xs 
              ${pathname === item.href ? 'text-[#1A5276]' : 'text-gray-500'}`}
          >
            <item.icon className="h-5 w-5 mb-1" />
            {item.name.split(' ')[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}