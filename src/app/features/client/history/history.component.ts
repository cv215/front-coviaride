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
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
<div class="page">
  <header class="head">
    <div>
      <h2>Mes courses</h2>
      <p class="sub">Suivez vos réservations, confirmez votre embarquement et votre arrivée.</p>
    </div>
    <div class="head-actions">
      <button class="btn-ghost" (click)="charger(true)" [disabled]="loading()" aria-label="Actualiser">
        <span [class.spin]="loading()">⟳</span> Actualiser
      </button>
      <a class="btn-gold" routerLink="/client/nouvelle-course">+ Nouvelle course</a>
    </div>
  </header>

  <div class="kpis">
    <div class="kpi"><span class="kpi-v">{{ compteurs()['a-venir'] }}</span><span class="kpi-l">à venir</span></div>
    <div class="kpi"><span class="kpi-v">{{ compteurs()['terminees'] }}</span><span class="kpi-l">terminées</span></div>
    <div class="kpi"><span class="kpi-v">{{ totalDepense() }}</span><span class="kpi-l">dépensés</span></div>
  </div>

  <nav class="tabs" role="tablist">
    @for (f of filtres; track f.id) {
      <button role="tab" [attr.aria-selected]="filtre() === f.id" [class.active]="filtre() === f.id" (click)="filtre.set(f.id)">
        {{ f.label }} <span class="count">{{ compteurs()[f.id] }}</span>
      </button>
    }
  </nav>

  @if (loading() && reservations().length === 0) {
    @for (i of [1,2,3]; track i) { <div class="card skeleton"></div> }
  } @else if (erreur()) {
    <div class="card empty">
      <p>{{ erreur() }}</p>
      <button class="btn-gold" (click)="charger(true)">Réessayer</button>
    </div>
  } @else if (visibles().length === 0) {
    <div class="card empty">
      <div class="empty-ico">🚗</div>
      <p>{{ filtre() === 'a-venir' ? 'Aucune course à venir.' : 'Aucune course dans cette catégorie.' }}</p>
      <a class="btn-gold" routerLink="/client/nouvelle-course">Réserver un trajet</a>
    </div>
  } @else {
    <div class="list">
      @for (r of visibles(); track r.id) {
        <article class="card rez" [class.highlight]="r.statut === 'ACCEPTEE'">
          <div class="rez-top">
            <div class="route">
              <div class="cities">
                <span>{{ r.villeDepart || 'Départ' }}</span>
                <span class="arrow">→</span>
                <span>{{ r.villeArrivee || 'Arrivée' }}</span>
              </div>
              <div class="meta">
                {{ formatDate(r.dateReservation) }} · {{ r.nombrePlaces }} place{{ r.nombrePlaces > 1 ? 's' : '' }}
                @if (r.pointArret) { · arrêt {{ r.pointArret }} }
                · Réf. CR-{{ r.id }}
              </div>
            </div>
            <div class="right">
              <span class="badge" [class]="'badge b-' + r.statut">{{ libelle(r) }}</span>
              <div class="price">{{ montant(r) }}</div>
            </div>
          </div>

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
                <span class="hint">Le chauffeur n'a pas encore répondu. Aucun montant n'est prélevé tant qu'il n'a pas accepté.</span>
                <button class="btn-ghost danger" (click)="demander('annuler', r)" [disabled]="busy() === r.id">Annuler</button>
              }
              @case ('ACCEPTEE') {
                <a class="btn-ghost" [routerLink]="['/client/suivi', r.trajetId]">📍 Suivre</a>
                <a class="btn-ghost" routerLink="/client/messages" [queryParams]="{ avec: r.chauffeurId }">💬 Message</a>
                @if (!r.embarquementConfirme) {
                  <button class="btn-ghost danger" (click)="demander('annuler', r)" [disabled]="busy() === r.id">Annuler</button>
                  <button class="btn-gold" (click)="demander('embarquer', r)" [disabled]="busy() === r.id">Je suis monté</button>
                } @else {
                  <button class="btn-gold" (click)="demander('arriver', r)" [disabled]="busy() === r.id">Je suis arrivé</button>
                }
              }
              @case ('TERMINEE') {
                @if (notees().has(r.id)) {
                  <span class="hint ok">Merci pour votre avis !</span>
                } @else if (notation() === r.id) {
                  <div class="rating">
                    @for (n of [1,2,3,4,5]; track n) {
                      <button class="star" [class.on]="n <= note()" (click)="note.set(n)" [attr.aria-label]="n + ' étoiles'">★</button>
                    }
                    <input class="input" [(ngModel)]="commentaire" placeholder="Un commentaire (facultatif)" maxlength="500">
                    <button class="btn-gold" (click)="envoyerAvis(r)" [disabled]="note() === 0 || busy() === r.id">Envoyer</button>
                    <button class="btn-ghost" (click)="notation.set(null)">Plus tard</button>
                  </div>
                } @else {
                  <button class="btn-ghost" (click)="ouvrirNotation(r)">★ Noter le chauffeur</button>
                  <button class="btn-ghost" (click)="router.navigate(['/client/remboursement'])">Un problème ? Remboursement</button>
                }
              }
              @default {
                <a class="btn-ghost" routerLink="/client/nouvelle-course">Réserver à nouveau</a>
              }
            }
          </div>
        </article>
      }
    </div>
  }

  @if (confirmation(); as c) {
    <div class="overlay" (click)="confirmation.set(null)">
      <div class="modal card" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <h3>{{ titreConfirmation(c) }}</h3>
        <p>{{ texteConfirmation(c) }}</p>
        <div class="modal-actions">
          <button class="btn-ghost" (click)="confirmation.set(null)">Retour</button>
          <button class="btn-gold" [class.btn-danger]="c.type === 'annuler'" (click)="executer(c)">Confirmer</button>
        </div>
      </div>
    </div>
  }
