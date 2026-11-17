import { Component, OnInit, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { Signalement } from '../../../core/models';

@Component({
  selector: 'app-signalements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem">
    <div><h2>Signalements</h2><p>Gestion des conflits et plaintes</p></div>
    <div style="display:flex;gap:0.75rem">
      @for (s of statutOptions; track s.value) {
        <button class="btn btn-sm" [class.btn-primary]="filtreStatut()===s.value"
          [class.btn-outline]="filtreStatut()!==s.value" (click)="filtreStatut.set(s.value);charger()">
          {{ s.label }}
        </button>
      }
    </div>
  </div>

  @if (loading()) {
    <div style="text-align:center;padding:3rem;color:var(--color-muted)">Chargement...</div>
  } @else if (signalements().length === 0) {
    <div class="card" style="text-align:center;padding:3rem">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
        style="width:48px;height:48px;color:var(--color-success);margin:0 auto 1rem;display:block">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <p>Aucun signalement {{ filtreStatut() === 'OUVERT' ? 'ouvert' : '' }}</p>
    </div>
  } @else {
    <div style="display:flex;flex-direction:column;gap:1rem">
      @for (s of signalements(); track s.id) {
        <div class="card">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1rem">
            <div>
              <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem">
                <span class="badge" [class]="getStatutBadge(s.statut)">{{ s.statut }}</span>
                <span style="font-weight:600">{{ s.motif }}</span>
              </div>
              <div style="font-size:0.85rem;color:var(--color-muted)">
                Plaignant #{{ s.plaignantId }} contre #{{ s.misEnCauseId }} · Trajet #{{ s.trajetId }}
              </div>
              <div style="font-size:0.8rem;color:var(--color-muted)">
                {{ s.dateSignalement | date:'dd/MM/yyyy HH:mm' }}
              </div>
            </div>
            <div style="font-size:0.85rem;color:var(--color-muted);white-space:nowrap">
              #{{ s.id }}
            </div>
          </div>

          <div style="background:var(--color-bg);border-radius:var(--radius-md);padding:0.75rem;margin-bottom:1rem;font-size:0.875rem;line-height:1.6">
            {{ s.description }}
          </div>

          @if (s.statut === 'OUVERT') {
            @if (resolutionActive() === s.id) {
              <div>
                <textarea class="field" [(ngModel)]="resolutionTexte" rows="3"
                  placeholder="Saisissez la résolution..." style="margin-bottom:0.75rem"></textarea>
                <div style="display:flex;gap:0.5rem">
                  <button class="btn btn-success btn-sm" (click)="resoudre(s)" [disabled]="busy() === s.id || resolutionTexte.trim().length < 5">✓ Résoudre</button>
                  <button class="btn btn-outline btn-sm" (click)="resolutionActive.set(null)">Annuler</button>
                </div>
              </div>
            } @else {
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" (click)="resolutionActive.set(s.id); resolutionTexte = ''">
                  Traiter ce signalement
                </button>
                <button class="btn btn-danger btn-sm" (click)="bloquerMisEnCause(s)" [disabled]="busy() === s.id">
                  Bloquer l'utilisateur #{{ s.misEnCauseId }}
                </button>
              </div>
            }
          }

          @if (s.resolution) {
            <div style="margin-top:0.75rem;padding:0.75rem;background:#F0FDF4;border-radius:var(--radius-md);font-size:0.85rem;border:1px solid #BBF7D0">
              <strong style="color:var(--color-success)">Résolution :</strong> {{ s.resolution }}
            </div>
          }
        </div>
      }
    </div>
  }
</div>`
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

  constructor(private adminSvc: AdminService) {}

  ngOnInit() { this.charger(); }

  charger() {
    this.loading.set(true);
    this.adminSvc.getSignalements(this.filtreStatut()).subscribe({
      next: p => { this.signalements.set(p.content ?? []); this.loading.set(false); },
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
      title: `Bloquer l'utilisateur #${s.misEnCauseId} ?`,
      message: `Suite au signalement « ${s.motif} ». L'utilisateur ne pourra plus se connecter.`,
      confirmLabel: 'Bloquer', danger: true
    });
    if (!ok) return;
    this.busy.set(s.id);
    this.userSvc.changerStatut(s.misEnCauseId, 'BLOQUE').subscribe({
      next: () => {
        this.adminSvc.changerBlocageCompte(s.misEnCauseId, true).subscribe({ error: () => {} });
        this.busy.set(null);
        this.toast.success('Utilisateur bloqué', `#${s.misEnCauseId}`);
      },
      error: err => { this.busy.set(null); this.toast.error('Blocage impossible', err); }
    });
  }

  getStatutBadge(s: string) {
    return { 'OUVERT': 'badge badge-warning', 'RESOLU': 'badge badge-success',
      'REJETE': 'badge badge-muted', 'EN_COURS': 'badge badge-info' }[s] || 'badge badge-muted';
  }
}
