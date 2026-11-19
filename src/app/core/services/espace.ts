/**
 * Espace courant ('/client', '/chauffeur' ou '/admin') déduit de l'URL.
 * Les pages de réservation sont partagées : un chauffeur ou un admin peut aussi
 * commander une place sur un trajet sans quitter son propre espace.
 */
export function espaceDe(url: string): '/client' | '/chauffeur' | '/admin' {
  const segment = (url || '').split('?')[0].split('/').filter(Boolean)[0];
  if (segment === 'chauffeur') return '/chauffeur';
  if (segment === 'admin') return '/admin';
  return '/client';
}
