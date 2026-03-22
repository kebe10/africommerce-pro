// Formatage FCFA simple
export const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

// Calcul marge
export const calculateMargin = (cost: number, price: number) => {
  if (cost === 0) return 0;
  return ((price - cost) / price) * 100;
};

// Lien WhatsApp
export const getWhatsAppLink = (phone: string, message: string = '') => {
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
    cleanPhone = '225' + cleanPhone.substring(1);
  }
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}${message ? `?text=${encodedMessage}` : ''}`;
};