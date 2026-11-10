// Keep common navigation and calls to action idiomatic rather than translating them word by word.
const labels = {
  Solutions: ['Lösungen', 'Soluzioni', 'Soluciones', 'Solutions'],
  'Case Studies': ['Fallstudien', 'Casi di studio', 'Casos de estudio', 'Études de cas'],
  Pricing: ['Preise', 'Prezzi', 'Precios', 'Tarifs'],
  About: ['Über mich', 'Chi sono', 'Sobre mí', 'À propos'],
  Insights: ['Einblicke', 'Approfondimenti', 'Artículos', 'Articles'],
  Contact: ['Kontakt', 'Contatti', 'Contacto', 'Contact'],
  'Client Portal': ['Kundenportal', 'Portale clienti', 'Portal de clientes', 'Espace client'],
  'Book a Call': [
    'Gespräch buchen',
    'Prenota una chiamata',
    'Reserva una llamada',
    'Réserver un appel',
  ],
  'Book a Strategy Call': [
    'Strategiegespräch buchen',
    'Prenota una consulenza',
    'Reserva una consulta',
    'Réserver un appel stratégique',
  ],
  'Learn More About Me': [
    'Mehr über mich',
    'Scopri di più su di me',
    'Más sobre mí',
    'En savoir plus sur moi',
  ],
};
export const translatedLabel = (text, language) =>
  labels[text]?.[['de', 'it', 'es', 'fr'].indexOf(language)];
