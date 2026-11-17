import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

/** Notifications non bloquantes (remplacent les alert() du navigateur). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  show(type: ToastType, title: string, message?: string, durationMs = 4500): void {
    const id = ++this.seq;
    this.toasts.update(list => [...list.slice(-3), { id, type, title, message }]);
    if (durationMs > 0) setTimeout(() => this.dismiss(id), durationMs);
  }

  success(title: string, message?: string) { this.show('success', title, message); }
  info(title: string, message?: string)    { this.show('info', title, message); }
  warning(title: string, message?: string) { this.show('warning', title, message, 6000); }
  error(title: string, err?: unknown)      { this.show('error', title, err === undefined ? undefined : messageErreur(err), 7000); }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}

/** Extrait un message lisible d'une erreur HTTP renvoyée par les microservices. */
export function messageErreur(err: unknown, defaut = 'Une erreur est survenue. Réessayez.'): string {
  if (typeof err === 'string') return err;
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Serveur injoignable. Vérifiez votre connexion ou que les services sont démarrés.';
    const body: any = err.error;
    if (body && typeof body === 'object') {
      if (body.details && typeof body.details === 'object') {
        const d = Object.values(body.details).filter(Boolean);
        if (d.length) return d.join(' · ');
      }
      if (body.message && body.message !== 'Erreur interne') return body.message;
      if (body.error && typeof body.error === 'string') return body.error;
    }
    if (typeof body === 'string' && body.length < 200) return body;
    const header = err.headers?.get('X-Error-Message');
    if (header) return header;
    if (err.status === 401) return 'Session expirée, reconnectez-vous.';
    if (err.status === 403) return "Vous n'avez pas les droits pour cette action.";
    if (err.status === 404) return 'Ressource introuvable.';
    if (err.status >= 500) return 'Le service rencontre un problème. Réessayez dans un instant.';
  }
  return defaut;
}

/** Montant en francs CFA, ex : 12 500 FCFA */
export function fcfa(montant: number | null | undefined): string {
  const n = Number(montant ?? 0);
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(isFinite(n) ? n : 0)} FCFA`;
}
