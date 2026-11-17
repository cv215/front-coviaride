import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Trajet, TrajetRequest, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class TrajetService {
  private base = `${environment.apiUrl}/trajets`;

  constructor(private http: HttpClient) {}

  rechercher(villeDepart: string, villeArrivee: string, date: string, nbPlaces = 1, page = 0): Observable<Page<Trajet>> {
    const params = new HttpParams()
      .set('villeDepart', villeDepart).set('villeArrivee', villeArrivee)
      .set('date', date).set('nbPlaces', nbPlaces).set('page', page);
    return this.http.get<Page<Trajet>>(`${this.base}/recherche`, { params });
  }

  getById(id: number): Observable<Trajet> {
    return this.http.get<Trajet>(`${this.base}/${id}`);
  }

  creer(chauffeurId: number, req: TrajetRequest): Observable<Trajet> {
    return this.http.post<Trajet>(`${this.base}/chauffeur/${chauffeurId}`, req);
  }

  annuler(id: number, chauffeurId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/chauffeur/${chauffeurId}/annuler`);
  }

  demarrer(id: number, chauffeurId: number): Observable<Trajet> {
    return this.http.post<Trajet>(`${this.base}/${id}/chauffeur/${chauffeurId}/demarrer`, {});
  }

  terminer(id: number, chauffeurId: number): Observable<Trajet> {
    return this.http.post<Trajet>(`${this.base}/${id}/chauffeur/${chauffeurId}/terminer`, {});
  }

  getMesTrajets(chauffeurId: number, page = 0): Observable<Page<Trajet>> {
    return this.http.get<Page<Trajet>>(`${this.base}/chauffeur/${chauffeurId}/mes-trajets?page=${page}`);
  }

  getDernierePosition(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}/position`);
  }

  updatePosition(id: number, payload: {
    latitude: number;
    longitude: number;
    vitesse: number;
    positionActuelle?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/tracking`, payload);
  }

  getAllAdmin(page = 0): Observable<Page<Trajet>> {
    return this.http.get<Page<Trajet>>(`${this.base}/admin/tous?page=${page}`);
  }
}
