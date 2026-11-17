import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { ToastService, fcfa } from '../../../core/services/toast.service';
import { Reservation } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ProfilsService } from '../../../core/services/profils.service';

type Filtre = 'a-venir' | 'terminees' | 'annulees' | 'toutes';
type ActionConfirm = { type: 'annuler' | 'embarquer' | 'arriver'; rez: Reservation } | null;

const LIBELLES: Record<Reservation['statut'], string> = {
  EN_ATTENTE: 'En attente du chauffeur',
  ACCEPTEE: 'Confirmée',
  REFUSEE: 'Refusée',
  ANNULEE: 'Annulée',
  TERMINEE: 'Terminée'
};

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, IconComponent],
  template: `
<div class="lx-page">
  <div class="lx-page-head">
    <div>
      <span class="lx-eyebrow">Mes trajets</span>
      <h2>Suivi de mes courses</h2>
      <p>Suivez vos réservations, confirmez votre embarquement et votre arrivée.</p>
    </div>
    <div class="lx-row">
      <button class="lx-btn lx-btn-secondary" (click)="charger(true)" [disabled]="loading()" aria-label="Actualiser">
        <lx-icon name="refresh" [class.lx-spin]="loading()" /> Actualiser
      </button>
      <a class="lx-btn lx-btn-primary" routerLink="/client/nouvelle-course"><lx-icon name="plus" /> Nouvelle course</a>
    </div>
  </div>

  <div class="kpis">
    <div class="lx-stat"><lx-icon name="calendar" style="color:var(--lx-blue)" /><div class="lx-stat-value">{{ compteurs()['a-venir'] }}</div><div class="lx-stat-label">à venir</div></div>
    <div class="lx-stat"><lx-icon name="check-circle" style="color:var(--lx-emerald)" /><div class="lx-stat-value">{{ compteurs()['terminees'] }}</div><div class="lx-stat-label">terminées</div></div>
    <div class="lx-stat"><lx-icon name="credit-card" style="color:var(--lx-primary)" /><div class="lx-stat-value">{{ totalDepense() }}</div><div class="lx-stat-label">dépensés</div></div>
  </div>

  <nav class="lx-tabs" role="tablist">
    @for (f of filtres; track f.id) {
      <button role="tab" class="lx-tab" [attr.aria-selected]="filtre() === f.id" [class.is-active]="filtre() === f.id" (click)="filtre.set(f.id)">
        {{ f.label }} <span class="lx-tab-count">{{ compteurs()[f.id] }}</span>
      </button>
    }
  </nav>

  @if (loading() && reservations().length === 0) {
    <div class="lx-stack-sm">@for (i of [1,2,3]; track i) { <div class="lx-skeleton" style="min-height:120px"></div> }</div>
  } @else if (erreur()) {
    <div class="lx-empty">
      <lx-icon name="alert" />
      <p>{{ erreur() }}</p>
      <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="charger(true)">Réessayer</button>
    </div>
  } @else if (visibles().length === 0) {
    <div class="lx-empty">
      <lx-icon name="car" />
      <p>{{ filtre() === 'a-venir' ? 'Aucune course à venir.' : 'Aucune course dans cette catégorie.' }}</p>
      <a class="lx-btn lx-btn-primary lx-btn-sm" routerLink="/client/nouvelle-course"><lx-icon name="plus" /> Réserver un trajet</a>
    </div>
  } @else {
    <div class="lx-stack-sm">
      @for (r of visibles(); track r.id) {
        <article class="lx-card rez" [class.is-highlight]="r.statut === 'ACCEPTEE'">
          <div class="rez-top">
            <div class="rez-left">
              <span class="lx-icon-tile" [class.is-gold]="r.statut === 'ACCEPTEE'"><lx-icon name="car" /></span>
              <div class="min-w-0">
                <div class="cities">
                  <span>{{ r.villeDepart || 'Départ' }}</span>
                  <lx-icon name="arrow-right" [size]="16" class="lx-gold" />
                  <span>{{ r.villeArrivee || 'Arrivée' }}</span>
                </div>
                <div class="meta driver">
                  <lx-icon name="user" [size]="13" /> {{ profils.nom(r.chauffeurId, 'Chauffeur') }}
                </div>
                <div class="meta">
                  {{ formatDate(r.dateReservation) }} · {{ r.nombrePlaces }} place{{ r.nombrePlaces > 1 ? 's' : '' }}
                  @if (r.pointArret) { · arrêt {{ r.pointArret }} }
                  · Réf. CR-{{ r.id }}
                </div>
              </div>
            </div>
            <div class="right">
              <span class="lx-badge" [ngClass]="badge(r)">{{ libelle(r) }}</span>
              <div class="price">{{ montant(r) }}</div>
            </div>
          </div>

          @if (r.statut === 'EN_ATTENTE' && r.contreOffre) {
            <div class="counter-offer">
              <div class="lx-row" style="gap:.5rem;flex-wrap:nowrap;align-items:flex-start">
                <lx-icon name="tag" [size]="16" />
                <div>
                  <strong>Contre-offre du chauffeur : {{ r.contreOffre | number:'1.0-0' }} FCFA / place</strong>
                  <div class="lx-muted" style="font-size:.78rem">
                    Votre offre : {{ r.prixParPlace | number:'1.0-0' }} F · prix affiché : {{ (r.prixCatalogue ?? r.prixParPlace) | number:'1.0-0' }} F ·
                    total {{ (r.contreOffre * r.nombrePlaces) | number:'1.0-0' }} FCFA
                  </div>
                </div>
              </div>
              <div class="lx-row" style="gap:.5rem;justify-content:flex-end">
                <button class="lx-btn lx-btn-ghost lx-btn-sm" (click)="refuserContreOffre(r)" [disabled]="busy() === r.id">Décliner</button>
                <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="accepterContreOffre(r)" [disabled]="busy() === r.id"><lx-icon name="check" /> Accepter et réserver</button>
              </div>
            </div>
          } @else if (r.statut === 'EN_ATTENTE' && r.prixCatalogue && r.prixParPlace && r.prixParPlace < r.prixCatalogue) {
            <div class="my-offer"><lx-icon name="tag" [size]="14" /> Votre offre : {{ r.prixParPlace | number:'1.0-0' }} F / place (prix affiché {{ r.prixCatalogue | number:'1.0-0' }} F) — en attente de réponse</div>
          }

          @if (r.statut !== 'ANNULEE' && r.statut !== 'REFUSEE') {
            <ol class="steps" aria-label="Progression">
              @for (s of etapes(r); track s.label) {
                <li [class.done]="s.done" [class.current]="s.current">
                  <span class="dot"></span><span class="lbl">{{ s.label }}</span>
                </li>
              }
            </ol>
          } @else if (r.motifAnnulation) {
            <p class="motif">Motif : {{ r.motifAnnulation }}</p>
          }

          <div class="actions">
            @switch (r.statut) {
              @case ('EN_ATTENTE') {
                <span class="hint">{{ r.contreOffre ? 'Répondez à la contre-offre ci-dessus, ou annulez.' : "Le chauffeur n'a pas encore répondu. Aucun montant n'est prélevé tant qu'il n'a pas accepté." }}</span>
                <button class="lx-btn lx-btn-danger lx-btn-sm" (click)="demander('annuler', r)" [disabled]="busy() === r.id">Annuler</button>
              }
              @case ('ACCEPTEE') {
                <a class="lx-btn lx-btn-secondary lx-btn-sm" [routerLink]="['/client/suivi', r.trajetId]"><lx-icon name="navigation" /> Suivre</a>
                <a class="lx-btn lx-btn-secondary lx-btn-sm" routerLink="/client/messages" [queryParams]="{ avec: r.chauffeurId }"><lx-icon name="message" /> Message</a>
                @if (!r.embarquementConfirme) {
                  <button class="lx-btn lx-btn-danger lx-btn-sm" (click)="demander('annuler', r)" [disabled]="busy() === r.id">Annuler</button>
                  <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="demander('embarquer', r)" [disabled]="busy() === r.id">Je suis monté</button>
                } @else {
                  <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="demander('arriver', r)" [disabled]="busy() === r.id">Je suis arrivé</button>
                }
              }
              @case ('TERMINEE') {
                @if (notees().has(r.id)) {
                  <span class="hint ok"><lx-icon name="check-circle" [size]="14" /> Merci pour votre avis !</span>
                } @else if (notation() === r.id) {
                  <div class="rating">
                    <div class="stars-input" role="radiogroup" aria-label="Note">
                      @for (n of [1,2,3,4,5]; track n) {
                        <button class="star" [class.on]="n <= note()" (click)="note.set(n)" [attr.aria-label]="n + ' étoiles'">
                          <lx-icon name="star" [fill]="true" [size]="22" />
                        </button>
                      }
                    </div>
                    <input class="lx-input" [(ngModel)]="commentaire" placeholder="Un commentaire (facultatif)" maxlength="500">
                    <div class="lx-row" style="gap:.5rem">
                      <button class="lx-btn lx-btn-ghost lx-btn-sm" (click)="notation.set(null)">Plus tard</button>
                      <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="envoyerAvis(r)" [disabled]="note() === 0 || busy() === r.id">Envoyer</button>
                    </div>
                  </div>
                } @else {
                  <button class="lx-btn lx-btn-secondary lx-btn-sm" (click)="ouvrirNotation(r)"><lx-icon name="star" /> Noter le chauffeur</button>
                  <a class="lx-btn lx-btn-ghost lx-btn-sm" routerLink="/client/remboursement">Un problème ? Remboursement</a>
                }
              }
              @default {
                <a class="lx-btn lx-btn-secondary lx-btn-sm" routerLink="/client/nouvelle-course"
                  [queryParams]="{ depart: r.villeDepart, arrivee: r.villeArrivee, places: r.nombrePlaces }"><lx-icon name="rotate-ccw" /> Réserver à nouveau</a>
              }
            }
          </div>
        </article>
      }
    </div>
  }

  @if (confirmation(); as c) {
    <div class="lx-overlay" (click)="confirmation.set(null)">
      <div class="lx-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <h3>{{ titreConfirmation(c) }}</h3>
        <p style="margin:0;font-size:.9rem;line-height:1.55">{{ texteConfirmation(c) }}</p>
        <div class="lx-modal-actions">
          <button class="lx-btn lx-btn-ghost" (click)="confirmation.set(null)">Retour</button>
          <button class="lx-btn" [class.lx-btn-primary]="c.type !== 'annuler'" [class.lx-btn-danger]="c.type === 'annuler'" (click)="executer(c)">Confirmer</button>
        </div>
      </div>
    </div>
  }
</div>`,
  styles: [`
    :host { display: block; }
    .min-w-0 { min-width: 0; }
    .kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }

    .rez { padding: 1.15rem 1.25rem; transition: border-color 0.2s;
      &:hover { border-color: rgba(200, 146, 42, 0.3); }
      &.is-highlight { border-color: rgba(200, 146, 42, 0.4); } }
    .rez-top { display: flex; justify-content: space-between; gap: 1rem; }
    .rez-left { display: flex; gap: 0.9rem; min-width: 0; }
    .cities { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-weight: 500; font-size: 1rem; }
    .meta { color: var(--lx-muted-fg); font-size: 0.8rem; margin-top: 0.2rem; }
    .right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }
    .price { font-family: var(--lx-font-display); font-size: 1.15rem; white-space: nowrap; }

    .steps { list-style: none; display: flex; margin: 1.15rem 0 0.25rem; padding: 0; }
    .steps li { flex: 1; position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      color: var(--lx-muted-fg); font-size: 0.72rem; text-align: center; }
    .steps li::before { content: ''; position: absolute; top: 6px; left: -50%; width: 100%; height: 2px; background: var(--lx-border-strong); }
    .steps li:first-child::before { display: none; }
    .steps li.done::before, .steps li.current::before { background: var(--lx-primary); }
    .dot { width: 14px; height: 14px; border-radius: 50%; background: var(--lx-secondary); border: 2px solid #2b2f3d; position: relative; z-index: 1; }
    .steps li.done .dot { background: var(--lx-primary); border-color: var(--lx-primary); }
    .steps li.current .dot { border-color: var(--lx-primary); box-shadow: 0 0 0 4px rgba(200, 146, 42, 0.2); }
    .steps li.done, .steps li.current { color: var(--lx-fg); }
    .driver { display: flex; align-items: center; gap: 0.3rem; color: rgba(240, 236, 227, 0.75); }
    .counter-offer { margin-top: 1rem; padding: 0.9rem 1rem; border-radius: var(--lx-r-md); display: flex; flex-direction: column; gap: 0.75rem;
      background: rgba(200, 146, 42, 0.08); border: 1px solid rgba(200, 146, 42, 0.35); font-size: 0.875rem;
      > .lx-row > lx-icon { color: var(--lx-primary); margin-top: 2px; } strong { font-weight: 600; } }
    .my-offer { margin-top: 0.85rem; display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--lx-muted-fg); lx-icon { color: var(--lx-primary); } }
    .motif { color: var(--lx-muted-fg); font-size: 0.85rem; margin: 0.75rem 0 0; }

    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: flex-end; align-items: center;
      margin-top: 1rem; padding-top: 0.9rem; border-top: 1px solid var(--lx-border); }
    .hint { color: var(--lx-muted-fg); font-size: 0.8rem; margin-right: auto; flex: 1 1 240px; display: inline-flex; align-items: center; gap: 0.35rem; }
    .hint.ok { color: var(--lx-emerald); }
    .rating { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; width: 100%;
      .lx-input { flex: 1 1 200px; padding: 0.6rem 0.9rem; } }
    .stars-input { display: flex; }
    .star { background: none; border: 0; padding: 0 0.1rem; cursor: pointer; color: #3a3d4e; transition: color 0.15s, transform 0.15s;
      &:hover { transform: scale(1.1); } &.on { color: var(--lx-amber); } }

    @media (max-width: 640px) {
      .kpis { gap: 0.6rem; }
      .rez-top { flex-direction: column; }
      .right { flex-direction: row; align-items: center; justify-content: space-between; }
      .actions { justify-content: flex-start; }
      .actions .lx-btn { flex: 1 1 auto; }
    }
  `]
})
export class HistoryComponent implements OnInit {
  private auth = inject(AuthService);
  private rezSvc = inject(ReservationService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  router = inject(Router);
  profils = inject(ProfilsService);

  loading = signal(true);
  erreur = signal('');
  reservations = signal<Reservation[]>([]);
  filtre = signal<Filtre>('a-venir');
  busy = signal<number | null>(null);
  confirmation = signal<ActionConfirm>(null);
  notation = signal<number | null>(null);
  note = signal(0);
  notees = signal<Set<number>>(new Set());
  commentaire = '';

  readonly filtres: { id: Filtre; label: string }[] = [
    { id: 'a-venir', label: 'À venir' },
    { id: 'terminees', label: 'Terminées' },
    { id: 'annulees', label: 'Annulées' },
    { id: 'toutes', label: 'Toutes' }
  ];

  private statutsConnus = new Map<number, string>();

  compteurs = computed(() => {
    const all = this.reservations();
    return {
      'a-venir': all.filter(r => this.correspond(r, 'a-venir')).length,
      'terminees': all.filter(r => this.correspond(r, 'terminees')).length,
      'annulees': all.filter(r => this.correspond(r, 'annulees')).length,
      'toutes': all.length
    } as Record<Filtre, number>;
  });

  visibles = computed(() => this.reservations().filter(r => this.correspond(r, this.filtre())));

  totalDepense = computed(() => fcfa(
    this.reservations().filter(r => r.statut === 'TERMINEE').reduce((t, r) => t + Number(r.montantTotal ?? 0), 0)
  ));

  ngOnInit() {
    this.charger(false);
    // Rafraîchissement automatique : le passager voit le chauffeur accepter sans recharger la page.
    interval(20000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!document.hidden && !this.confirmation()) this.charger(false, true);
    });
  }

  charger(manuel: boolean, silencieux = false) {
    const u = this.auth.currentUser();
    if (!u) { this.loading.set(false); return; }
    if (!silencieux) this.loading.set(true);
    this.rezSvc.getMesReservations(u.compteId).subscribe({
      next: p => {
        const list = [...(p.content ?? [])].sort((a, b) =>
          new Date(b.dateReservation).getTime() - new Date(a.dateReservation).getTime());
        if (silencieux) this.signalerChangements(list);
        list.filter(r => r.contreOffre).forEach(r => this.contreOffresConnues.add(r.id));
        list.forEach(r => this.statutsConnus.set(r.id, r.statut));
        this.profils.charger(list.map(r => r.chauffeurId));
        this.reservations.set(list);
        this.erreur.set('');
        this.loading.set(false);
        if (manuel) this.toast.info('Liste à jour');
      },
      error: err => {
        this.loading.set(false);
        if (!silencieux) this.erreur.set('Impossible de charger vos courses pour le moment.');
        if (manuel) this.toast.error('Chargement impossible', err);
      }
    });
  }

  private contreOffresConnues = new Set<number>();

  private signalerChangements(list: Reservation[]) {
    for (const r of list) {
      if (r.contreOffre && !this.contreOffresConnues.has(r.id)) {
        this.toast.info('Le chauffeur vous propose un prix', `${r.villeDepart ?? ''} → ${r.villeArrivee ?? ''} · ${fcfa(r.contreOffre)} / place`);
      }
      const avant = this.statutsConnus.get(r.id);
      if (!avant || avant === r.statut) continue;
      const trajet = `${r.villeDepart ?? ''} → ${r.villeArrivee ?? ''}`;
      if (r.statut === 'ACCEPTEE') this.toast.success('Le chauffeur a accepté votre réservation', trajet);
      else if (r.statut === 'REFUSEE') this.toast.warning('Réservation refusée par le chauffeur', trajet);
      else if (r.statut === 'ANNULEE') this.toast.warning('Réservation annulée', trajet);
    }
  }

  private correspond(r: Reservation, f: Filtre): boolean {
    switch (f) {
      case 'a-venir': return r.statut === 'EN_ATTENTE' || r.statut === 'ACCEPTEE';
      case 'terminees': return r.statut === 'TERMINEE';
      case 'annulees': return r.statut === 'ANNULEE' || r.statut === 'REFUSEE';
      default: return true;
    }
  }

  badge(r: Reservation): string {
    switch (r.statut) {
      case 'EN_ATTENTE': return 'lx-badge-warning';
      case 'ACCEPTEE': return r.embarquementConfirme ? 'lx-badge-gold' : 'lx-badge-info';
      case 'TERMINEE': return 'lx-badge-success';
      default: return 'lx-badge-danger';
    }
  }

  libelle(r: Reservation): string {
    if (r.statut === 'ACCEPTEE' && r.embarquementConfirme) return 'En route';
    return LIBELLES[r.statut] ?? r.statut;
  }

  montant(r: Reservation): string {
    const m = r.montantTotal ?? (r.prixParPlace ? r.prixParPlace * r.nombrePlaces : 0);
    return fcfa(m);
  }

  etapes(r: Reservation) {
    const accepte = r.statut === 'ACCEPTEE' || r.statut === 'TERMINEE';
    const monte = !!r.embarquementConfirme || r.statut === 'TERMINEE';
    const arrive = !!r.arriveeConfirmee || r.statut === 'TERMINEE';
    return [
      { label: 'Demandée', done: true, current: false },
      { label: 'Acceptée', done: accepte, current: !accepte },
      { label: 'À bord', done: monte, current: accepte && !monte },
      { label: 'Arrivé', done: arrive, current: monte && !arrive }
    ];
  }

  demander(type: 'annuler' | 'embarquer' | 'arriver', rez: Reservation) {
    this.confirmation.set({ type, rez });
  }

  titreConfirmation(c: NonNullable<ActionConfirm>): string {
    return { annuler: 'Annuler cette réservation ?', embarquer: 'Confirmer votre embarquement ?', arriver: 'Confirmer votre arrivée ?' }[c.type];
  }

  texteConfirmation(c: NonNullable<ActionConfirm>): string {
    const m = this.montant(c.rez);
    switch (c.type) {
      case 'annuler':
        return c.rez.statut === 'ACCEPTEE'
          ? `Le chauffeur a déjà accepté : des frais d'annulation (500 FCFA max) seront retenus, le reste de ${m} vous sera rendu.`
          : "Aucun frais : le chauffeur n'a pas encore accepté votre demande.";
      case 'embarquer':
        return `Confirmez seulement si vous êtes dans le véhicule. 50 % de ${m} seront versés au chauffeur.`;
      case 'arriver':
        return `Le solde de ${m} sera versé au chauffeur et la course sera clôturée.`;
    }
  }

  executer(c: NonNullable<ActionConfirm>) {
    const u = this.auth.currentUser();
    if (!u) return;
    this.confirmation.set(null);
    this.busy.set(c.rez.id);
    const montant = Number(c.rez.montantTotal ?? 0);
    const req$ = c.type === 'annuler' ? this.rezSvc.annuler(c.rez.id, u.compteId)
      : c.type === 'embarquer' ? this.rezSvc.confirmerEmbarquement(c.rez.id, u.compteId, montant)
      : this.rezSvc.confirmerArrivee(c.rez.id, u.compteId, montant);

    req$.subscribe({
      next: maj => {
        this.busy.set(null);
        this.reservations.update(list => list.map(r => r.id === maj.id ? { ...r, ...maj } : r));
        this.statutsConnus.set(maj.id, maj.statut);
        const msg = { annuler: 'Réservation annulée', embarquer: 'Bon voyage ! Embarquement confirmé', arriver: 'Course terminée, merci !' }[c.type];
        this.toast.success(msg);
        if (c.type === 'arriver') { this.filtre.set('terminees'); this.ouvrirNotation(maj); }
      },
      error: err => {
        this.busy.set(null);
        this.toast.error('Action impossible', err);
      }
    });
  }

  accepterContreOffre(r: Reservation) {
    const u = this.auth.currentUser();
    if (!u || this.busy()) return;
    this.busy.set(r.id);
    this.rezSvc.accepterContreOffre(r.id, u.compteId).subscribe({
      next: maj => {
        this.busy.set(null);
        this.reservations.update(list => list.map(x => x.id === r.id ? { ...x, ...maj } : x));
        this.statutsConnus.set(r.id, maj?.statut ?? 'ACCEPTEE');
        this.toast.success('Réservation confirmée', `${fcfa(maj?.montantTotal ?? (r.contreOffre ?? 0) * r.nombrePlaces)} bloqués jusqu'au trajet.`);
      },
      error: err => {
        this.busy.set(null);
        this.toast.error('Confirmation impossible', err);
        if (err?.status === 402) this.toast.warning('Solde insuffisant', 'Rechargez votre portefeuille puis réessayez.');
      }
    });
  }

  refuserContreOffre(r: Reservation) {
    const u = this.auth.currentUser();
    if (!u || this.busy()) return;
    this.busy.set(r.id);
    this.rezSvc.refuserContreOffre(r.id, u.compteId).subscribe({
      next: maj => {
        this.busy.set(null);
        this.reservations.update(list => list.map(x => x.id === r.id ? { ...x, ...maj, contreOffre: null } : x));
        this.toast.info('Contre-offre déclinée', 'Votre offre initiale reste proposée au chauffeur. Vous pouvez aussi annuler.');
      },
      error: err => { this.busy.set(null); this.toast.error('Action impossible', err); }
    });
  }

  ouvrirNotation(r: Reservation) {
    this.note.set(0);
    this.commentaire = '';
    this.notation.set(r.id);
  }

  envoyerAvis(r: Reservation) {
    const u = this.auth.currentUser();
    if (!u || this.note() === 0) return;
    this.busy.set(r.id);
    this.http.post(`${environment.apiUrl}/avis/utilisateur/${u.compteId}`, {
      cibleId: r.chauffeurId, trajetId: r.trajetId, note: this.note(), commentaire: this.commentaire || null
    }).subscribe({
      next: () => {
        this.busy.set(null);
        this.notation.set(null);
        this.notees.update(s => new Set(s).add(r.id));
        this.toast.success('Merci pour votre avis !');
      },
      error: err => { this.busy.set(null); this.toast.error("Impossible d'envoyer l'avis", err); }
    });
  }

  formatDate(date: string | Date): string {
    if (!date) return '—';
    const d = new Date(date);
    const today = new Date();
    const hier = new Date(); hier.setDate(today.getDate() - 1);
    const meme = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (meme(d, today)) return `Aujourd'hui, ${heure}`;
    if (meme(d, hier)) return `Hier, ${heure}`;
    const j = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
    return `${j.charAt(0).toUpperCase() + j.slice(1)}, ${heure}`;
  }
}
