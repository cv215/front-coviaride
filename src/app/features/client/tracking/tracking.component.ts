import {
  Component, OnInit, OnDestroy,
  signal, ElementRef, ViewChild,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TrajetService } from '../../../core/services/trajet.service';
import { interval, Subscription } from 'rxjs';

declare const L: any;

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<div>
  <a routerLink="/client/dashboard"
    style="color:var(--color-muted);text-decoration:none;
    font-size:0.9rem;display:block;margin-bottom:1rem">
    ← Retour
  </a>
  <h2 style="margin-bottom:0.25rem">Suivi en direct</h2>
  <p style="margin-bottom:1.5rem;color:var(--color-muted)">
    Trajet #{{ trajetId() }}
  </p>

  <div style="display:grid;grid-template-columns:1fr 280px;
    gap:1.5rem;align-items:start">

    <!-- CARTE LEAFLET -->
    <div style="border-radius:var(--radius-lg);
      overflow:hidden;border:1px solid var(--color-border);
      box-shadow:var(--shadow-md)">
      <div #mapContainer id="map"
        style="width:100%;height:450px">
      </div>
    </div>

    <!-- PANNEAU DROITE -->
    <div style="display:flex;flex-direction:column;gap:1rem">

      <!-- STATUT COURSE -->
      <div class="card">
        <div style="display:flex;align-items:center;
          gap:0.5rem;margin-bottom:1rem">
          <span class="dot dot-green dot-pulse"></span>
          <strong>Course en cours</strong>
        </div>
        <div style="font-size:0.78rem;color:var(--color-muted);
          margin-bottom:0.25rem">Arrivée estimée</div>
        <div style="font-size:2rem;font-weight:800">
          {{ tempsEstime() }} min
        </div>
      </div>

      <!-- POSITION -->
      @if (position()) {
        <div class="card">
          <div style="font-size:0.75rem;font-weight:700;
            text-transform:uppercase;letter-spacing:0.05em;
            color:var(--color-muted);margin-bottom:0.75rem">
            Position GPS
          </div>
          <div style="font-size:0.85rem;
            display:flex;flex-direction:column;gap:0.35rem">
            <div>
              <span style="color:var(--color-muted)">Lat : </span>
              <strong>
                {{ position()!.latitude | number:'1.4-4' }}
              </strong>
            </div>
            <div>
              <span style="color:var(--color-muted)">Lng : </span>
              <strong>
                {{ position()!.longitude | number:'1.4-4' }}
              </strong>
            </div>
            @if (position()!.vitesse > 0) {
              <div>
                <span style="color:var(--color-muted)">
                  Vitesse :
                </span>
                <strong>
                  {{ position()!.vitesse | number:'1.0-0' }} km/h
                </strong>
              </div>
            }
          </div>
        </div>
      }

      <!-- INFOS MISE À JOUR -->
      <div class="card"
        style="background:var(--color-bg)">
        <div style="font-size:0.75rem;font-weight:700;
          text-transform:uppercase;letter-spacing:0.05em;
          color:var(--color-muted);margin-bottom:0.5rem">
          MISE À JOUR
        </div>
        <div style="font-size:0.82rem;
          color:var(--color-muted);margin-bottom:0.5rem">
          Actualisation toutes les 5 secondes
        </div>
        <div style="display:flex;align-items:center;gap:0.4rem">
          <span class="dot dot-green dot-pulse"></span>
          <span style="font-size:0.8rem;
            color:var(--color-success)">
            En direct
          </span>
        </div>
        @if (derniereMaj()) {
          <div style="font-size:0.72rem;
            color:var(--color-muted);margin-top:0.4rem">
            {{ derniereMaj() }}
          </div>
        }
      </div>

    </div>
  </div>
</div>
  `
})
export class TrackingComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  trajetId    = signal(0);
  position    = signal<any>(null);
  tempsEstime = signal(12);
  derniereMaj = signal('');

  // Coordonnées Yaoundé par défaut
  private readonly DEFAULT_LAT = 3.8480;
  private readonly DEFAULT_LNG = 11.5021;

  private map: any    = null;
  private marker: any = null;
  private pollSub?: Subscription;
  private mapReady   = false;

  constructor(
    private route: ActivatedRoute,
    private trajetSvc: TrajetService
  ) {}

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.trajetId.set(id);

    // Premier fetch immédiat
    this.fetchPosition(id);

    // Polling toutes les 5 secondes
    this.pollSub = interval(5000).subscribe(() => {
      this.fetchPosition(id);
    });
  }

  ngAfterViewInit() {
    // Attendre que le DOM soit prêt
    setTimeout(() => this.initMap(), 300);
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  // ── Initialiser la carte Leaflet ────────────────────────────
  private initMap() {
    if (typeof L === 'undefined') {
      console.error('[MAP] Leaflet non chargé');
      return;
    }

    if (!this.mapContainer?.nativeElement) return;

    // Créer la carte centrée sur Yaoundé
    this.map = L.map(this.mapContainer.nativeElement, {
      center:  [this.DEFAULT_LAT, this.DEFAULT_LNG],
      zoom:    14,
      zoomControl: true
    });

    // Tuiles OpenStreetMap (gratuit)
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }
    ).addTo(this.map);

    // Icône personnalisée chauffeur
    const icone = L.divIcon({
      html: `
        <div style="
          width:42px;height:42px;
          background:#0D0D0D;
          border:3px solid white;
          border-radius:50%;
          display:flex;align-items:center;
          justify-content:center;
          font-size:20px;
          box-shadow:0 2px 8px rgba(0,0,0,0.4)">
        </div>
      `,
      className: '',
      iconSize:   [42, 42],
      iconAnchor: [21, 21]
    });

    // Placer le marker initial
    this.marker = L.marker(
      [this.DEFAULT_LAT, this.DEFAULT_LNG],
      { icon: icone }
    ).addTo(this.map);

    this.marker.bindPopup(
      '<b>Votre chauffeur</b><br>En route...'
    ).openPopup();

    this.mapReady = true;

    // Si position déjà récupérée, mettre à jour
    if (this.position()) {
      this.updateMarker(this.position());
    }
  }

  // ── Récupérer la position du chauffeur ──────────────────────
  private fetchPosition(id: number) {
    this.trajetSvc.getDernierePosition(id).subscribe({
      next: (pos: any) => {
        if (!pos) return;
        this.position.set(pos);
        this.derniereMaj.set(
          new Date().toLocaleTimeString('fr', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        );
        if (this.mapReady) {
          this.updateMarker(pos);
        }
      },
      error: () => {}
    });
  }

  // ── Mettre à jour le marker sur la carte ────────────────────
  private updateMarker(pos: any) {
    if (!this.marker || !this.map) return;
    if (!pos.latitude || !pos.longitude) return;

    const latLng = [pos.latitude, pos.longitude];
    this.marker.setLatLng(latLng);
    this.map.flyTo(latLng, 15, {
      animate: true,
      duration: 1.5
    });
  }
}