import { Injectable } from '@angular/core';

export interface Point { lat: number; lng: number; }

export interface Itineraire {
  /** Tracé routier (lat, lng). */
  points: [number, number][];
  /** Distance en mètres. */
  distance: number;
  /** Durée estimée en secondes. */
  duree: number;
  /** true si OSRM était injoignable : ligne droite et estimation approximative. */
  approximatif: boolean;
}

const CLE_CACHE = 'cv_geocodage_v1';
const VITESSE_MOYENNE_KMH = 55;

/**
 * Géocodage des villes (OpenStreetMap Nominatim) et calcul d'itinéraires routiers (OSRM).
 * Les résultats de géocodage sont mis en cache dans le navigateur pour respecter
 * les conditions d'usage de Nominatim (une requête par seconde au plus).
 */
@Injectable({ providedIn: 'root' })
export class GeoService {
  private cache: Record<string, Point | null> = this.lireCache();
  private derniereRequete = 0;

  /** Coordonnées d'une ville (priorité au Cameroun), ou null si introuvable. */
  async geocoder(ville: string | null | undefined): Promise<Point | null> {
    const nom = (ville ?? '').trim();
    if (!nom) return null;
    const cle = nom.toLowerCase();
    if (this.cache[cle]) return this.cache[cle];

    let point = await this.rechercher(nom, 'cm');
    if (!point) point = await this.rechercher(nom);
    // Un échec (réseau, ville inconnue) n'est pas mis en cache : on réessaiera plus tard.
    if (point) {
      this.cache[cle] = point;
      this.ecrireCache();
    }
    return point;
  }

  /** Itinéraire routier entre deux points ; repli en ligne droite si le service est indisponible. */
  async itineraire(depart: Point, arrivee: Point): Promise<Itineraire> {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${depart.lng},${depart.lat};${arrivee.lng},${arrivee.lat}?overview=full&geometries=geojson`;
      const rep = await this.fetchAvecDelai(url, 8000);
      if (rep.ok) {
        const data = await rep.json();
        const route = data?.routes?.[0];
        if (route?.geometry?.coordinates?.length) {
          return {
            points: route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]),
            distance: route.distance,
            duree: route.duration,
            approximatif: false,
          };
        }
      }
    } catch { /* repli ci-dessous */ }
    const distance = this.distance(depart, arrivee) * 1.25; // les routes ne sont jamais droites
    return {
      points: [[depart.lat, depart.lng], [arrivee.lat, arrivee.lng]],
      distance,
      duree: (distance / 1000) / VITESSE_MOYENNE_KMH * 3600,
      approximatif: true,
    };
  }

  /** Distance à vol d'oiseau en mètres (formule de haversine). */
  distance(a: Point, b: Point): number {
    const R = 6371000;
    const rad = (d: number) => d * Math.PI / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /** Cap en degrés (0 = nord) pour orienter la flèche du véhicule. */
  cap(a: Point, b: Point): number {
    const rad = (d: number) => d * Math.PI / 180;
    const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
    const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  /** Distance restante le long du tracé, depuis le point du tracé le plus proche de la position. */
  distanceRestante(trace: [number, number][], position: Point): number {
    if (trace.length < 2) return 0;
    let plusProche = 0;
    let min = Infinity;
    trace.forEach(([lat, lng], i) => {
      const d = this.distance(position, { lat, lng });
      if (d < min) { min = d; plusProche = i; }
    });
    let reste = min;
    for (let i = plusProche; i < trace.length - 1; i++) {
      reste += this.distance({ lat: trace[i][0], lng: trace[i][1] }, { lat: trace[i + 1][0], lng: trace[i + 1][1] });
    }
    return reste;
  }

  // ─── Interne ──────────────────────────────────────────────────────────────

  private async rechercher(nom: string, pays?: string): Promise<Point | null> {
    // Nominatim : une requête par seconde au maximum.
    const attente = this.derniereRequete + 1100 - Date.now();
    if (attente > 0) await new Promise(r => setTimeout(r, attente));
    this.derniereRequete = Date.now();
    const params = new URLSearchParams({ q: nom, format: 'json', limit: '1', 'accept-language': 'fr' });
    if (pays) params.set('countrycodes', pays);
    try {
      const rep = await this.fetchAvecDelai(`https://nominatim.openstreetmap.org/search?${params}`, 8000);
      if (!rep.ok) return null;
      const res = await rep.json();
      const r = res?.[0];
      return r ? { lat: Number(r.lat), lng: Number(r.lon) } : null;
    } catch {
      return null;
    }
  }

  private async fetchAvecDelai(url: string, ms: number): Promise<Response> {
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    } finally {
      clearTimeout(minuteur);
    }
  }

  private lireCache(): Record<string, Point | null> {
    try { return JSON.parse(localStorage.getItem(CLE_CACHE) || '{}'); } catch { return {}; }
  }

  private ecrireCache() {
    try { localStorage.setItem(CLE_CACHE, JSON.stringify(this.cache)); } catch { /* stockage indisponible */ }
  }
}
