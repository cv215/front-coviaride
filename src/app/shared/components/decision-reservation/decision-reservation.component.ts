import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { ToastService, fcfa } from '../../../core/services/toast.service';
import { Reservation } from '../../../core/models';
import { IconComponent } from '../icon/icon.component';

/**
 * Décision du chauffeur sur une demande de réservation :
 * accepter au prix proposé par le passager, proposer une contre-offre, ou refuser.
 */
@Component({
  selector: 'lx-decision-reservation',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
@if (estOffre()) {
  <div class="offer">
    <lx-icon name="tag" [size]="15" />
    <span>
      Offre du passager : <strong>{{ rez().prixParPlace | number:'1.0-0' }} F</strong> / place
      <span class="lx-muted">· prix affiché {{ rez().prixCatalogue | number:'1.0-0' }} F</span>
    </span>
  </div>
}
@if (rez().contreOffre) {
  <div class="offer is-sent">
    <lx-icon name="clock" [size]="15" />
    <span>Contre-offre envoyée : <strong>{{ rez().contreOffre | number:'1.0-0' }} F</strong> / place — en attente du passager</span>
  </div>
}

@if (saisie()) {
  <form class="counter" (ngSubmit)="envoyerContreOffre()">
    <label class="lx-label" [attr.for]="'co-' + rez().id">Votre prix par place (FCFA)</label>
    <div class="counter-row">
      <input class="lx-input lx-mono" type="number" [id]="'co-' + rez().id" name="prix" [(ngModel)]="prix"
        [min]="minimum()" [max]="maximum()" required />
      <button type="submit" class="lx-btn lx-btn-primary lx-btn-sm" [disabled]="occupe() || !prixValide()">Envoyer</button>
      <button type="button" class="lx-btn lx-btn-ghost lx-btn-sm" (click)="saisie.set(false)">Annuler</button>
    </div>
    <div class="lx-help">Entre {{ minimum() | number:'1.0-0' }} et {{ maximum() | number:'1.0-0' }} FCFA.</div>
  </form>
}

<div class="actions">
  <button class="lx-btn lx-btn-danger lx-btn-sm" (click)="refuser()" [disabled]="occupe()"><lx-icon name="x" /> Refuser</button>
  @if (estOffre() && !rez().contreOffre && !saisie()) {
    <button class="lx-btn lx-btn-secondary lx-btn-sm" (click)="ouvrirSaisie()" [disabled]="occupe()"><lx-icon name="tag" /> Contre-offre</button>
  }
  <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="accepter()" [disabled]="occupe()">
    <lx-icon name="check" /> Accepter{{ estOffre() ? ' à ' + (rez().prixParPlace | number:'1.0-0') + ' F' : '' }}
  </button>
</div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 0.75rem; }
    .offer { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; padding: 0.55rem 0.75rem; border-radius: var(--lx-r-md);
      background: rgba(200, 146, 42, 0.08); color: var(--lx-fg); border: 1px solid rgba(200, 146, 42, 0.2);
      lx-icon { color: var(--lx-primary); flex-shrink: 0; } strong { color: var(--lx-primary); font-weight: 600; }
      &.is-sent { background: rgba(96, 165, 250, 0.08); border-color: rgba(96, 165, 250, 0.25); lx-icon, strong { color: var(--lx-blue); } } }
    .counter { display: flex; flex-direction: column; }
    .counter-row { display: flex; gap: 0.5rem; .lx-input { flex: 1; padding: 0.55rem 0.8rem; } }
    .actions { display: flex; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap; padding-top: 0.75rem; border-top: 1px solid var(--lx-border); }
    @media (max-width: 520px) { .actions .lx-btn { flex: 1 1 auto; } }
  `]
})
export class DecisionReservationComponent {
  private auth = inject(AuthService);
  private rezSvc = inject(ReservationService);
  private toast = inject(ToastService);

  rez = input.required<Reservation>();
  /** Émis avec la réservation mise à jour (null si elle a été refusée). */
  traitee = output<{ avant: Reservation; apres: Reservation | null }>();

  occupe = signal(false);
  saisie = signal(false);
  prix: number | null = null;

  estOffre = computed(() => {
    const r = this.rez();
    return !!r.prixCatalogue && !!r.prixParPlace && r.prixParPlace < r.prixCatalogue;
  });
  minimum = computed(() => (this.rez().prixParPlace ?? 0) + 50);
  maximum = computed(() => this.rez().prixCatalogue ?? this.rez().prixParPlace ?? 0);

  prixValide(): boolean {
    const p = Number(this.prix);
    return Number.isFinite(p) && p > (this.rez().prixParPlace ?? 0) && p <= this.maximum();
  }

  ouvrirSaisie() {
    const r = this.rez();
    // Proposition par défaut : à mi-chemin entre l'offre et le prix affiché, arrondie à 50 F.
    this.prix = Math.round((((r.prixParPlace ?? 0) + (r.prixCatalogue ?? 0)) / 2) / 50) * 50;
    this.saisie.set(true);
  }

  accepter() {
    const u = this.auth.currentUser();
    const r = this.rez();
    if (!u || this.occupe()) return;
    this.occupe.set(true);
    this.rezSvc.accepter(r.id, u.compteId, Number(r.prixParPlace ?? 0)).subscribe({
      next: maj => {
        this.occupe.set(false);
        this.toast.success('Réservation acceptée', `${maj?.nombrePlaces ?? r.nombrePlaces} place(s) · ${fcfa(maj?.montantTotal ?? r.montantTotal)} bloqués sur le compte du passager.`);
        this.traitee.emit({ avant: r, apres: { ...r, ...maj } });
      },
      error: err => { this.occupe.set(false); this.toast.error("Impossible d'accepter", err); }
    });
  }

  refuser() {
    const u = this.auth.currentUser();
    const r = this.rez();
    if (!u || this.occupe()) return;
    this.occupe.set(true);
    this.rezSvc.refuser(r.id, u.compteId).subscribe({
      next: () => {
        this.occupe.set(false);
        this.toast.info('Réservation refusée', 'Le passager a été prévenu.');
        this.traitee.emit({ avant: r, apres: null });
      },
      error: err => { this.occupe.set(false); this.toast.error('Impossible de refuser', err); }
    });
  }

  envoyerContreOffre() {
    const u = this.auth.currentUser();
    const r = this.rez();
    if (!u || this.occupe() || !this.prixValide()) return;
    this.occupe.set(true);
    this.rezSvc.contreOffre(r.id, u.compteId, Number(this.prix)).subscribe({
      next: maj => {
        this.occupe.set(false);
        this.saisie.set(false);
        this.toast.success('Contre-offre envoyée', `${fcfa(Number(this.prix))} par place — le passager doit l'accepter.`);
        this.traitee.emit({ avant: r, apres: { ...r, ...maj } });
      },
      error: err => { this.occupe.set(false); this.toast.error('Contre-offre impossible', err); }
    });
  }
}
