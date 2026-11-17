import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Utilisateur, Vehicule, Page } from '../models';

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

  getAllAdmin(page = 0, size = 20): Observable<Page<Utilisateur>> {
    return this.http.get<Page<Utilisateur>>(`${this.base}/admin/tous?page=${page}&size=${size}`);
  }

  changerStatut(id: number, statut: string): Observable<Utilisateur> {
    return this.http.put<Utilisateur>(`${this.base}/admin/${id}/statut`, { statut });
  }

  validerKyc(id: number): Observable<Utilisateur> {
    return this.http.put<Utilisateur>(`${this.base}/admin/${id}/valider-kyc`, {});
  }
}
