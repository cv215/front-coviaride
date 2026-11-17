import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Utilisateur } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
<div class="lx-page-wide">
  <div class="lx-page-head">
    <div>
      <span class="lx-eyebrow">Notre flotte</span>
      <h2>Chauffeurs disponibles</h2>
      <p>Chaque chauffeur est vérifié et noté par ses passagers.</p>
    </div>
    <a routerLink="/client/nouvelle-course" class="lx-btn lx-btn-primary"><lx-icon name="search" /> Chercher un trajet</a>
  </div>

  @if (loading()) {
    <div class="grid">
      @for (_ of [1,2,3]; track $index) { <div class="lx-skeleton" style="min-height:280px"></div> }
    </div>
  } @else if (erreur()) {
    <div class="lx-empty"><lx-icon name="alert" /><p>Impossible de charger les chauffeurs.</p>
      <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="charger()">Réessayer</button></div>
  } @else if (chauffeurs().length === 0) {
    <div class="lx-empty"><lx-icon name="users" /><p>Aucun chauffeur disponible pour le moment.</p></div>
  } @else {
    <div class="grid">
      @for (d of chauffeurs(); track d.id) {
        <article class="driver">
          <button class="cover" (click)="selectedDriver.set(d)" [attr.aria-label]="'Voir le profil de ' + d.prenom + ' ' + d.nom">
            @if (d.photo) {
              <img [src]="d.photo" [alt]="d.prenom + ' ' + d.nom" loading="lazy" />
            } @else {
              <span class="cover-initials lx-display">{{ initiales(d) }}</span>
            }
            <span class="cover-shade"></span>
            @if ((d.noteMoyenne || 0) >= 4.8) { <span class="badge-top">Top chauffeur</span> }
            @if (d.vehicules?.length) {
              <span class="car-tag">{{ d.vehicules![0].marque }} {{ d.vehicules![0].modele }}</span>
            }
          </button>
          <div class="body">
            <div class="who">
              <span class="lx-avatar is-ring">{{ initiales(d) }}</span>
              <div class="min-w-0">
                <div class="name lx-truncate">{{ d.prenom }} {{ d.nom }}</div>
                <div class="rating">
                  <lx-icon name="star" [fill]="true" [size]="14" />
                  <span>{{ (d.noteMoyenne || 0) | number:'1.1-1' }}</span>
                  <span class="lx-muted">({{ d.nombreAvis || 0 }} avis)</span>
                </div>
              </div>
            </div>
            <div class="foot">
              <span class="lx-muted" style="font-size:.8rem">
                @if (d.vehicules?.length) { {{ d.vehicules![0].nombrePlaces }} places · {{ d.vehicules![0].couleur }} } @else { Véhicule non renseigné }
              </span>
              <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="selectedDriver.set(d)">Voir <lx-icon name="arrow-right" /></button>
            </div>
          </div>
        </article>
      }
    </div>
  }

  @if (selectedDriver(); as d) {
    <div class="lx-overlay" (click)="selectedDriver.set(null)">
      <div class="lx-modal" role="dialog" aria-modal="true" [attr.aria-label]="'Profil de ' + d.prenom" (click)="$event.stopPropagation()">
        <div class="lx-row" style="justify-content:space-between;margin-bottom:1rem">
          <span class="lx-eyebrow" style="margin:0">Profil chauffeur</span>
          <button class="lx-btn lx-btn-ghost lx-btn-sm" (click)="selectedDriver.set(null)" aria-label="Fermer"><lx-icon name="x" /></button>
        </div>
        <div style="text-align:center">
          <span class="lx-avatar is-xl is-ring" style="margin:0 auto .9rem">{{ initiales(d) }}</span>
          <h3>{{ d.prenom }} {{ d.nom }}</h3>
          <div class="rating" style="justify-content:center">
            <lx-icon name="star" [fill]="true" [size]="16" />
            <span>{{ (d.noteMoyenne || 0) | number:'1.1-1' }}</span>
            <span class="lx-muted">· {{ d.nombreAvis || 0 }} avis</span>
          </div>
        </div>
        @if (d.vehicules?.length) {
          <div class="vehicle">
            <span class="lx-icon-tile is-soft"><lx-icon name="car" /></span>
            <div>
              <div style="font-weight:500">{{ d.vehicules![0].marque }} {{ d.vehicules![0].modele }}</div>
              <div class="lx-muted" style="font-size:.8rem">{{ d.vehicules![0].couleur }} · {{ d.vehicules![0].nombrePlaces }} places</div>
            </div>
          </div>
        }
        <a routerLink="/client/nouvelle-course" class="lx-btn lx-btn-primary lx-btn-block" style="margin-top:1.25rem" (click)="selectedDriver.set(null)">
          Trouver un trajet <lx-icon name="arrow-right" />
        </a>
      </div>
    </div>
  }
</div>
  `,
  styles: [`
    :host { display: block; }
    .min-w-0 { min-width: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.25rem; }
    .driver { background: var(--lx-card); border: 1px solid var(--lx-border); border-radius: var(--lx-r-lg); overflow: hidden;
      transition: border-color 0.3s; &:hover { border-color: rgba(200, 146, 42, 0.3); img { transform: scale(1.05); } } }
    .cover { position: relative; display: block; width: 100%; aspect-ratio: 16 / 9; border: 0; padding: 0; cursor: pointer;
      background: linear-gradient(135deg, #1a1d28, #111214); overflow: hidden;
      img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; } }
    .cover-initials { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: rgba(200, 146, 42, 0.5); }
    .cover-shade { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.6), transparent 60%); }
    .badge-top { position: absolute; top: 0.85rem; left: 0.85rem; background: var(--lx-primary); color: var(--lx-primary-fg);
      font-size: 0.72rem; font-weight: 500; padding: 0.25rem 0.7rem; border-radius: 999px; }
    .car-tag { position: absolute; right: 0.85rem; bottom: 0.85rem; background: rgba(0,0,0,.45); backdrop-filter: blur(4px);
      color: #fff; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 8px; }
    .body { padding: 1.1rem 1.25rem 1.25rem; }
    .who { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
    .name { font-weight: 500; }
    .rating { display: flex; align-items: center; gap: 0.35rem; color: var(--lx-amber); font-size: 0.85rem; font-weight: 500; margin-top: 0.1rem;
      .lx-muted { font-weight: 400; font-size: 0.75rem; } }
    .foot { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
    .vehicle { display: flex; align-items: center; gap: 0.8rem; margin-top: 1.25rem; padding: 0.85rem 1rem; background: var(--lx-secondary); border-radius: var(--lx-r-md); }
  `]
})
export class DriversComponent implements OnInit {
  loading = signal(true);
  erreur = signal(false);
  chauffeurs = signal<Utilisateur[]>([]);
  selectedDriver = signal<Utilisateur | null>(null);

  constructor(private userSvc: UtilisateurService) {}

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.loading.set(true);
    this.erreur.set(false);
    this.userSvc.getChauffeursDisponibles(0).subscribe({
      next: (p: any) => {
        this.chauffeurs.set(p?.content ?? (Array.isArray(p) ? p : []));
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.erreur.set(true); }
    });
  }

  initiales(d: Utilisateur): string {
    return (((d.prenom || '').charAt(0)) + ((d.nom || '').charAt(0))).toUpperCase() || '?';
  }

  @HostListener('document:keydown.escape')
  fermer() { this.selectedDriver.set(null); }
}
