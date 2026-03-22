import Link from 'next/link';
import { 
  ArrowRight, CheckCircle, TrendingUp, Users, Truck, MessageCircle, 
  Package, ShieldCheck, DollarSign, Zap, Star 
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="bg-white text-gray-900">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-xl font-bold text-[#1A5276]">AfriCommerce Pro</div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-[#1A5276] transition">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-[#1A5276] transition">Tarifs</a>
            <a href="#testimonials" className="hover:text-[#1A5276] transition">Témoignages</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium hover:text-[#1A5276]">Connexion</Link>
            <Link href="/login" className="bg-[#E67E22] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 shadow-sm transition">
              Démarrer Gratuitement
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-[#1A5276] to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#E67E22] rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-300 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs font-bold mb-6 text-orange-300 uppercase tracking-wide">
              <Zap size={14} /> Le 1er outil Rentabilité pour l'Afrique
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
              Arrêtez de perdre de l'argent.<br/>
              <span className="text-[#E67E22]">Maîtrisez votre rentabilité.</span>
            </h1>
            <p className="text-lg text-blue-100 mb-8 leading-relaxed">
              Vous perdez jusqu'à <strong>30% de vos bénéfices</strong> à cause des échecs de livraison et des calculs de prix incorrects. Notre outil calcule vos prix incluant les risques réels. <strong>Passez de la survie à la croissance.</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login" className="flex items-center justify-center gap-2 bg-[#E67E22] text-white px-8 py-4 rounded-xl font-bold hover:bg-orange-600 shadow-lg transition-all hover:scale-105 text-lg">
                Essai Gratuit 14 Jours <ArrowRight size={20} />
              </Link>
              <a href="#pricing" className="flex items-center justify-center gap-2 bg-white/10 border border-white/30 px-8 py-4 rounded-xl font-semibold hover:bg-white/20 backdrop-blur-sm transition text-lg">
                Voir les Tarifs
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-blue-200">
              <span className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400" /> Pas de carte requise</span>
              <span className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400" /> Annulation facile</span>
            </div>
          </div>
          
          {/* Mockup Image */}
          <div className="relative hidden lg:block">
            <div className="bg-white rounded-xl shadow-2xl border p-2 transform rotate-1 hover:rotate-0 transition-transform duration-500">
              <img 
                src="https://placehold.co/800x500/FFFFFF/1A5276?text=Dashboard+Preview" 
                alt="Aperçu du Dashboard AfriCommerce" 
                className="rounded-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- SOCIAL PROOF --- */}
      <section className="py-8 bg-gray-50 border-y">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm mb-4 uppercase font-bold">Ils nous font confiance</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-50 grayscale">
            <span className="text-xl font-bold text-gray-700">Abidjan Shop</span>
            <span className="text-xl font-bold text-gray-700">Dakar Market</span>
            <span className="text-xl font-bold text-gray-700">Yaoundé Store</span>
            <span className="text-xl font-bold text-gray-700">AfroFashion</span>
          </div>
        </div>
      </section>

      {/* --- PAIN POINTS --- */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Vos bénéfices fondent-ils ?</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            L'e-commerce en Afrique est unique. Voici pourquoi les méthodes classiques échouent.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
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

      {/* --- SOLUTION (FEATURES) --- */}
      <section id="features" className="py-20 px-4 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">La solution : Un "Business Partner"</h2>
          <p className="text-center text-gray-400 mb-16 max-w-2xl mx-auto">
            AfriCommerce Pro a été conçu pour résoudre exactement ces problèmes.
          </p>
          
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            
            <div className="bg-[#1A5276] p-8 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-[#E67E22] p-2 rounded-lg">
                  <TrendingUp size={24} />
                </div>
                <h3 className="text-2xl font-bold">Calculateur Intelligent</h3>
              </div>
              <p className="text-blue-100 mb-6">
                Entrez votre coût d'achat, votre budget pub et le taux d'échec de votre pays. L'outil vous donne le prix de vente idéal pour garantir votre marge. Finies les surprises !
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-300" /> Intégration des coûts cachés</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-300" /> Simulation de marge en temps réel</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-300" /> Données pré-configurées (CI, SN, CM)</li>
              </ul>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4 items-start bg-white/5 p-4 rounded-lg">
                <div className="bg-white p-2 rounded-lg text-[#1A5276]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Score de Fiabilité Client</h4>
                  <p className="text-sm text-gray-400">Identifiez automatiquement les "mauvais payeurs" grâce à notre algorithme.</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start bg-white/5 p-4 rounded-lg">
                <div className="bg-white p-2 rounded-lg text-[#1A5276]">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Intégration WhatsApp</h4>
                  <p className="text-sm text-gray-400">Contactez vos clients en 1 clic avec des messages pré-remplis.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start bg-white/5 p-4 rounded-lg">
                <div className="bg-white p-2 rounded-lg text-[#1A5276]">
                  <Package size={20} />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Gestion des Stocks & Campagnes</h4>
                  <p className="text-sm text-gray-400">Suivez vos stocks, vos pubs Facebook et calculez votre ROAS.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section id="testimonials" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Ce que disent nos utilisateurs</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-xl border text-left">
              <div className="flex text-yellow-400 mb-2">
                <Star size={18} fill="currentColor" /><Star size={18} fill="currentColor" /><Star size={18} fill="currentColor" /><Star size={18} fill="currentColor" /><Star size={18} fill="currentColor" />
              </div>
              <p className="text-gray-600 italic mb-4">"Je pensais gagner 15 000 FCFA par commande, en réalité je perdais de l'argent. Grâce au calculateur, j'ai ajusté mes prix et mon bénéfice a doublé en 2 mois."</p>
              <div className="font-bold text-gray-900">Amadou K. <span className="text-gray-400 font-normal text-sm">- Abidjan</span></div>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl border text-left">
              <div className="flex text-yellow-400 mb-2">
                <Star size={18} fill="currentColor" /><Star size={18} fill="currentColor" /><Star size={18} fill="currentColor" /><Star size={18} fill="currentColor" /><Star size={18} fill="currentColor" />
              </div>
              <p className="text-gray-600 italic mb-4">"Le score client m'a permis d'arrêter de livrer aux clients qui ne paient jamais. Moins de stress, plus de revenus."</p>
              <div className="font-bold text-gray-900">Fatou D. <span className="text-gray-400 font-normal text-sm">- Dakar</span></div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border text-left">
              <div className="flex text-yellow-400 mb-2">
                <Star size={18} fill="currentColor" /><Star size={18} fill="currentColor" /><Star size={18} fill="currentColor" /><Star size={18} fill="currentColor" /><Star size={18} fill="currentColor" />
              </div>
              <p className="text-gray-600 italic mb-4">"Enfin un outil qui comprend les réalités du marché africain. L'intégration WhatsApp me fait gagner un temps fou."</p>
              <div className="font-bold text-gray-900">Jean-Pierre M. <span className="text-gray-400 font-normal text-sm">- Douala</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PRICING --- */}
      <section id="pricing" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Un prix adapté à votre réussite</h2>
          <p className="text-gray-600 mb-12">Essai gratuit de 14 jours. Aucune carte bancaire requise.</p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Plan Essai */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-md transition text-left">
              <h3 className="font-bold text-lg mb-2">Découverte</h3>
              <p className="text-sm text-gray-500 mb-6">Pour tester la puissance de l'outil</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">Gratuit</span>
              </div>
              <ul className="text-left text-sm space-y-3 mb-8 text-gray-600">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#1A5276]" /> Accès total pendant 14 jours</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#1A5276]" /> Calculateur de rentabilité</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#1A5276]" /> Score de fiabilité client</li>
              </ul>
              <Link href="/login" className="block w-full py-3 border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50 text-center">
                Commencer l'essai gratuit
              </Link>
            </div>

            {/* Plan Pro (Recommended) */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-[#E67E22] relative text-left transform scale-105">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#E67E22] text-white px-3 py-1 rounded-full text-xs font-bold uppercase shadow-lg">
                Le plus populaire
              </div>
              <h3 className="font-bold text-lg mb-2">Pro</h3>
              <p className="text-sm text-gray-500 mb-6">Pour faire décoller votre business</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">6 500</span>
                <span className="text-gray-500"> FCFA/mois</span>
              </div>
              <ul className="text-left text-sm space-y-3 mb-8 text-gray-600">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#E67E22]" /> <strong>Tout</strong> ce qui est dans Découverte</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#E67E22]" /> Produits & Stocks illimités</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#E67E22]" /> Intégration WhatsApp</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#E67E22]" /> Analytics Avancés & Rapports</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#E67E22]" /> Support Prioritaire</li>
              </ul>
              <Link href="/login" className="block w-full py-3 bg-[#E67E22] text-white rounded-xl font-semibold text-sm hover:bg-orange-600 shadow-lg shadow-orange-200 text-center">
                Essai Gratuit 14 jours
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Questions Fréquentes</h2>
          
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h4 className="font-bold mb-2">Puis-je payer par Mobile Money ?</h4>
              <p className="text-sm text-gray-600">Oui ! Nous acceptons les paiements par Mobile Money (Orange Money, Wave, Moov) et cartes bancaires locales.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h4 className="font-bold mb-2">Que se passe-t-il après les 14 jours ?</h4>
              <p className="text-sm text-gray-600">L'accès est restreint. Vous pouvez vous abonner au plan Pro pour continuer à profiter de toutes les fonctionnalités.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h4 className="font-bold mb-2">Est-ce adapté au dropshipping ?</h4>
              <p className="text-sm text-gray-600">Absolument. La gestion des fournisseurs et des délais est parfaitement adaptée au dropshipping africain.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">AfriCommerce Pro</h3>
            <p className="text-sm">Le futur du e-commerce ouest-africain commence ici.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Produit</h4>
            <ul className="text-sm space-y-2">
              <li><a href="#features" className="hover:text-white">Fonctionnalités</a></li>
              <li><a href="#pricing" className="hover:text-white">Tarifs</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Entreprise</h4>
            <ul className="text-sm space-y-2">
              <li><a href="#" className="hover:text-white">À propos</a></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Légal</h4>
            <ul className="text-sm space-y-2">
              <li><a href="#" className="hover:text-white">Confidentialité</a></li>
              <li><a href="#" className="hover:text-white">CGU</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm">
          © 2024 AfriCommerce Pro. Tous droits réservés.
        </div>
      </footer>

    </div>
  );
}