 import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {ReactiveFormsModule,FormBuilder,Validators,AbstractControl} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { Portefeuille, ProfilUtilisateur, Reservation, Trajet, Utilisateur } from '../../../core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule,CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit{
  // ── État ──────────────────────────────────────────────────────────────────
  chargement   = signal(true);
  erreur       = signal('');
  profil       = signal<ProfilUtilisateur | null>(null);
  ongletActif  = signal<'infos'|'password'|'urgence'>('infos');
  selectedFile: File | null = null;
  photoPreviewUrl: string | ArrayBuffer | null = null;
  referralCode = signal('');

  // Infos perso
  infosLoading = signal(false);
  infosSuccess = signal('');
  infosErreur  = signal('');

  // Mot de passe
  pwdLoading   = signal(false);
  pwdSuccess   = signal('');
  pwdErreur    = signal('');
  showA = false; showN = false; showC = false;

  // Contacts urgence
  nouveauContact = '';
  urgenceLoading = signal(false);
  urgenceMsg     = signal('');

  // Création profil (fallback)
  creationLoading = signal(false);
  creationMsg     = signal('');
  creationErreur  = signal('');

   reservations = signal<Reservation[]>([]);
    portefeuille = signal<Portefeuille | null>(null);
    utilisateur = signal<Utilisateur | null>(null);
    searched          = signal(false);
    trajets           = signal<Trajet[]>([]);
    trajetSelectionne = signal<Trajet | null>(null);
    chauffeur         = signal<any>(null);
    chargementChauffeur = signal(false);
    avis              = signal<any[]>([]);
    aReserve          = signal(false);
    rezLoading        = signal(false);
    rezSuccess        = signal('');
    rezError          = signal('');
    showChat          = signal(false);
    chatMessages      = signal<any[]>([]);
    offreChauffeur    = signal<number | null>(null);
    messageChat       = '';
    prixNegocié       = signal<number | null>(null);
    selectedStop      = signal<string | null>(null);
    today             = new Date().toISOString().split('T')[0];
  

  maxDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  })();

  readonly onglets = [
    { id: 'infos',    label: ' Informations' },
    { id: 'password', label: ' Mot de passe' },
    { id: 'urgence',  label: ' Contacts urgence' }
  ] as const;

  // ── Formulaires ───────────────────────────────────────────────────────────
  formInfos = this.fb.group({
    prenom:        ['', [Validators.required, Validators.minLength(2)]],
    nom:           ['', [Validators.required, Validators.minLength(2)]],
    telephone:     ['', [Validators.required,
                    Validators.pattern(/^(\+?237)?[6-9][0-9]{8}$/)]],
    dateNaissance: ['',[Validators.required]]
  });

  formPwd = this.fb.group({
    ancien:  ['', Validators.required],
    nouveau: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/)
    ]],
    confirm: ['', Validators.required]
  }, { validators: this.matchPasswords });

  formCreation = this.fb.group({
    prenom:        ['', [Validators.required, Validators.minLength(2)]],
    nom:           ['', [Validators.required, Validators.minLength(2)]],
    telephone:     ['', [Validators.required,
                    Validators.pattern(/^(\+?237)?[6-9][0-9]{8}$/)]],
    dateNaissance: ['', Validators.required]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const u = this.auth.currentUser();
    if (!u) { this.erreur.set('Non connecté.'); this.chargement.set(false); return; }
    this.referralCode.set(u.codeParrainage || 'COVI-2026');
    this.chargerProfil(u.compteId);
  }

  shareReferral() {
    const code = this.referralCode();
    const message = encodeURIComponent(`Je te recommande Coviaride. Utilise mon code de parrainage : ${code} pour t’inscrire.`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  }

  onPhotoSelected(event: Event){
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]){
      this.selectedFile = input.files[0];

      const reader = new FileReader();
      reader.onload = () =>{
        this.photoPreviewUrl = reader.result;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  // ── Chargement profil ─────────────────────────────────────────────────────
  chargerProfil(id: number) {
    this.chargement.set(true);
    this.erreur.set('');

    this.http.get<ProfilUtilisateur>(
      `${environment.apiUrl}/utilisateurs/profil/${id}`
    ).subscribe({
      next: p => {
        this.profil.set(p);
        this.formInfos.patchValue({
          prenom:        p.prenom        || '',
          nom:           p.nom           || '',
          telephone:     p.telephone     || '',
          dateNaissance: p.dateNaissance || ''
        });
        this.chargement.set(false);
      },
      error: err => {
        if (err.status === 404) {
          this.erreur.set(
            'Profil introuvable. Veuillez créer votre profil ci-dessous.');
        } else if (err.status === 0 || err.status === 503) {
          this.erreur.set(
            'Le service utilisateur est indisponible. '
            + 'Vérifiez que service-utilisateur est démarré (port 8082).');
        } else {
          this.erreur.set(
            'Erreur ' + err.status + ' : impossible de charger le profil.');
        }
        this.chargement.set(false);
      }
    });
  }

  statsClient() {
    const toutes = this.reservations();
    const terminees = toutes.filter(r => r.statut === 'TERMINEE');

    const nombreCourses = terminees.length;

    // ⚠️ Le modèle Reservation fourni n'exposait pas la distance ni le prix
    // du trajet : on suppose ici un objet `trajet` imbriqué avec
    // `distanceKm` et `prix`. Adaptez ces accès selon votre API réelle.
    const kmParcourus = terminees.reduce(
      (total, r: any) => total + (r.trajet?.distanceKm ?? 0), 0
    );

    // Solde disponible du passager, tel que renvoyé par le portefeuille.
    const solde = this.portefeuille()?.soldeDisponible ?? 0;
    const devise = this.portefeuille()?.devise ?? 'XAF';

    // ⚠️ Nombre de personnes parrainées : suppose que UtilisateurService
    // renvoie ce champ sur le profil. À défaut, câblez un appel dédié
    // (ex: ParrainageService.compter(user.compteId)).
    const nombreParraines = (this.utilisateur() as any)?.nombreParraines ?? 0;

    const pointsFidelite = (this.portefeuille() as any)?.pointsFidelite ?? 0;

    return { nombreCourses, kmParcourus, solde, devise, nombreParraines, pointsFidelite };
  }

  // ── Créer profil (fallback si Kafka n'a pas créé le profil) ───────────────
  creerProfil() {
    if (this.formCreation.invalid) {
      this.formCreation.markAllAsTouched();
      return;
    }
    const u = this.auth.currentUser();
    if (!u) return;

    this.creationLoading.set(true);
    this.creationErreur.set('');

    const v = this.formCreation.value;
    this.http.post<ProfilUtilisateur>(
      `${environment.apiUrl}/utilisateurs/profil`,
      {
        id:            u.compteId,
        email:         u.email,
        prenom:        v.prenom,
        nom:           v.nom,
        telephone:     v.telephone,
        dateNaissance: v.dateNaissance,
        role:          u.role,
        statut:        'ACTIF'
      }
    ).subscribe({
      next: p => {
        this.profil.set(p);
        this.erreur.set('');
        this.creationMsg.set('Profil créé avec succès !');
        this.creationLoading.set(false);
        this.formInfos.patchValue({
          prenom: p.prenom, nom: p.nom,
          telephone: p.telephone, dateNaissance: p.dateNaissance
        });
      },
      error: err => {
        this.creationErreur.set(
          err.error?.message || 'Erreur lors de la création du profil.');
        this.creationLoading.set(false);
      }
    });
  }

  // ── Sauvegarder infos ─────────────────────────────────────────────────────
  sauvegarderInfos() {
    if (this.formInfos.invalid) { this.formInfos.markAllAsTouched(); return; }
    const u = this.auth.currentUser();
    if (!u) return;

    this.infosLoading.set(true);
    this.infosSuccess.set('');
    this.infosErreur.set('');

    this.http.put<ProfilUtilisateur>(
      `${environment.apiUrl}/utilisateurs/profil/${u.compteId}`,
      this.formInfos.value
    ).subscribe({
      next: updated => {
        this.profil.set(updated);
        this.infosSuccess.set('Profil mis à jour avec succès !');
        this.infosLoading.set(false);
        this.formInfos.markAsPristine();
        setTimeout(() => this.infosSuccess.set(''), 3000);
      },
      error: err => {
        this.infosErreur.set(
          err.error?.message || 'Erreur lors de la sauvegarde.');
        this.infosLoading.set(false);
      }
    });
  }

  // ── Changer mot de passe ──────────────────────────────────────────────────
  changerMdp() {
    if (this.formPwd.invalid) { this.formPwd.markAllAsTouched(); return; }
    const u = this.auth.currentUser();
    if (!u) return;

    this.pwdLoading.set(true);
    this.pwdSuccess.set('');
    this.pwdErreur.set('');

    this.http.put<{ message: string }>(
      `${environment.apiUrl}/utilisateurs/profil/${u.compteId}/changer-mot-de-passe`,
      {
        ancienMotDePasse:  this.formPwd.value.ancien,
        nouveauMotDePasse: this.formPwd.value.nouveau
      }
    ).subscribe({
      next: res => {
        this.pwdSuccess.set(
          res.message || 'Mot de passe modifié. Reconnectez-vous.');
        this.pwdLoading.set(false);
        this.formPwd.reset();
        setTimeout(() => this.pwdSuccess.set(''), 4000);
      },
      error: err => {
        this.pwdErreur.set(
          err.error?.message || 'Mot de passe actuel incorrect.');
        this.pwdLoading.set(false);
      }
    });
  }

  // ── Contacts urgence ──────────────────────────────────────────────────────
  ajouterContact() {
    if (!this.nouveauContact.trim()) return;
    const u = this.auth.currentUser();
    if (!u) return;

    this.urgenceLoading.set(true);
    this.http.post<ProfilUtilisateur>(
      `${environment.apiUrl}/utilisateurs/profil/${u.compteId}/contacts-urgence`,
      { contact: this.nouveauContact.trim() }
    ).subscribe({
      next: updated => {
        this.profil.set(updated);
        this.nouveauContact = '';
        this.urgenceMsg.set('Contact ajouté !');
        this.urgenceLoading.set(false);
        setTimeout(() => this.urgenceMsg.set(''), 2500);
      },
      error: () => this.urgenceLoading.set(false)
    });
  }

  supprimerContact(index: number) {
    const u = this.auth.currentUser();
    if (!u || !this.profil()) return;

    const contacts = [...(this.profil()!.contactsUrgence || [])];
    contacts.splice(index, 1);

    this.http.put<ProfilUtilisateur>(
      `${environment.apiUrl}/utilisateurs/profil/${u.compteId}`,
      { contactsUrgence: contacts }
    ).subscribe({
      next: updated => this.profil.set(updated),
      error: () => {}
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  fi(f: string) { return this.formInfos.get(f); }
  fp(f: string) { return this.formPwd.get(f);   }

  private matchPasswords(group: AbstractControl) {
    const n = group.get('nouveau')?.value;
    const c = group.get('confirm')?.value;
    return n === c ? null : { mismatch: true };
  }

  logout() { this.auth.deconnexion(); }
}