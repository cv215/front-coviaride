import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EtatPush = 'non-supporte' | 'a-activer' | 'refuse' | 'actif';

/**
 * Notifications Web Push : une fois activées, le téléphone ou l'ordinateur affiche
 * les nouvelles annonces et demandes de voyage même quand CoviaRide est fermé.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private base = `${environment.apiUrl}/notifications/push`;
  readonly etat = signal<EtatPush>(this.etatInitial());

  constructor(private http: HttpClient) {}

  get supporte(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  private etatInitial(): EtatPush {
    if (!this.supporte) return 'non-supporte';
    if (Notification.permission === 'denied') return 'refuse';
    return 'a-activer';
  }

  /** À l'ouverture de session : si l'utilisateur avait déjà accepté, on ré-enregistre ce navigateur sans rien demander. */
  async synchroniser(): Promise<void> {
    if (!this.supporte || Notification.permission !== 'granted') return;
    try { await this.abonner(); } catch { /* serveur push indisponible : on réessaiera à la prochaine visite */ }
  }

  /** Clic sur « Activer » : demande l'autorisation puis abonne ce navigateur. */
  async activer(): Promise<EtatPush> {
    if (!this.supporte) return this.etat();
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      this.etat.set(permission === 'denied' ? 'refuse' : 'a-activer');
      return this.etat();
    }
    await this.abonner();
    return this.etat();
  }

  /** À la déconnexion : ce navigateur ne doit plus recevoir les notifications de ce compte. */
  async desactiver(): Promise<void> {
    if (!this.supporte) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) return;
      await firstValueFrom(this.http.post(`${this.base}/desabonnement`, { endpoint: sub.endpoint })).catch(() => {});
      await sub.unsubscribe();
    } catch { /* rien à faire */ }
    this.etat.set(this.etatInitial());
  }

  private async abonner(): Promise<void> {
    const reg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    const { clePublique } = await firstValueFrom(this.http.get<{ clePublique: string }>(`${this.base}/cle-publique`));
    let sub = await reg.pushManager.getSubscription();
    if (sub && !this.memeCle(sub, clePublique)) { await sub.unsubscribe(); sub = null; }
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.versOctets(clePublique) });
    }
    await firstValueFrom(this.http.post(`${this.base}/abonnement`, sub.toJSON()));
    this.etat.set('actif');
  }

  private memeCle(sub: PushSubscription, cle: string): boolean {
    const actuelle = sub.options?.applicationServerKey;
    if (!actuelle) return true;
    const a = new Uint8Array(actuelle), b = this.versOctets(cle);
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }

  private versOctets(base64url: string): Uint8Array<ArrayBuffer> {
    const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
    const brut = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(new ArrayBuffer(brut.length));
    for (let i = 0; i < brut.length; i++) out[i] = brut.charCodeAt(i);
    return out;
  }
}
