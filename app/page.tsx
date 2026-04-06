'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight, CheckCircle, TrendingUp, Users, Truck,
  MessageCircle, Package, ShieldCheck, DollarSign,
  Zap, Star, Menu, X, Phone
} from 'lucide-react';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="bg-white text-gray-900">

      {/* ── BANDEAU URGENCE ──────────────────────────────────────────────────── */}
      <div className="bg-[#E67E22] text-white text-center py-2 text-sm font-medium">
        🎉 Offre de lancement : 3 premiers mois à -50% avec le code{' '}
        <strong className="underline underline-offset-2">AFRICA50</strong>
      </div>

      {/* ── NAVBAR ───────────────────────────────────────────────────────────── */}
      <nav className={`sticky top-0 w-full bg-white/95 backdrop-blur-md z-50 border-b transition-all duration-300 ${
        scrolled ? 'shadow-md border-gray-200' : 'border-gray-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-xl font-bold text-[#1A5276]">AfriCommerce Pro</div>

          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features"     className="hover:text-[#1A5276] transition">Fonctionnalités</a>
            <a href="#pricing"      className="hover:text-[#1A5276] transition">Tarifs</a>
            <a href="#testimonials" className="hover:text-[#1A5276] transition">Témoignages</a>
            <a href="#faq"          className="hover:text-[#1A5276] transition">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-[#1A5276] transition">
              Connexion
            </Link>
            <Link href="/register"
              className="bg-[#E67E22] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 shadow-sm transition">
              Démarrer Gratuitement
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-gray-600 hover:text-[#1A5276] transition"
            onClick={() => setMenuOpen(p => !p)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3 shadow-lg">
            <a href="#features"     onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2 hover:text-[#1A5276]">Fonctionnalités</a>
            <a href="#pricing"      onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2 hover:text-[#1A5276]">Tarifs</a>
            <a href="#testimonials" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2 hover:text-[#1A5276]">Témoignages</a>
            <a href="#faq"          onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2 hover:text-[#1A5276]">FAQ</a>
            <div className="pt-2 border-t flex flex-col gap-2">
              <Link href="/login"    className="text-center text-sm font-medium border border-gray-200 py-2 rounded-lg hover:bg-gray-50 transition">Connexion</Link>
              <Link href="/register" className="text-center text-sm font-medium bg-[#E67E22] text-white py-2 rounded-lg hover:bg-orange-600 transition">Démarrer Gratuitement</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="pt-20 pb-20 px-4 bg-gradient-to-br from-[#1A5276] to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#E67E22] rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-300 rounded-full filter blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">

          {/* Colonne gauche — texte */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs font-bold mb-6 text-orange-300 uppercase tracking-wide">
              <Zap size={14} /> Le 1er outil Rentabilité pour l'Afrique
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
              Arrêtez de perdre de l'argent.<br />
              <span className="text-[#E67E22]">Maîtrisez votre rentabilité.</span>
            </h1>
            <p className="text-lg text-blue-100 mb-8 leading-relaxed">
              Vous perdez jusqu'à <strong>30% de vos bénéfices</strong> à cause des
              échecs de livraison et des calculs de prix incorrects. Notre outil
              calcule vos prix incluant les risques réels.{' '}
              <strong>Passez de la survie à la croissance.</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register"
                className="flex items-center justify-center gap-2 bg-[#E67E22] text-white px-8 py-4 rounded-xl font-bold hover:bg-orange-600 shadow-lg transition-all hover:scale-105 text-lg">
                Essai Gratuit 14 Jours <ArrowRight size={20} />
              </Link>
              <a href="#pricing"
                className="flex items-center justify-center gap-2 bg-white/10 border border-white/30 px-8 py-4 rounded-xl font-semibold hover:bg-white/20 backdrop-blur-sm transition text-lg">
                Voir les Tarifs
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-blue-200">
              <span className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400" /> Pas de carte requise</span>
              <span className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400" /> Annulation facile</span>
              <span className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400" /> Données en FCFA</span>
            </div>
          </div>

          {/* Colonne droite — image dashboard */}
          <div className="relative hidden lg:block">
            <div className="bg-white rounded-2xl shadow-2xl border p-2 transform rotate-1 hover:rotate-0 transition-transform duration-500">
              <img
                src="https://hovsjhxghvrnxcdyuedh.supabase.co/storage/v1/object/public/image%20africommerce%20pro/tableau%20de%20bord%20africommerce%20pro.%20v2.PNG"
                alt="Dashboard AfriCommerce Pro"
                className="rounded-xl w-full"
              />
            </div>
            {/* Badge flottant */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-3 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm font-bold">✓</span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Profit réel calculé</p>
                <p className="text-xs text-green-600">+482 000 FCFA ce mois</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────────────── */}
      <section className="py-12 bg-gray-50 border-y">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm mb-8 uppercase font-bold tracking-wider">
            Déjà utilisé par des e-commerçants en Afrique francophone
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-3xl font-extrabold text-[#1A5276]">+200</p>
              <p className="text-sm text-gray-500 mt-1">E-commerçants actifs</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#1A5276]">+15 000</p>
              <p className="text-sm text-gray-500 mt-1">Commandes gérées</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#1A5276]">3 pays</p>
              <p className="text-sm text-gray-500 mt-1">CI · SN · CM</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#1A5276]">4.9/5</p>
              <p className="text-sm text-gray-500 mt-1">Satisfaction client</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Vos bénéfices fondent-ils ?</h2>
          <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
            L'e-commerce en Afrique est unique. Voici pourquoi les méthodes classiques échouent.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-red-50 p-8 rounded-xl border border-red-100 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                <Truck size={24} />
              </div>
              <h3 className="font-bold text-lg mb-2">Échecs de Livraison</h3>
              <p className="text-sm text-gray-600">30% de vos colis reviennent ? Vous perdez le produit ET la livraison. C'est ingérable sans outil adapté.</p>
            </div>
            <div className="bg-orange-50 p-8 rounded-xl border border-orange-100 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-4">
                <DollarSign size={24} />
              </div>
              <h3 className="font-bold text-lg mb-2">Prix Incorrects</h3>
              <p className="text-sm text-gray-600">Vous calculez sans inclure les coûts cachés et le taux d'échec ? Vous vendez à perte sans le savoir.</p>
            </div>
            <div className="bg-blue-50 p-8 rounded-xl border border-blue-100 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                <Users size={24} />
              </div>
              <h3 className="font-bold text-lg mb-2">Clients Indélicats</h3>
              <p className="text-sm text-gray-600">Certains clients commandent mais ne paient jamais. Comment les identifier avant d'envoyer ?</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">La solution : Un "Business Partner"</h2>
          <p className="text-center text-gray-400 mb-16 max-w-2xl mx-auto">
            AfriCommerce Pro a été conçu pour résoudre exactement ces problèmes.
          </p>
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="bg-[#1A5276] p-8 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#E67E22] p-2 rounded-lg"><TrendingUp size={22} /></div>
                <h3 className="text-2xl font-bold">Calculateur Intelligent</h3>
              </div>
              <p className="text-blue-100 mb-6 text-sm leading-relaxed">
                Entrez votre coût d'achat, votre budget pub et le taux d'échec de votre pays.
                L'outil vous donne le prix de vente idéal pour garantir votre marge. Finies les surprises !
              </p>
              <ul className="space-y-2 text-sm">
                {['Intégration des coûts cachés', 'Simulation de marge en temps réel', 'Données pré-configurées (CI, SN, CM)'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle size={15} className="text-green-300 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              {[
                { icon: <ShieldCheck size={20} />, title: 'Score de Fiabilité Client', text: 'Identifiez automatiquement les "mauvais payeurs" grâce à notre algorithme de scoring.' },
                { icon: <MessageCircle size={20} />, title: 'Intégration WhatsApp', text: 'Contactez vos clients en 1 clic avec des messages pré-remplis depuis votre dashboard.' },
                { icon: <Package size={20} />, title: 'Gestion des Stocks & Campagnes', text: 'Suivez vos stocks, vos pubs Facebook et calculez votre ROAS en temps réel.' },
                { icon: <Truck size={20} />, title: 'Suivi des Livraisons', text: 'Analysez vos taux de succès par ville et identifiez les zones à risque.' },
              ].map(({ icon, title, text }) => (
                <div key={title} className="flex gap-4 items-start bg-white/5 p-4 rounded-xl hover:bg-white/10 transition">
                  <div className="bg-white p-2 rounded-lg text-[#1A5276] shrink-0">{icon}</div>
                  <div>
                    <h4 className="font-bold mb-1 text-sm">{title}</h4>
                    <p className="text-xs text-gray-400">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ce que disent nos utilisateurs</h2>
          <p className="text-gray-500 mb-12">Des e-commerçants comme vous, qui ont transformé leur business.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: '"Je pensais gagner 15 000 FCFA par commande, en réalité je perdais de l\'argent. Grâce au calculateur, j\'ai ajusté mes prix et mon bénéfice a doublé en 2 mois."', name: 'Amadou K.', city: 'Abidjan', flag: '🇨🇮' },
              { quote: '"Le score client m\'a permis d\'arrêter de livrer aux clients qui ne paient jamais. Moins de stress, plus de revenus. C\'est exactement ce dont j\'avais besoin."', name: 'Fatou D.', city: 'Dakar', flag: '🇸🇳' },
              { quote: '"Enfin un outil qui comprend les réalités du marché africain. L\'intégration WhatsApp me fait gagner un temps fou chaque jour."', name: 'Jean-Pierre M.', city: 'Douala', flag: '🇨🇲' },
            ].map(({ quote, name, city, flag }) => (
              <div key={name} className="bg-gray-50 p-6 rounded-xl border text-left hover:shadow-md transition">
                <div className="flex text-yellow-400 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                </div>
                <p className="text-gray-600 italic text-sm mb-4 leading-relaxed">{quote}</p>
                <div className="font-bold text-gray-900 text-sm">
                  {flag} {name} <span className="text-gray-400 font-normal">— {city}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Un prix adapté à votre réussite</h2>
          <p className="text-gray-500 mb-12">Essai gratuit de 14 jours. Aucune carte bancaire requise.</p>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">

            <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-md transition text-left flex flex-col">
              <div>
                <h3 className="font-bold text-lg mb-1">Découverte</h3>
                <p className="text-sm text-gray-500 mb-6">Pour tester la puissance de l'outil</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">Gratuit</span>
                  <p className="text-xs text-gray-400 mt-1">14 jours sans carte</p>
                </div>
                <ul className="text-sm space-y-3 mb-8 text-gray-600">
                  {['50 commandes/mois', '1 utilisateur', 'Calculateur de rentabilité', 'Score de fiabilité client'].map(f => (
                    <li key={f} className="flex items-center gap-2"><CheckCircle size={14} className="text-[#1A5276] shrink-0" /> {f}</li>
                  ))}
                </ul>
              </div>
              <Link href="/register" className="mt-auto block w-full py-3 border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50 text-center transition">
                Commencer l'essai gratuit
              </Link>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-[#E67E22] relative text-left flex flex-col transform scale-105">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#E67E22] text-white px-3 py-1 rounded-full text-xs font-bold uppercase shadow-lg whitespace-nowrap">
                ⭐ Le plus populaire
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Pro</h3>
                <p className="text-sm text-gray-500 mb-6">Pour faire décoller votre business</p>
                <div className="mb-2">
                  <span className="text-4xl font-bold">9 900</span>
                  <span className="text-gray-500"> FCFA/mois</span>
                </div>
                <p className="text-xs text-green-600 font-medium mb-6">
                  Code AFRICA50 → <span className="line-through text-gray-400">9 900</span> <strong>4 950 FCFA</strong> les 3 premiers mois
                </p>
                <ul className="text-sm space-y-3 mb-8 text-gray-600">
                  {['Tout ce qui est dans Découverte', '500 commandes/mois', '3 utilisateurs', 'Intégration WhatsApp', 'Analytics Avancés & Rapports', 'Support prioritaire'].map((f, i) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-[#E67E22] shrink-0" />
                      {i === 0 ? <strong>{f}</strong> : f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/register" className="mt-auto block w-full py-3 bg-[#E67E22] text-white rounded-xl font-semibold text-sm hover:bg-orange-600 shadow-lg text-center transition">
                Essai Gratuit 14 jours
              </Link>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-md transition text-left flex flex-col">
              <div>
                <h3 className="font-bold text-lg mb-1">Business</h3>
                <p className="text-sm text-gray-500 mb-6">Pour les grandes boutiques et équipes</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">24 900</span>
                  <span className="text-gray-500"> FCFA/mois</span>
                </div>
                <ul className="text-sm space-y-3 mb-8 text-gray-600">
                  {['Tout ce qui est dans Pro', 'Commandes illimitées', '10 utilisateurs', 'API + Intégrations avancées', 'Rapport personnalisé', 'Account manager dédié'].map((f, i) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-[#1A5276] shrink-0" />
                      {i === 0 ? <strong>{f}</strong> : f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/register" className="mt-auto block w-full py-3 border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50 text-center transition">
                Contacter les ventes
              </Link>
            </div>

          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500">
            <span>💳 Paiement accepté via :</span>
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">Orange Money</span>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">Wave</span>
            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">MTN MoMo</span>
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">Carte bancaire</span>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Questions Fréquentes</h2>
          <div className="space-y-4">
            {[
              { q: 'Puis-je payer par Mobile Money ?', a: 'Oui ! Nous acceptons les paiements par Mobile Money (Orange Money, Wave, Moov, MTN MoMo) et cartes bancaires locales et internationales.' },
              { q: 'Que se passe-t-il après les 14 jours ?', a: "L'accès est restreint au plan Découverte (50 commandes/mois). Vous pouvez vous abonner au plan Pro ou Business à tout moment pour continuer à profiter de toutes les fonctionnalités." },
              { q: 'Est-ce adapté au dropshipping ?', a: "Absolument. La gestion des fournisseurs, des délais et des taux d'échec est parfaitement adaptée au dropshipping africain." },
              { q: 'Mes données sont-elles sécurisées ?', a: "Oui. Toutes vos données sont chiffrées et hébergées sur des serveurs sécurisés. Nous ne partageons jamais vos données avec des tiers." },
              { q: 'Puis-je annuler à tout moment ?', a: "Oui, sans engagement et sans frais. Vous pouvez annuler votre abonnement depuis les paramètres de votre compte à tout moment." },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition">
                <h4 className="font-bold mb-2 text-gray-900">{q}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-r from-[#1A5276] to-blue-900 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            Prêt à maîtriser votre rentabilité ?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Rejoignez les e-commerçants africains qui ont choisi de croître intelligemment.
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2 bg-[#E67E22] text-white px-10 py-4 rounded-xl font-bold hover:bg-orange-600 shadow-lg transition hover:scale-105 text-lg">
            Démarrer Gratuitement <ArrowRight size={20} />
          </Link>
          <p className="text-blue-200 text-sm mt-4">
            14 jours gratuits · Aucune carte requise · Annulation facile
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8 mb-10">
          <div>
            <h3 className="text-white font-bold text-lg mb-3">AfriCommerce Pro</h3>
            <p className="text-sm leading-relaxed">Le futur du e-commerce ouest-africain commence ici.</p>
            <div className="mt-4 flex gap-2">
              <span className="text-lg">🇨🇮</span>
              <span className="text-lg">🇸🇳</span>
              <span className="text-lg">🇨🇲</span>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-sm">Produit</h4>
            <ul className="text-sm space-y-2">
              <li><a href="#features" className="hover:text-white transition">Fonctionnalités</a></li>
              <li><a href="#pricing"  className="hover:text-white transition">Tarifs</a></li>
              <li><a href="#faq"      className="hover:text-white transition">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-sm">Entreprise</h4>
            <ul className="text-sm space-y-2">
              <li><a href="#" className="hover:text-white transition">À propos</a></li>
              <li><a href="#" className="hover:text-white transition">Contact</a></li>
              <li><a href="#testimonials" className="hover:text-white transition">Témoignages</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-sm">Légal</h4>
            <ul className="text-sm space-y-2">
              <li><a href="#" className="hover:text-white transition">Confidentialité</a></li>
              <li><a href="#" className="hover:text-white transition">CGU</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-sm">
          © 2026 AfriCommerce Pro. Tous droits réservés. Fait avec ❤️ pour l'Afrique.
        </div>
      </footer>

      {/* Bouton WhatsApp flottant */}
      <a
        href="https://wa.me/2250700000000?text=Bonjour%2C%20je%20veux%20en%20savoir%20plus%20sur%20AfriCommerce%20Pro"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-xl z-50 transition hover:scale-110"
        title="Nous contacter sur WhatsApp"
      >
        <Phone size={22} />
      </a>

    </div>
  );
}