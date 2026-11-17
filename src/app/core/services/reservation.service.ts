import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reservation, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private base = `${environment.apiUrl}/reservations`;

  constructor(private http: HttpClient) {}

  reserver(passagerId: number, trajetId: number, chauffeurId: number, nombrePlaces: number, pointArret?: string, prixParPlace?: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/passager/${passagerId}`,
      { trajetId, chauffeurId, nombrePlaces, pointArret, prixParPlace });
  }

  annuler(rezId: number, passagerId: number): Observable<Reservation> {
    return this.http.delete<Reservation>(`${this.base}/${rezId}/passager/${passagerId}`);
  }

  confirmerEmbarquement(rezId: number, passagerId: number, montantTotal: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/${rezId}/passager/${passagerId}/embarquement`, { montantTotal });
  }

  confirmerArrivee(rezId: number, passagerId: number, montantTotal: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/${rezId}/passager/${passagerId}/arrivee`, { montantTotal });
  }

  getMesReservations(passagerId: number, page = 0, size = 50): Observable<Page<Reservation>> {
    return this.http.get<Page<Reservation>>(`${this.base}/passager/${passagerId}?page=${page}&size=${size}`);
  }

  accepter(rezId: number, chauffeurId: number, prixParPlace: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/${rezId}/chauffeur/${chauffeurId}/accepter`, { prixParPlace });
  }

  refuser(rezId: number, chauffeurId: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/${rezId}/chauffeur/${chauffeurId}/refuser`, {});
  }

  getEnAttente(chauffeurId: number, page = 0): Observable<Page<Reservation>> {
    return this.http.get<Page<Reservation>>(`${this.base}/chauffeur/${chauffeurId}/en-attente?page=${page}`);
  }

  getPassagersTrajet(trajetId: number): Observable<Page<Reservation>> {
    return this.http.get<Page<Reservation>>(`${this.base}/trajet/${trajetId}/passagers`);
  }
}
