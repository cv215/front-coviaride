import { Component, OnInit, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { Signalement } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ProfilsService } from '../../../core/services/profils.service';

@Component({
  selector: 'app-signalements',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
<div class="lx-page">
  <div class="lx-page-head">
    <div>
      <span class="lx-eyebrow">Modération</span>
      <h2>Signalements</h2>
      <p>Conflits et plaintes entre passagers et chauffeurs.</p>
    </div>
    <button class="lx-btn lx-btn-secondary" (click)="charger()" [disabled]="loading()"><lx-icon name="refresh" [class.lx-spin]="loading()" /> Actualiser</button>
  </div>

  <nav class="lx-tabs" role="tablist">
    @for (o of statutOptions; track o.value) {
      <button role="tab" class="lx-tab" [class.is-active]="filtreStatut() === o.value" (click)="filtreStatut.set(o.value); charger()">{{ o.label }}</button>
    }
  </nav>

  @if (loading()) {
    <div class="lx-stack-sm">@for (i of [1,2]; track i) { <div class="lx-skeleton" style="min-height:160px"></div> }</div>
  } @else if (signalements().length === 0) {
    <div class="lx-empty">
      <lx-icon name="check-circle" style="color:var(--lx-emerald)" />
      <p>Aucun signalement {{ libelleFiltre() }}.</p>
    </div>
  } @else {
    <div class="lx-stack-sm">
      @for (s of signalements(); track s.id) {
        <article class="lx-card report" [class.is-open]="s.statut === 'OUVERT'">
          <div class="report-head">
            <span class="lx-icon-tile" [class.is-warn]="s.statut === 'OUVERT'"><lx-icon name="alert" /></span>
            <div class="min-w-0" style="flex:1">
              <div class="lx-row" style="gap:.5rem">
                <strong class="motif">{{ s.motif }}</strong>
                <span class="lx-badge" [ngClass]="getStatutBadge(s.statut)">{{ libelleStatut(s.statut) }}</span>
              </div>
              <div class="lx-list-sub"><strong>{{ profils.nom(s.plaignantId) }}</strong> contre <strong>{{ profils.nom(s.misEnCauseId) }}</strong> · Trajet #{{ s.trajetId }}</div>
              <div class="lx-list-sub">{{ s.dateSignalement | date:'dd/MM/yyyy HH:mm' }} · Réf. #{{ s.id }}</div>
            </div>
          </div>

          <p class="description">{{ s.description }}</p>

          @if (s.resolution) {
            <div class="lx-alert lx-alert-success"><lx-icon name="check-circle" /><span><strong>Résolution :</strong> {{ s.resolution }}</span></div>
          }

          @if (s.statut === 'OUVERT') {
            @if (resolutionActive() === s.id) {
              <div class="lx-stack-sm">
                <label class="lx-label" [attr.for]="'res-' + s.id">Résolution</label>
                <textarea class="lx-textarea" [id]="'res-' + s.id" [(ngModel)]="resolutionTexte" rows="3" style="min-height:90px"
                  placeholder="Décrivez la décision prise (5 caractères minimum)…"></textarea>
                <div class="report-actions">
                  <button class="lx-btn lx-btn-ghost lx-btn-sm" (click)="resolutionActive.set(null)">Annuler</button>
                  <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="resoudre(s)" [disabled]="busy() === s.id || resolutionTexte.trim().length < 5">
                    <lx-icon name="check" /> Marquer comme résolu
                  </button>
                </div>
              </div>
            } @else {
              <div class="report-actions">
                <button class="lx-btn lx-btn-danger lx-btn-sm" (click)="bloquerMisEnCause(s)" [disabled]="busy() === s.id">Bloquer {{ profils.nom(s.misEnCauseId) }}</button>
                <button class="lx-btn lx-btn-primary lx-btn-sm" (click)="resolutionActive.set(s.id); resolutionTexte = ''">Traiter</button>
              </div>
            }
          }
        </article>
      }
    </div>
  }
</div>`,
  styles: [`
    :host { display: block; }
    .min-w-0 { min-width: 0; }
    .report { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; &.is-open { border-color: rgba(251, 191, 36, 0.3); } }
    .report-head { display: flex; gap: 0.9rem; align-items: flex-start; }
    .motif { font-weight: 500; font-size: 0.95rem; }
    .lx-icon-tile.is-warn { background: rgba(251, 191, 36, 0.12); color: var(--lx-amber); }
    .description { margin: 0; background: var(--lx-secondary); color: rgba(240, 236, 227, 0.85); border-radius: var(--lx-r-md); padding: 0.85rem 1rem; font-size: 0.875rem; line-height: 1.6; white-space: pre-line; }
    .report-actions { display: flex; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap; }
    @media (max-width: 520px) { .report-actions .lx-btn { flex: 1; } }
  `]
})
export class SignalementsComponent implements OnInit {
  loading = signal(true);
  signalements = signal<Signalement[]>([]);
  filtreStatut = signal('OUVERT');
  resolutionActive = signal<number | null>(null);
  resolutionTexte = '';

  statutOptions = [
    { value: 'OUVERT', label: 'Ouverts' },
    { value: 'RESOLU', label: 'Résolus' },
    { value: 'REJETE', label: 'Rejetés' }
  ];

  busy = signal<number | null>(null);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private userSvc = inject(UtilisateurService);
  profils = inject(ProfilsService);

  constructor(private adminSvc: AdminService) {}

  ngOnInit() { this.charger(); }

  charger() {
    this.loading.set(true);
    this.adminSvc.getSignalements(this.filtreStatut()).subscribe({
      next: p => {
        this.signalements.set(p?.content ?? []);
        this.profils.charger((p?.content ?? []).flatMap(x => [x.plaignantId, x.misEnCauseId]));
        this.loading.set(false);
      },
      error: err => { this.loading.set(false); this.toast.error('Chargement impossible', err); }
    });
  }

  resoudre(s: Signalement) {
    const texte = this.resolutionTexte.trim();
    if (texte.length < 5) return;
    this.busy.set(s.id);
    this.adminSvc.resoudreSignalement(s.id, texte).subscribe({
      next: updated => {
        this.busy.set(null);
        this.resolutionActive.set(null);
        this.resolutionTexte = '';
        // Un signalement résolu quitte la liste des signalements ouverts.
        if (this.filtreStatut() === 'OUVERT') {
          this.signalements.update(arr => arr.filter(x => x.id !== s.id));
        } else {
          this.signalements.update(arr => arr.map(x => x.id === s.id ? updated : x));
        }
        this.toast.success('Signalement résolu', `#${s.id} · ${s.motif}`);
      },
      error: err => { this.busy.set(null); this.toast.error('Résolution impossible', err); }
    });
  }

  async bloquerMisEnCause(s: Signalement) {
    const ok = await this.confirm.ask({
      title: `Bloquer ${this.profils.nom(s.misEnCauseId)} ?`,
      message: `Suite au signalement « ${s.motif} ». L'utilisateur ne pourra plus se connecter.`,
      confirmLabel: 'Bloquer', danger: true
    });
    if (!ok) return;
    this.busy.set(s.id);
    this.userSvc.changerStatut(s.misEnCauseId, 'BLOQUE').subscribe({
      next: () => {
        this.adminSvc.changerBlocageCompte(s.misEnCauseId, true).subscribe({
          error: () => this.toast.warning('Connexion non bloquée', "Le profil est bloqué mais pas le compte de connexion — réessayez depuis Utilisateurs.")
        });
        this.busy.set(null);
        this.toast.success('Utilisateur bloqué', this.profils.nom(s.misEnCauseId));
      },
      error: err => { this.busy.set(null); this.toast.error('Blocage impossible', err); }
    });
  }

  getStatutBadge(s: string) {
    return ({ OUVERT: 'lx-badge-warning', RESOLU: 'lx-badge-success', EN_COURS: 'lx-badge-info' } as Record<string, string>)[s] ?? '';
  }

  libelleStatut(s: string) {
    return ({ OUVERT: 'Ouvert', RESOLU: 'Résolu', REJETE: 'Rejeté', EN_COURS: 'En cours' } as Record<string, string>)[s] ?? s;
  }

  libelleFiltre() {
    return ({ OUVERT: 'ouvert', RESOLU: 'résolu', REJETE: 'rejeté' } as Record<string, string>)[this.filtreStatut()] ?? '';
  }
}
