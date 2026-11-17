import {
  Component, OnInit, OnDestroy, signal, ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { TrajetService } from '../../../core/services/trajet.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

declare const L: any;

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
<div class="lx-page-wide">
  <a routerLink="/client/historique" class="lx-back"><lx-icon name="arrow-left" /> Mes courses</a>

  <div class="head">
    <div class="lx-row" style="gap:.6rem">
      <span class="lx-ping is-green"></span>
      <span class="lx-eyebrow" style="margin:0">En direct</span>
    </div>
    <h2 class="lx-display route-title">
      @if (trajet()) {
        {{ trajet().villeDepart }} <lx-icon name="arrow-right" class="lx-gold" [size]="20" /> {{ trajet().villeArrivee }}
      } @else {
        Trajet #{{ trajetId() }}
      }
    </h2>
    @if (trajet()) {
      <p class="lx-muted" style="margin:.25rem 0 0;font-size:.85rem">
        Départ le {{ trajet().dateDepart | date:'EEEE d MMMM' }} à {{ trajet().heureDepart | slice:0:5 }}
      </p>
    }
  </div>

  <div class="layout">
    <div class="map-panel">
      <div #mapContainer class="map"></div>
      @if (carteIndisponible()) {
        <div class="map-fallback"><lx-icon name="map-pin" /> Carte indisponible (connexion à OpenStreetMap impossible).</div>
      }
    </div>

    <aside class="side">
      <div class="lx-card">
        <div class="lx-muted" style="font-size:.75rem;margin-bottom:.25rem">Arrivée estimée du chauffeur</div>
        <div class="eta"><span class="lx-display">{{ tempsEstime() }}</span> min</div>
        @if (position()?.vitesse > 0) {
          <div class="lx-row" style="gap:.4rem;margin-top:.6rem;font-size:.8rem;color:var(--lx-muted-fg)">
            <lx-icon name="gauge" [size]="14" /> {{ position()!.vitesse | number:'1.0-0' }} km/h
          </div>
        }
      </div>

      <div class="lx-card">
        <div class="lx-label">Position GPS</div>
        @if (position()) {
          <div class="coords lx-mono">
            <div><span class="lx-muted">Lat</span> {{ position()!.latitude | number:'1.4-4' }}</div>
            <div><span class="lx-muted">Lng</span> {{ position()!.longitude | number:'1.4-4' }}</div>
          </div>
        } @else {
          <p style="margin:0;font-size:.85rem">En attente de la position du chauffeur…</p>
        }
      </div>

      <div class="lx-card">
        <div class="lx-row" style="gap:.5rem;font-size:.85rem;color:var(--lx-emerald)">
          <span class="lx-ping is-green" style="width:8px;height:8px"></span> Actualisation toutes les 5 s
        </div>
        @if (derniereMaj()) {
          <div class="lx-muted" style="font-size:.75rem;margin-top:.4rem">Dernière mise à jour : {{ derniereMaj() }}</div>
        }
      </div>
    </aside>
  </div>
</div>
  `,
  styles: [`
    :host { display: block; }
    .head { margin-bottom: 1.5rem; }
    .route-title { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; font-size: clamp(1.5rem, 3vw, 2rem); margin: 0.5rem 0 0; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 1.25rem; align-items: start; }
    .map-panel { position: relative; border-radius: var(--lx-r-lg); overflow: hidden; border: 1px solid var(--lx-border); background: var(--lx-card); }
    .map { width: 100%; height: 480px; }
    .map-fallback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      font-size: 0.85rem; color: var(--lx-muted-fg); background: var(--lx-card); }
    .side { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
    .side .lx-card { padding: 1.15rem 1.25rem; }
    .eta { font-size: 0.9rem; color: var(--lx-muted-fg); .lx-display { font-size: 2.5rem; color: var(--lx-primary); margin-right: 0.25rem; } }
    .coords { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; .lx-muted { display: inline-block; width: 2.5rem; } }
    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; }
      .map { height: 340px; }
    }
  `]
})
export class TrackingComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  trajetId    = signal(0);
  position    = signal<any>(null);
  trajet      = signal<any>(null);
  tempsEstime = signal(12);
  derniereMaj = signal('');
  carteIndisponible = signal(false);

  // Coordonnées Yaoundé par défaut
  private readonly DEFAULT_LAT = 3.8480;
  private readonly DEFAULT_LNG = 11.5021;

  private map: any    = null;
  private marker: any = null;
  private routeLayer: any = null;
  private pollSub?: Subscription;
  private mapReady   = false;
  private initTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private route: ActivatedRoute,
    private trajetSvc: TrajetService
  ) {}

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.trajetId.set(id);

    this.trajetSvc.getById(id).subscribe({
      next: (journey: any) => {
        this.trajet.set(journey);
        // La carte a pu être créée avant l'arrivée du trajet : on trace l'itinéraire maintenant.
        if (this.mapReady) this.dessinerItineraire();
      },
      error: () => this.trajet.set(null)
    });

    this.fetchPosition(id);
    this.pollSub = interval(5000).subscribe(() => {
      if (!document.hidden) this.fetchPosition(id);
    });
  }

  ngAfterViewInit() {
    this.initTimer = setTimeout(() => this.initMap(), 50);
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    clearTimeout(this.initTimer);
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap() {
    if (typeof L === 'undefined' || !this.mapContainer?.nativeElement) {
      this.carteIndisponible.set(true);
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [this.DEFAULT_LAT, this.DEFAULT_LNG],
      zoom: 14,
      zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap · © CARTO',
      maxZoom: 19
    }).addTo(this.map);

    const icone = L.divIcon({
      html: `<div style="width:38px;height:38px;background:#c8922a;border:3px solid #090a0b;border-radius:50%;
        box-shadow:0 0 0 4px rgba(200,146,42,.35),0 4px 12px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#08090e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H8.3a2 2 0 0 0-1.6.8L4 10l-2.5 1.1C.7 11.3 0 12.1 0 13v3c0 .6.4 1 1 1h2"/>
        <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg></div>`,
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    this.marker = L.marker([this.DEFAULT_LAT, this.DEFAULT_LNG], { icon: icone }).addTo(this.map);
    this.marker.bindPopup('<b>Votre chauffeur</b><br>En route…');

    this.mapReady = true;
    this.dessinerItineraire();
    if (this.position()) this.updateMarker(this.position());
    // Le conteneur peut avoir changé de taille pendant l'animation d'entrée de la page.
    setTimeout(() => this.map?.invalidateSize(), 300);
  }

  private dessinerItineraire() {
    const t = this.trajet();
    if (!this.map || !t || t.latDepart == null || t.latArrivee == null) return;
    this.routeLayer?.remove();
    const start = [t.latDepart, t.lngDepart];
    const end = [t.latArrivee, t.lngArrivee];
    this.routeLayer = L.layerGroup([
      L.polyline([start, end], { color: '#c8922a', weight: 4, opacity: 0.85, dashArray: '10 8' }),
      L.circleMarker(start, { radius: 7, color: '#c8922a', fillColor: '#c8922a', fillOpacity: 1 }).bindPopup('<b>Départ</b>'),
      L.circleMarker(end, { radius: 7, color: '#e0534a', fillColor: '#e0534a', fillOpacity: 1 }).bindPopup('<b>Destination</b>')
    ]).addTo(this.map);
    if (!this.position()) this.map.fitBounds([start, end], { padding: [40, 40] });
  }

  private fetchPosition(id: number) {
    this.trajetSvc.getDernierePosition(id).subscribe({
      next: (pos: any) => {
        if (!pos) return;
        this.position.set(pos);
        this.derniereMaj.set(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        if (this.mapReady) this.updateMarker(pos);
      },
      error: () => {}
    });
  }

  private updateMarker(pos: any) {
    if (!this.marker || !this.map) return;
    if (pos.latitude == null || pos.longitude == null) return;
    const latLng = [pos.latitude, pos.longitude];
    this.marker.setLatLng(latLng);
    this.map.flyTo(latLng, 15, { animate: true, duration: 1.5 });
  }
}