</div>`,
  styles: [`
    :host { display:block; color:#eef1f8; --gold:#d7b15a; --muted:#aeb6c2; --card:#14161c; --line:rgba(255,255,255,.08); }
    .page { max-width: 980px; }
    .head { display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; flex-wrap:wrap; margin-bottom:1.2rem; }
    h2 { margin:0; font-size: clamp(1.6rem, 3vw, 2.4rem); color:#fff; }
    .sub { margin:.2rem 0 0; color:var(--muted); }
    .head-actions { display:flex; gap:.6rem; flex-wrap:wrap; }
    .btn-gold, .btn-ghost {
      display:inline-flex; align-items:center; gap:.4rem; border-radius:999px; padding:.6rem 1.1rem;
      font-weight:600; font-size:.92rem; cursor:pointer; text-decoration:none; transition: transform .15s, background .15s, opacity .15s;
    }
    .btn-gold { background:var(--gold); color:#101720; border:none; }
    .btn-gold:hover:not(:disabled) { transform: translateY(-1px); background:#e2bf6c; }
    .btn-ghost { background:rgba(255,255,255,.06); color:#eef1f8; border:1px solid rgba(255,255,255,.12); }
    .btn-ghost:hover:not(:disabled) { background:rgba(255,255,255,.12); }
    .btn-ghost.danger { color:#fca5a5; border-color:rgba(239,68,68,.35); }
    .btn-danger { background:#ef4444 !important; color:#fff !important; }
    button:disabled { opacity:.5; cursor:not-allowed; }
    .spin { display:inline-block; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .kpis { display:grid; grid-template-columns: repeat(3, 1fr); gap:.8rem; margin-bottom:1.2rem; }
    .kpi { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:.9rem 1rem; display:flex; flex-direction:column; }
    .kpi-v { font-size:1.35rem; font-weight:800; color:#fff; }
    .kpi-l { color:var(--muted); font-size:.85rem; }

    .tabs { display:flex; gap:.4rem; overflow-x:auto; margin-bottom:1rem; padding-bottom:.2rem; }
    .tabs button {
      background:transparent; border:1px solid var(--line); color:var(--muted); border-radius:999px;
      padding:.45rem .9rem; cursor:pointer; white-space:nowrap; font-weight:600;
    }
    .tabs button.active { background:rgba(215,177,90,.14); color:var(--gold); border-color:rgba(215,177,90,.45); }
    .count { opacity:.75; margin-left:.25rem; font-size:.8rem; }

    .card { background:var(--card); border:1px solid var(--line); border-radius:16px; }
    .skeleton { height:120px; margin-bottom:.8rem; background:linear-gradient(90deg,#14161c 0%,#1b1f27 50%,#14161c 100%); background-size:200% 100%; animation: shimmer 1.2s infinite; }
    @keyframes shimmer { to { background-position: -200% 0; } }
    .empty { text-align:center; padding:3rem 1.5rem; display:flex; flex-direction:column; align-items:center; gap:1rem; }
    .empty p { color:var(--muted); margin:0; }
    .empty-ico { font-size:2rem; }

    .list { display:flex; flex-direction:column; gap:.8rem; }
    .rez { padding:1.1rem 1.2rem; transition: border-color .2s; }
    .rez:hover { border-color: rgba(215,177,90,.3); }
    .rez.highlight { border-color: rgba(215,177,90,.45); }
    .rez-top { display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
    .cities { font-weight:700; font-size:1.08rem; display:flex; gap:.5rem; flex-wrap:wrap; color:#fff; }
    .arrow { color:var(--gold); }
    .meta { color:var(--muted); font-size:.88rem; margin-top:.15rem; }
    .right { display:flex; flex-direction:column; align-items:flex-end; gap:.35rem; }
    .price { font-size:1.25rem; font-weight:800; color:#fff; }
    .badge { font-size:.75rem; font-weight:700; padding:.25rem .65rem; border-radius:999px; }
    .b-EN_ATTENTE { background:rgba(245,158,11,.15); color:#fcd34d; }
    .b-ACCEPTEE { background:rgba(59,130,246,.15); color:#93c5fd; }
    .b-TERMINEE { background:rgba(16,185,129,.15); color:#6ee7b7; }
    .b-ANNULEE, .b-REFUSEE { background:rgba(239,68,68,.13); color:#fca5a5; }

    .steps { list-style:none; display:flex; margin:1rem 0 .4rem; padding:0; }
    .steps li { flex:1; position:relative; display:flex; flex-direction:column; align-items:center; gap:.35rem; color:var(--muted); font-size:.78rem; text-align:center; }
    .steps li::before { content:''; position:absolute; top:6px; left:-50%; width:100%; height:2px; background:var(--line); z-index:0; }
    .steps li:first-child::before { display:none; }
    .steps li.done::before, .steps li.current::before { background:var(--gold); }
    .dot { width:14px; height:14px; border-radius:50%; background:#2a2f39; border:2px solid #2a2f39; z-index:1; }
    .steps li.done .dot { background:var(--gold); border-color:var(--gold); }
    .steps li.current .dot { border-color:var(--gold); box-shadow:0 0 0 4px rgba(215,177,90,.2); }
    .steps li.done, .steps li.current { color:#eef1f8; }
    .motif { color:var(--muted); font-size:.88rem; margin:.6rem 0 0; }

    .actions { display:flex; flex-wrap:wrap; gap:.5rem; justify-content:flex-end; align-items:center; margin-top:.8rem; }
    .hint { color:var(--muted); font-size:.85rem; margin-right:auto; }
    .hint.ok { color:#6ee7b7; }
    .rating { display:flex; flex-wrap:wrap; gap:.4rem; align-items:center; width:100%; justify-content:flex-end; }
    .star { background:none; border:none; font-size:1.5rem; color:#3a404c; cursor:pointer; padding:0 .1rem; }
    .star.on { color:var(--gold); }
    .input { background:#0f1116; border:1px solid var(--line); color:#eef1f8; border-radius:999px; padding:.55rem .9rem; min-width:200px; flex:1; }

    .overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); display:grid; place-items:center; z-index:9000; padding:1rem; }
    .modal { max-width:440px; width:100%; padding:1.4rem; }
    .modal h3 { margin:0 0 .5rem; color:#fff; }
    .modal p { color:var(--muted); margin:0 0 1.2rem; }
    .modal-actions { display:flex; justify-content:flex-end; gap:.6rem; }

    @media (max-width: 600px) {
      .kpis { grid-template-columns: repeat(3, minmax(0,1fr)); }
      .kpi-v { font-size:1.05rem; }
      .right { align-items:flex-start; }
      .actions { justify-content:flex-start; }
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
        list.forEach(r => this.statutsConnus.set(r.id, r.statut));
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

  private signalerChangements(list: Reservation[]) {
    for (const r of list) {
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
