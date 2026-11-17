import {
  Component, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild, AfterViewInit, inject, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { TrajetService } from '../../../core/services/trajet.service';
import { GeoService, Itineraire, Point } from '../../../core/services/geo.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

declare const L: any;

/** Au-delà de ce délai sans nouvelle position, le signal du chauffeur est considéré comme perdu. */
const SIGNAL_PERDU_MS = 2 * 60 * 1000;

/**
 * Suivi en direct d'un trajet : itinéraire routier, position du chauffeur orientée selon son cap,
 * parcours déjà effectué, distance restante, heure d'arrivée estimée et progression.
 * Utilisé par le passager (/client/suivi/:id) et par le chauffeur (/chauffeur/suivi/:id).
 */
@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
<div class="lx-page-wide">
  <a [routerLink]="retour" class="lx-back"><lx-icon name="arrow-left" /> {{ espaceChauffeur ? 'Mes trajets' : 'Mes courses' }}</a>

  <div class="head">
    <div class="lx-row" style="gap:.6rem">
      @switch (etat()) {
        @case ('direct') { <span class="lx-ping is-green"></span><span class="lx-eyebrow" style="margin:0;color:var(--lx-emerald)">En direct</span> }
        @case ('perdu') { <span class="dot-warn"></span><span class="lx-eyebrow" style="margin:0;color:var(--lx-amber)">Signal perdu</span> }
        @case ('termine') { <span class="lx-eyebrow" style="margin:0">Trajet terminé</span> }
        @default { <span class="lx-eyebrow" style="margin:0">Avant le départ</span> }
      }
    </div>
    <h2 class="lx-display route-title">
      @if (trajet()) {
        {{ trajet().villeDepart }} <lx-icon name="arrow-right" class="lx-gold" [size]="20" /> {{ trajet().villeArrivee }}
      } @else {
        Trajet #{{ trajetId() }}
      }
    </h2>
    @if (trajet()) {
      <p class="lx-muted" style="margin:.25rem 0 0;font-size:.85rem;text-transform:none">
        Départ le {{ trajet().dateDepart | date:'EEEE d MMMM' }} à {{ (trajet().heureDepart || '').slice(0,5) }}
        @if (itineraire()) { · {{ itineraire()!.distance / 1000 | number:'1.0-0' }} km@if (itineraire()!.approximatif) { (estimation) } }
      </p>
    }
  </div>

  <div class="layout">
    <div class="map-panel" [class.is-full]="pleinEcran()">
      <div #mapContainer class="map" role="application" aria-label="Carte du trajet et position du chauffeur"></div>

      @if (carteIndisponible()) {
        <div class="map-fallback"><lx-icon name="map-pin" /> Carte indisponible : vérifiez votre connexion internet.</div>
      } @else {
        <div class="map-controls">
          <button class="ctrl" (click)="basculerSuivi()" [class.is-on]="suivre()" [attr.aria-pressed]="suivre()"
            [title]="suivre() ? 'Ne plus suivre le chauffeur' : 'Suivre le chauffeur'">
            <lx-icon name="navigation" [size]="16" />
          </button>
          <button class="ctrl" (click)="voirTout()" title="Voir tout le trajet"><lx-icon name="route" [size]="16" /></button>
          <button class="ctrl" (click)="basculerPleinEcran()" [title]="pleinEcran() ? 'Quitter le plein écran' : 'Plein écran'">
            <lx-icon [name]="pleinEcran() ? 'minimize' : 'maximize'" [size]="16" />
          </button>
        </div>
        @if (chargementCarte()) {
          <div class="map-loading"><lx-icon name="refresh" class="lx-spin" [size]="16" /> Calcul de l'itinéraire…</div>
        }
        @if (!position() && etat() !== 'termine') {
          <div class="map-banner"><lx-icon name="clock" [size]="15" /> La position du chauffeur apparaîtra dès qu'il démarre le trajet et partage sa localisation.</div>
        }
      }
    </div>

    <aside class="side">
      <div class="lx-card eta-card">
        <div class="lx-muted" style="font-size:.75rem">Arrivée estimée à destination</div>
        @if (resteSecondes() !== null) {
          <div class="eta"><span class="lx-display">{{ heureArrivee() | date:'HH:mm' }}</span></div>
          <div class="eta-sub">dans {{ dureeTexte(resteSecondes()!) }} · {{ (resteMetres() ?? 0) / 1000 | number:'1.0-1' }} km restants</div>
          <div class="lx-progress" style="margin-top:.85rem" [attr.aria-label]="progression() + ' % du trajet effectué'"><span [style.width.%]="progression()"></span></div>
          <div class="progress-labels"><span>{{ trajet()?.villeDepart }}</span><span>{{ progression() }} %</span><span>{{ trajet()?.villeArrivee }}</span></div>
        } @else if (itineraire()) {
          <div class="eta"><span class="lx-display">{{ dureeTexte(itineraire()!.duree) }}</span></div>
          <div class="eta-sub">durée prévue du trajet</div>
        } @else {
          <div class="eta"><span class="lx-display">—</span></div>
        }
      </div>

      <div class="lx-card">
        <div class="lx-label">Chauffeur</div>
        @if (position(); as p) {
          <div class="facts">
            <div><span class="lx-muted">Vitesse</span><strong>{{ (p.vitesse || 0) | number:'1.0-0' }} km/h</strong></div>
            <div><span class="lx-muted">Dernier signal</span><strong>{{ ilYa() }}</strong></div>
            @if (p.positionActuelle) { <div><span class="lx-muted">Lieu</span><strong>{{ p.positionActuelle }}</strong></div> }
          </div>
        } @else {
          <p style="margin:0;font-size:.85rem">Pas encore de position partagée.</p>
        }
      </div>

      <div class="lx-card legend">
        <div><span class="sw sw-route"></span> Itinéraire prévu</div>
        <div><span class="sw sw-trail"></span> Parcours effectué</div>
        <div><span class="sw sw-start"></span> Départ · <span class="sw sw-end"></span> Arrivée</div>
        <div class="lx-muted" style="font-size:.7rem;margin-top:.35rem">Actualisation toutes les 5 s@if (derniereMaj()) { · {{ derniereMaj() }} }</div>
      </div>
    </aside>
  </div>
</div>
  `,
  styles: [`
    :host { display: block; }
    .head { margin-bottom: 1.5rem; }
    .route-title { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; font-size: clamp(1.5rem, 3vw, 2rem); margin: 0.5rem 0 0; }
    .dot-warn { width: 10px; height: 10px; border-radius: 50%; background: var(--lx-amber); }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 290px; gap: 1.25rem; align-items: start; }
    .map-panel { position: relative; border-radius: var(--lx-r-lg); overflow: hidden; border: 1px solid var(--lx-border); background: #0d0f12;
      &.is-full { position: fixed; inset: 0; z-index: 1000; border-radius: 0; border: 0; .map { height: 100vh; } } }
    .map { width: 100%; height: 520px; }
    .map-fallback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; text-align: center;
      font-size: 0.85rem; color: var(--lx-muted-fg); background: var(--lx-card); }
    .map-controls { position: absolute; top: 12px; right: 12px; z-index: 500; display: flex; flex-direction: column; gap: 6px; }
    .ctrl { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--lx-border-strong); background: rgba(17, 18, 20, 0.92); color: var(--lx-fg);
      display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(6px); transition: background 0.15s, color 0.15s;
      &:hover { background: #1a1d28; } &.is-on { background: var(--lx-primary); color: var(--lx-primary-fg); border-color: var(--lx-primary); } }
    .map-loading, .map-banner { position: absolute; z-index: 500; left: 12px; display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem;
      background: rgba(17, 18, 20, 0.92); border: 1px solid var(--lx-border-strong); border-radius: 10px; padding: 0.5rem 0.75rem; backdrop-filter: blur(6px); }
    .map-loading { top: 12px; }
    .map-banner { bottom: 12px; right: 12px; color: rgba(240, 236, 227, 0.85); lx-icon { color: var(--lx-amber); flex-shrink: 0; } }

    .side { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
    .side .lx-card { padding: 1.15rem 1.25rem; }
    .eta .lx-display { font-size: 2.6rem; color: var(--lx-primary); line-height: 1.1; }
    .eta-sub { font-size: 0.8rem; color: var(--lx-muted-fg); margin-top: 0.15rem; }
    .progress-labels { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.68rem; color: var(--lx-muted-fg); margin-top: 0.35rem;
      span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } span:nth-child(2) { color: var(--lx-primary); flex-shrink: 0; } }
    .facts { display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.85rem;
      > div { display: flex; justify-content: space-between; gap: 0.75rem; } strong { font-weight: 500; text-align: right; } }
    .legend { font-size: 0.78rem; display: flex; flex-direction: column; gap: 0.4rem; }
    .sw { display: inline-block; vertical-align: middle; margin-right: 0.35rem; }
    .sw-route { width: 22px; height: 4px; border-radius: 2px; background: var(--lx-primary); }
    .sw-trail { width: 22px; height: 4px; border-radius: 2px; background: #34d399; }
    .sw-start, .sw-end { width: 10px; height: 10px; border-radius: 50%; border: 2px solid #090a0b; }
    .sw-start { background: var(--lx-primary); } .sw-end { background: #e0534a; }

    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .map { height: 380px; }
      .map-banner { font-size: 0.72rem; }
    }
  `]
})
export class TrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private trajetSvc = inject(TrajetService);
  private geo = inject(GeoService);

  readonly espaceChauffeur = this.router.url.startsWith('/chauffeur');
  readonly retour = this.espaceChauffeur ? '/chauffeur/courses' : '/client/historique';

  trajetId = signal(0);
  trajet = signal<any>(null);
  position = signal<any>(null);
  itineraire = signal<Itineraire | null>(null);
  resteMetres = signal<number | null>(null);
  resteSecondes = signal<number | null>(null);
  derniereMaj = signal('');
  carteIndisponible = signal(false);
  chargementCarte = signal(false);
  suivre = signal(true);
  pleinEcran = signal(false);
  private maintenant = signal(Date.now());
  /** Moment (horloge du navigateur) où la position a changé pour la dernière fois :
   *  insensible au décalage d'horloge ou de fuseau entre serveur et appareil. */
  private dernierChangement = signal(Date.now());

  etat = computed<'avant' | 'direct' | 'perdu' | 'termine'>(() => {
    const statut = this.trajet()?.statut;
    if (statut === 'TERMINE' || statut === 'ANNULE') return 'termine';
    if (!this.position()) return 'avant';
    return this.maintenant() - this.dernierChangement() > SIGNAL_PERDU_MS ? 'perdu' : 'direct';
  });
  progression = computed(() => {
    const total = this.itineraire()?.distance ?? 0;
    const reste = this.resteMetres();
    if (!total || reste === null) return 0;
    return Math.max(0, Math.min(100, Math.round((1 - reste / total) * 100)));
  });
  heureArrivee = computed(() => new Date(this.maintenant() + (this.resteSecondes() ?? 0) * 1000));

  private map: any = null;
  private coucheRoute: any = null;
  private coucheTrace: any = null;
  private marqueur: any = null;
  private depart: Point | null = null;
  private arrivee: Point | null = null;
  private trace: [number, number][] = [];
  private derniereEta: { point: Point; quand: number } | null = null;
  private abonnements: Subscription[] = [];
  private mapPrete = false;
  private detruit = false;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.trajetId.set(id);

    this.trajetSvc.getById(id).subscribe({
      next: t => { this.trajet.set(t); this.preparerItineraire(); },
      error: () => this.trajet.set(null)
    });
    this.trajetSvc.getTrace(id).subscribe({
      next: points => {
        this.trace = (points ?? []).map(p => [p.latitude, p.longitude] as [number, number]);
        this.dessinerTrace();
      },
      error: () => {}
    });

    this.chargerPosition(id);
    this.abonnements.push(interval(5000).subscribe(() => {
      if (!document.hidden && this.etat() !== 'termine') this.chargerPosition(id);
    }));
    this.abonnements.push(interval(15000).subscribe(() => this.maintenant.set(Date.now())));
  }

  ngAfterViewInit() {
    setTimeout(() => this.initCarte());
  }

  ngOnDestroy() {
    this.detruit = true;
    this.abonnements.forEach(s => s.unsubscribe());
    this.map?.remove();
    this.map = null;
  }

  @HostListener('window:resize')
  surRedimension() { this.map?.invalidateSize(); }

  @HostListener('document:keydown.escape')
  surEchap() { if (this.pleinEcran()) this.basculerPleinEcran(); }

  // ─── Carte ──────────────────────────────────────────────────────────────

  private initCarte() {
    if (typeof L === 'undefined' || !this.mapContainer?.nativeElement) {
      this.carteIndisponible.set(true);
      return;
    }
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [3.848, 11.502], // Yaoundé, en attendant l'itinéraire
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
    });
    // Tuiles OpenStreetMap (sans clé d'API), assombries par un filtre CSS (.lx-tuiles-sombres).
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · itinéraire OSRM',
      maxZoom: 19,
      className: 'lx-tuiles-sombres',
    }).addTo(this.map);
    // Si l'utilisateur déplace la carte, on arrête de la recentrer automatiquement.
    this.map.on('dragstart', () => this.suivre.set(false));
    this.mapPrete = true;
    this.dessinerItineraire();
    this.dessinerTrace();
    if (this.position()) this.placerMarqueur(this.position());
    setTimeout(() => this.map?.invalidateSize(), 350);
  }

  /** Coordonnées du trajet (enregistrées ou géocodées), puis itinéraire routier. */
  private async preparerItineraire() {
    const t = this.trajet();
    if (!t) return;
    this.chargementCarte.set(true);
    const [dep, arr] = await Promise.all([
      t.latDepart != null && t.lngDepart != null ? Promise.resolve({ lat: t.latDepart, lng: t.lngDepart }) : this.geo.geocoder(t.villeDepart),
      t.latArrivee != null && t.lngArrivee != null ? Promise.resolve({ lat: t.latArrivee, lng: t.lngArrivee }) : this.geo.geocoder(t.villeArrivee),
    ]);
    if (this.detruit) return;
    this.depart = dep;
    this.arrivee = arr;
    if (dep && arr) {
      const it = await this.geo.itineraire(dep, arr);
      if (this.detruit) return;
      this.itineraire.set(it);
    }
    this.chargementCarte.set(false);
    this.dessinerItineraire();
    if (this.position()) this.mettreAJourEta(this.position());
  }

  private dessinerItineraire() {
    if (!this.mapPrete || !this.map) return;
    this.coucheRoute?.remove();
    const couches: any[] = [];
    const it = this.itineraire();
    if (it) {
      // Double tracé : halo sombre puis ligne dorée, pour la lisibilité sur fond de carte.
      couches.push(L.polyline(it.points, { color: '#000', weight: 9, opacity: 0.45, lineJoin: 'round' }));
      couches.push(L.polyline(it.points, { color: '#c8922a', weight: 5, opacity: 0.95, lineJoin: 'round', dashArray: it.approximatif ? '10 10' : null }));
    }
    if (this.depart) couches.push(this.repere(this.depart, '#c8922a', `<b>Départ</b><br>${this.echapper(this.trajet()?.villeDepart)}`));
    if (this.arrivee) couches.push(this.repere(this.arrivee, '#e0534a', `<b>Arrivée</b><br>${this.echapper(this.trajet()?.villeArrivee)}`));
    if (!couches.length) return;
    this.coucheRoute = L.featureGroup(couches).addTo(this.map);
    if (!this.position()) this.recentrer();
  }

  private dessinerTrace() {
    if (!this.mapPrete || !this.map || this.trace.length < 2) return;
    if (this.coucheTrace) this.coucheTrace.setLatLngs(this.trace);
    else this.coucheTrace = L.polyline(this.trace, { color: '#34d399', weight: 4, opacity: 0.9, lineJoin: 'round' }).addTo(this.map);
  }

  private repere(p: Point, couleur: string, popup: string) {
    return L.circleMarker([p.lat, p.lng], { radius: 8, color: '#090a0b', weight: 3, fillColor: couleur, fillOpacity: 1 }).bindPopup(popup);
  }

  private iconeVehicule(cap: number) {
    return L.divIcon({
      className: 'lx-vehicule',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      html: `<div class="lx-vehicule-halo"></div>
        <div class="lx-vehicule-corps" style="transform:rotate(${Math.round(cap)}deg)">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2 19 21 12 17 5 21z" fill="#08090e"/></svg>
        </div>`,
    });
  }

  private placerMarqueur(pos: any) {
    if (!this.mapPrete || !this.map || pos.latitude == null || pos.longitude == null) return;
    const ll: [number, number] = [pos.latitude, pos.longitude];
    const precedent = this.trace.length ? this.trace[this.trace.length - 1] : null;
    const cap = precedent && (precedent[0] !== ll[0] || precedent[1] !== ll[1])
      ? this.geo.cap({ lat: precedent[0], lng: precedent[1] }, { lat: ll[0], lng: ll[1] })
      : (this.dernierCap ?? 0);
    this.dernierCap = cap;
    if (!this.marqueur) {
      this.marqueur = L.marker(ll, { icon: this.iconeVehicule(cap), zIndexOffset: 1000, keyboard: false })
        .addTo(this.map).bindPopup(this.espaceChauffeur ? '<b>Vous</b>' : '<b>Votre chauffeur</b>');
    } else {
      this.marqueur.setLatLng(ll);
      this.marqueur.setIcon(this.iconeVehicule(cap));
    }
    if (this.suivre()) this.map.flyTo(ll, Math.max(this.map.getZoom(), 13), { animate: true, duration: 1.2 });
  }
  private dernierCap: number | null = null;

  // ─── Position & ETA ─────────────────────────────────────────────────────

  private chargerPosition(id: number) {
    this.trajetSvc.getDernierePosition(id).subscribe({
      next: (pos: any) => {
        if (!pos || pos.latitude == null) return;
        const ancienne = this.position();
        const nouvelle = !ancienne || ancienne.id !== pos.id || ancienne.latitude !== pos.latitude || ancienne.longitude !== pos.longitude;
        this.position.set(pos);
        this.maintenant.set(Date.now());
        this.derniereMaj.set(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        if (!nouvelle) return;
        this.dernierChangement.set(Date.now());
        this.placerMarqueur(pos);
        const dernier = this.trace[this.trace.length - 1];
        if (!dernier || dernier[0] !== pos.latitude || dernier[1] !== pos.longitude) {
          this.trace.push([pos.latitude, pos.longitude]);
          this.dessinerTrace();
        }
        this.mettreAJourEta(pos);
      },
      error: () => {}
    });
  }

  /** Distance restante le long de l'itinéraire, et durée via OSRM (au plus toutes les 30 s ou 300 m). */
  private async mettreAJourEta(pos: any) {
    const ici: Point = { lat: pos.latitude, lng: pos.longitude };
    const it = this.itineraire();
    if (it && it.points.length > 1) this.resteMetres.set(this.geo.distanceRestante(it.points, ici));
    else if (this.arrivee) this.resteMetres.set(this.geo.distance(ici, this.arrivee) * 1.25);
    if (!this.arrivee) return;

    const recent = this.derniereEta && Date.now() - this.derniereEta.quand < 30000 && this.geo.distance(this.derniereEta.point, ici) < 300;
    if (!recent) {
      this.derniereEta = { point: ici, quand: Date.now() };
      const reste = await this.geo.itineraire(ici, this.arrivee);
      if (this.detruit) return;
      if (!reste.approximatif) {
        this.resteSecondes.set(reste.duree);
        this.resteMetres.set(reste.distance);
        return;
      }
    }
    // Repli : vitesse actuelle si plausible, sinon vitesse moyenne sur route.
    const vitesse = pos.vitesse > 15 ? pos.vitesse : 55;
    this.resteSecondes.set(((this.resteMetres() ?? 0) / 1000) / vitesse * 3600);
  }

  // ─── Commandes ──────────────────────────────────────────────────────────

  recentrer() {
    if (!this.map) return;
    const groupe: any[] = [];
    if (this.coucheRoute) groupe.push(this.coucheRoute);
    if (this.marqueur) groupe.push(this.marqueur);
    if (!groupe.length) return;
    const limites = L.featureGroup(groupe).getBounds();
    if (limites.isValid()) this.map.fitBounds(limites, { padding: [48, 48], maxZoom: 14 });
  }

  /** Vue d'ensemble : on arrête de suivre le véhicule, sinon la prochaine position recentrerait la carte. */
  voirTout() {
    this.suivre.set(false);
    this.recentrer();
  }

  basculerSuivi() {
    this.suivre.update(v => !v);
    if (this.suivre() && this.marqueur) this.map.flyTo(this.marqueur.getLatLng(), Math.max(this.map.getZoom(), 14), { duration: 0.8 });
  }

  basculerPleinEcran() {
    this.pleinEcran.update(v => !v);
    setTimeout(() => this.map?.invalidateSize(), 50);
  }

  // ─── Affichage ──────────────────────────────────────────────────────────

  dureeTexte(secondes: number): string {
    const min = Math.max(1, Math.round(secondes / 60));
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
  }

  ilYa(): string {
    if (!this.position()) return '—';
    const s = Math.max(0, Math.round((this.maintenant() - this.dernierChangement()) / 1000));
    if (s < 60) return "à l'instant";
    const m = Math.round(s / 60);
    return m < 60 ? `il y a ${m} min` : `il y a ${Math.round(m / 60)} h`;
  }

  private echapper(v: unknown): string {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }
}
