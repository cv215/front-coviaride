import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Utilisateur, Vehicule, Page, ProfilPublic, DocumentKyc, TypeDocument, FiltresUtilisateurs } from '../models';

@Injectable({ providedIn: 'root' })
export class UtilisateurService {
  private base = `${environment.apiUrl}/utilisateurs`;

  constructor(private http: HttpClient) {}

  getProfil(id: number): Observable<Utilisateur> {
    return this.http.get<Utilisateur>(`${this.base}/profil/${id}`);
  }

  modifierProfil(id: number, data: Partial<Utilisateur>): Observable<Utilisateur> {
    return this.http.put<Utilisateur>(`${this.base}/profil/${id}`, data);
  }

  getVehicules(proprietaireId: number): Observable<Vehicule[]> {
    return this.http.get<Vehicule[]>(`${this.base}/vehicules/${proprietaireId}`);
  }

  ajouterVehicule(proprietaireId: number, vehicule: any): Observable<Vehicule> {
    return this.http.post<Vehicule>(`${this.base}/vehicules/${proprietaireId}`, vehicule);
  }

  ajouterContactUrgence(id: number, contact: string): Observable<Utilisateur> {
    return this.http.post<Utilisateur>(`${this.base}/profil/${id}/contacts-urgence`, { contact });
  }

  getChauffeursDisponibles(page = 0): Observable<Page<Utilisateur>> {
    return this.http.get<Page<Utilisateur>>(`${this.base}/chauffeurs/disponibles?page=${page}`);
  }

  /** Recherche administrateur effectuée par le serveur sur toute la base. */
  getAllAdmin(page = 0, size = 20, filtres: FiltresUtilisateurs = {}): Observable<Page<Utilisateur>> {
    let params = new HttpParams().set('page', page).set('size', size);
    for (const [cle, valeur] of Object.entries(filtres)) {
      if (valeur !== undefined && valeur !== null && String(valeur).trim() !== '') params = params.set(cle, String(valeur).trim());
    }
    return this.http.get<Page<Utilisateur>>(`${this.base}/admin/tous`, { params });
  }

  /** Noms et notes de plusieurs utilisateurs (sans email ni téléphone). */
  getProfilsPublics(ids: number[]): Observable<ProfilPublic[]> {
    return this.http.get<ProfilPublic[]>(`${this.base}/profils/publics`, { params: new HttpParams().set('ids', ids.join(',')) });
  }

  remplacerContactsUrgence(id: number, contactsUrgence: string[]): Observable<Utilisateur> {
    return this.http.put<Utilisateur>(`${this.base}/profil/${id}/contacts-urgence`, { contactsUrgence });
  }

  // ─── Documents KYC ─────────────────────────────────────────────────────────
  getDocuments(utilisateurId: number): Observable<DocumentKyc[]> {
    return this.http.get<DocumentKyc[]>(`${this.base}/documents/${utilisateurId}`);
  }

  deposerDocument(utilisateurId: number, type: TypeDocument, fichier: File, numero?: string): Observable<DocumentKyc> {
    const data = new FormData();
    data.append('type', type);
    if (numero) data.append('numero', numero);
    data.append('fichier', fichier, fichier.name);
    return this.http.post<DocumentKyc>(`${this.base}/documents/${utilisateurId}`, data);
  }

  /** Le fichier est protégé : on le récupère avec le jeton puis on l'affiche via une URL locale. */
  telechargerDocument(utilisateurId: number, docId: number): Observable<Blob> {
    return this.http.get(`${this.base}/documents/${utilisateurId}/${docId}/fichier`, { responseType: 'blob' });
  }

  deciderDocument(docId: number, valide: boolean, motif?: string): Observable<DocumentKyc> {
    return this.http.put<DocumentKyc>(`${this.base}/admin/documents/${docId}`, { valide, motif });
  }

  changerStatut(id: number, statut: string): Observable<Utilisateur> {
    return this.http.put<Utilisateur>(`${this.base}/admin/${id}/statut`, { statut });
  }

  validerKyc(id: number): Observable<Utilisateur> {
    return this.http.put<Utilisateur>(`${this.base}/admin/${id}/valider-kyc`, {});
  }
}
