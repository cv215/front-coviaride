import { Component, OnInit, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admins',
  standalone: true,
  imports: [CommonModule, FormsModule,ReactiveFormsModule],
  template: `
<div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">
    <div>
      <h2>Gestion des administrateurs</h2>
      <p>Créer et gérer les comptes admin avec leurs services attribués.</p>
    </div>
    <button class="btn btn-primary" (click)="showForm.set(true)">+ Ajouter un admin</button>
  </div>

  @if (showForm()) {
    <div class="card" style="margin-bottom:1.5rem">
      <h3 style="margin-bottom:1rem">Nouveau compte administrateur</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem">
        <label>
          <span>Email</span>
          <input class="field" type="email" [(ngModel)]="form.email" placeholder="admin@coviaride.com" />
        </label>
        <label>
          <span>Mot de passe</span>
          <input class="field" type="password" [(ngModel)]="form.motDePasse" placeholder="Minimum 8 caractères" />
        </label>
      </div>

      <div style="margin-top:1rem">
        <div style="margin-bottom:0.5rem;font-weight:600">Services assignés</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem">
          @for (service of servicesDisponibles; track service) {
            <label style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.75rem;border:1px solid var(--color-border);border-radius:999px;background:var(--color-bg);cursor:pointer">
              <input type="checkbox" [checked]="form.services.includes(service)" (change)="toggleService(service)" />
              <span>{{ service }}</span>
            </label>
          }
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem">
        <button class="btn btn-ghost" (click)="resetForm()">Annuler</button>
        <button class="btn btn-primary" (click)="creerAdmin()">Enregistrer</button>
      </div>
    </div>
  }

  <div class="card" style="padding:0;overflow:hidden">
    <table class="data-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Rôle</th>
          <th>Services</th>
          <th>Statut</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        @for (admin of admins(); track admin.id) {
          <tr>
            <td>{{ admin.email }}</td>
            <td><span class="badge badge-info">{{ admin.role }}</span></td>
            <td>
              @if (admin.services?.length) {
                <div style="display:flex;flex-wrap:wrap;gap:0.35rem">
                  @for (s of admin.services; track s) {
                    <span class="badge badge-muted">{{ s }}</span>
                  }
                </div>
              } @else {
                <span class="badge badge-warning">Aucun</span>
              }
            </td>
            <td>
              <span class="badge" [class]="admin.actif ? 'badge-success' : 'badge-danger'">
                {{ admin.actif ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td>
              <button class="btn btn-outline btn-sm" (click)="reinitialiserMotDePasse(admin)">Réinitialiser MDP</button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>
</div>
  `
})
export class AdminsComponent implements OnInit {
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  admins = signal<any[]>([]);
  showForm = signal(false);
  envoi = signal(false);
  servicesDisponibles = ['UTILISATEURS', 'SIGNALEMENTS', 'TRAJETS', 'COMMISSIONS', 'REMBOURSEMENTS', 'KYC', 'URGENCES'];
  form = { email: '', motDePasse: '', services: [] as string[] };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadAdmins();
  }

  loadAdmins() {
    this.adminService.listAdministrateurs().subscribe({
      next: data => this.admins.set(data ?? []),
      error: err => { this.admins.set([]); this.toast.error('Chargement des administrateurs impossible', err); }
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
    if (this.form.motDePasse.length < 8) {
      this.toast.warning('Mot de passe trop court', '8 caractères minimum.');
      return;
    }
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
