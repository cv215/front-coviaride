import { Component, OnInit, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-admins',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IconComponent],
  template: `
<div class="lx-page">
  <div class="lx-page-head">
    <div>
      <span class="lx-eyebrow">Équipe</span>
      <h2>Administrateurs</h2>
      <p>Créez des comptes administrateurs et attribuez-leur des services.</p>
    </div>
    <button class="lx-btn" [class.lx-btn-primary]="!showForm()" [class.lx-btn-secondary]="showForm()" (click)="showForm() ? resetForm() : showForm.set(true)">
      <lx-icon [name]="showForm() ? 'x' : 'plus'" /> {{ showForm() ? 'Fermer' : 'Ajouter un admin' }}
    </button>
  </div>

  @if (showForm()) {
    <form class="lx-card lx-stack form-card" (ngSubmit)="creerAdmin()">
      <h3 class="lx-card-title" style="margin:0">Nouveau compte administrateur</h3>
      <div class="lx-form-grid">
        <div>
          <label class="lx-label" for="a-email">Email</label>
          <div class="lx-field has-icon"><span class="lx-field-icon"><lx-icon name="mail" /></span>
            <input id="a-email" class="lx-input" type="email" name="email" [(ngModel)]="form.email" placeholder="admin@coviaride.com" autocomplete="off" /></div>
        </div>
        <div>
          <label class="lx-label" for="a-pwd">Mot de passe</label>
          <div class="lx-field has-icon"><span class="lx-field-icon"><lx-icon name="lock" /></span>
            <input id="a-pwd" class="lx-input" type="password" name="motDePasse" [(ngModel)]="form.motDePasse" placeholder="8 caractères minimum" autocomplete="new-password" /></div>
        </div>
      </div>
      <div>
        <span class="lx-label">Services attribués</span>
        <div class="chips">
          @for (service of servicesDisponibles; track service) {
            <button type="button" class="lx-chip" [class.is-active]="form.services.includes(service)" (click)="toggleService(service)"
              [attr.aria-pressed]="form.services.includes(service)">
              @if (form.services.includes(service)) { <lx-icon name="check" /> }
              {{ libelleService(service) }}
            </button>
          }
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="lx-btn lx-btn-ghost" (click)="resetForm()">Annuler</button>
        <button type="submit" class="lx-btn lx-btn-primary" [disabled]="envoi()">{{ envoi() ? 'Création…' : 'Créer le compte' }}</button>
      </div>
    </form>
  }

  @if (chargement()) {
    <div class="lx-stack-sm">@for (i of [1,2]; track i) { <div class="lx-skeleton" style="min-height:80px"></div> }</div>
  } @else if (admins().length === 0) {
    <div class="lx-empty"><lx-icon name="shield" /><p>Aucun administrateur trouvé.</p></div>
  } @else {
    <div class="lx-list">
      @for (admin of admins(); track admin.id) {
        <div class="admin-row">
          <span class="lx-avatar">{{ (admin.email || '?').charAt(0).toUpperCase() }}</span>
          <div class="lx-list-body">
            <span class="lx-list-title lx-truncate">{{ admin.email }}</span>
            <span class="lx-list-sub">{{ admin.role === 'SUPER_ADMIN' ? 'Super administrateur' : 'Administrateur' }}</span>
            <div class="chips small">
              @for (s of admin.services ?? []; track s) { <span class="lx-badge">{{ libelleService(s) }}</span> }
              @empty { <span class="lx-badge lx-badge-warning">Aucun service</span> }
            </div>
          </div>
          <div class="admin-right">
            <span class="lx-badge" [class.lx-badge-success]="admin.actif" [class.lx-badge-danger]="!admin.actif">{{ admin.actif ? 'Actif' : 'Inactif' }}</span>
            <button class="lx-btn lx-btn-secondary lx-btn-sm" (click)="reinitialiserMotDePasse(admin)"><lx-icon name="lock" /> Mot de passe</button>
          </div>
        </div>
      }
    </div>
  }
</div>
  `,
  styles: [`
    :host { display: block; }
    .form-card { margin-bottom: 1.5rem; border-color: rgba(200, 146, 42, 0.25); }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.6rem; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; &.small { gap: 0.35rem; margin-top: 0.5rem; } }
    .admin-row { display: flex; align-items: flex-start; gap: 0.9rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--lx-border); &:last-child { border-bottom: 0; } }
    .admin-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; flex-shrink: 0; }
    @media (max-width: 560px) {
      .admin-row { flex-wrap: wrap; }
      .admin-right { flex-direction: row; width: 100%; justify-content: space-between; align-items: center; }
      .form-actions .lx-btn { flex: 1; }
    }
  `]
})
export class AdminsComponent implements OnInit {
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  admins = signal<any[]>([]);
  showForm = signal(false);
  chargement = signal(true);
  envoi = signal(false);
  servicesDisponibles = ['UTILISATEURS', 'SIGNALEMENTS', 'TRAJETS', 'COMMISSIONS', 'REMBOURSEMENTS', 'KYC', 'URGENCES'];
  form = { email: '', motDePasse: '', services: [] as string[] };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadAdmins();
  }

  loadAdmins() {
    this.chargement.set(true);
    this.adminService.listAdministrateurs().subscribe({
      next: data => { this.admins.set(data ?? []); this.chargement.set(false); },
      error: err => { this.admins.set([]); this.chargement.set(false); this.toast.error('Chargement des administrateurs impossible', err); }
    });
  }

  toggleService(service: string) {
    const exists = this.form.services.includes(service);
    this.form.services = exists
      ? this.form.services.filter(s => s !== service)
      : [...this.form.services, service];
  }

  resetForm() {
    this.form = { email: '', motDePasse: '', services: [] };
    this.showForm.set(false);
  }

  creerAdmin() {
    if (!this.form.email || !this.form.motDePasse || this.form.services.length === 0) {
      this.toast.warning('Formulaire incomplet', 'Email, mot de passe et au moins un service sont obligatoires.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.form.email.trim())) {
      this.toast.warning('Email invalide', 'Saisissez une adresse email valide.');
      return;
    }
    if (this.form.motDePasse.length < 8) {
      this.toast.warning('Mot de passe trop court', '8 caractères minimum.');
      return;
    }
    if (this.envoi()) return;
    this.envoi.set(true);
    this.adminService.createAdministrateur({
      email: this.form.email.trim(),
      motDePasse: this.form.motDePasse,
      services: this.form.services
    }).subscribe({
      next: () => {
        this.envoi.set(false);
        this.toast.success('Administrateur créé', this.form.email);
        this.resetForm();
        this.loadAdmins();
      },
      error: err => { this.envoi.set(false); this.toast.error('Création impossible', err); }
    });
  }

  libelleService(s: string): string {
    return ({ UTILISATEURS: 'Utilisateurs', SIGNALEMENTS: 'Signalements', TRAJETS: 'Trajets', COMMISSIONS: 'Commissions',
      REMBOURSEMENTS: 'Remboursements', KYC: 'KYC', URGENCES: 'Urgences' } as Record<string, string>)[s] ?? s;
  }

  async reinitialiserMotDePasse(admin: any) {
    const newPassword = await this.confirm.ask({
      title: 'Nouveau mot de passe',
      message: `Définissez le nouveau mot de passe de ${admin.email}.`,
      confirmLabel: 'Enregistrer',
      input: { label: 'Mot de passe (8 caractères minimum)', type: 'password', minLength: 8 }
    });
    if (!newPassword) return;
    this.adminService.updatePasswordAdmin(admin.id, newPassword).subscribe({
      next: () => this.toast.success('Mot de passe réinitialisé', admin.email),
      error: err => this.toast.error('Réinitialisation impossible', err)
    });
  }
}
