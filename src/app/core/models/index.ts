// ─── AUTH ─────────────────────────────────────────────────────────────────────
export interface InscriptionRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  dateNaissance: string; // ISO date
  role: 'PASSAGER' | 'CHAUFFEUR' | 'PASSAGER_ET_CHAUFFEUR';
  numeroPermis?: string;
  modeleVoiture?: string
  immatriculation?: string
  numeroCNI?: string;
}

export interface LoginRequest {
  email: string;
  motDePasse: string;
}

export interface ValidatePasswordRequest {
  email: string;
  motDePasseTemporaire: string;
  nouveauMotDePasse: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  compteId: number;
  email: string;
  role: string;
  premierConnexion: boolean;
  message?: string;
  codeParrainage?: string;
}

// ─── UTILISATEUR ──────────────────────────────────────────────────────────────
export interface Utilisateur {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  photo?: string;
  dateNaissance: string;
  role: string;
  statut: string;
  noteMoyenne: number;
  nombreAvis: number;
  dateInscription: string;
  kycValide: boolean;
  permisValide: boolean;
  contactsUrgence?: string[];
  vehicules?: Vehicule[];
}

export interface Vehicule {
  id: number;
  marque: string;
  modele: string;
  immatriculation: string;
  couleur: string;
  nombrePlaces: number;
  annee?: string;
  photo?: string;
  actif: boolean;
}

// ─── TRAJET ───────────────────────────────────────────────────────────────────
export interface Trajet {
  id: number;
  chauffeurId: number;
  vehiculeId: number;
  villeDepart: string;
  villeArrivee: string;
  pointsPassage?: string;
  dateDepart: string;
  heureDepart: string;
  prixParPlace: number;
  nombrePlaces: number;
  placesDisponibles: number;
  statut: 'PLANIFIE' | 'EN_COURS' | 'TERMINE' | 'ANNULE';
  description?: string;
  latDepart?: number;
  lngDepart?: number;
  latArrivee?: number;
  lngArrivee?: number;
  dateCreation: string;
}

export interface TrajetRequest {
  vehiculeId: number;
  villeDepart: string;
  villeArrivee: string;
  dateDepart: string;
  heureDepart: string;
  prixParPlace: number;
  nombrePlaces: number;
  description?: string;
  latDepart?: number;
  lngDepart?: number;
  latArrivee?: number;
  lngArrivee?: number;
}

// ─── RÉSERVATION ──────────────────────────────────────────────────────────────
export interface Reservation {
  id: number;
  passagerId: number;
  trajetId: number;
  chauffeurId: number;
  nombrePlaces: number;
  statut: 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE' | 'ANNULEE' | 'TERMINEE';
  embarquementConfirme: boolean;
  arriveeConfirmee: boolean;
  dateReservation: string;
  dateEmbarquement?: string;
  dateArrivee?: string;
  paiementId?: number;
}

// ─── PAIEMENT ─────────────────────────────────────────────────────────────────
export interface Paiement {
  id: number;
  reservationId: number;
  passagerId: number;
  chauffeurId: number;
  montantTotal: number;
  montantDebloqueDepart: number;
  montantDebloqueArrivee: number;
  commissionPrelevee: number;
  moyenPaiement: string;
  statut: string;
  dateCreation: string;
}

// ─── PORTEFEUILLE ─────────────────────────────────────────────────────────────
export interface Portefeuille {
  id: number;
  utilisateurId: number;
  soldeDisponible: number;
  soldeBloque: number;
  devise: string;
  dateCreation: string;
}

export interface Transaction {
  id: number;
  type: string;
  montant: number;
  commission: number;
  statut: string;
  moyenPaiement?: string;
  description: string;
  timestamp: string;
}

export interface MobileMoneyRequest {
  moyen: 'MTN_MOMO' | 'ORANGE_MONEY';
  numeroTelephone: string;
  montant: number;
}

// ─── NOTIFICATION ─────────────────────────────────────────────────────────────
export interface Notification {
  id: number;
  utilisateurId: number;
  titre: string;
  message: string;
  type: string;
  lue: boolean;
  dateEnvoi: string;
}

// ─── AVIS ─────────────────────────────────────────────────────────────────────
export interface Avis {
  id: number;
  type: 'UTILISATEUR' | 'APPLICATION';
  auteurId: number;
  cibleId?: number;
  trajetId: number;
  note: number;
  commentaire?: string;
  date: string;
}

// ─── SIGNALEMENT ─────────────────────────────────────────────────────────────
export interface Signalement {
  id: number;
  plaignantId: number;
  misEnCauseId: number;
  trajetId: number;
  motif: string;
  description: string;
  statut: string;
  resolution?: string;
  dateSignalement: string;
  dateResolution?: string;
}

// ─── URGENCE ─────────────────────────────────────────────────────────────────
export interface AlerteUrgence {
  id: number;
  utilisateurId: number;
  trajetId?: number;
  latitude: number;
  longitude: number;
  adresseApproximative: string;
  statut: string;
  contactsNotifies: string[];
  adminNotifie: boolean;
  dateDeclenchement: string;
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// ─── DASHBOARD ADMIN ─────────────────────────────────────────────────────────
export interface DashboardAdmin {
  totalUtilisateurs: number;
  totalPassagers: number;
  totalConducteurs: number;
  totalTrajets: number;
  trajetsEnCours: number;
  trajetsTermines: number;
  totalCommissions: number;
  revenusPlateforme: number;
  signalementsOuverts: number;
}

// ------profil---------------------------------------------------
export interface ProfilUtilisateur {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  dateNaissance: string;
  role: string;
  statut: string;
  noteMoyenne: number;
  nombreAvis: number;
  contactsUrgence: string[];
}
