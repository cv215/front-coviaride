import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Affiche un champ de saisie ; la valeur saisie est renvoyée. */
  input?: { label: string; placeholder?: string; type?: 'text' | 'password' | 'textarea'; minLength?: number; value?: string };
}

export interface ConfirmState extends ConfirmOptions {
  resolve: (value: string | boolean | null) => void;
}

/** Boîte de dialogue de confirmation non bloquante (remplace confirm()/prompt()). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state = signal<ConfirmState | null>(null);

  /** Résout true (ou la valeur saisie si `input`) quand l'utilisateur confirme, false/null sinon. */
  ask(opts: ConfirmOptions & { input: NonNullable<ConfirmOptions['input']> }): Promise<string | null>;
  ask(opts: ConfirmOptions): Promise<boolean>;
  ask(opts: ConfirmOptions): Promise<any> {
    this.state()?.resolve(opts.input ? null : false);
    return new Promise(resolve => this.state.set({ ...opts, resolve }));
  }

  close(value: string | boolean | null) {
    const s = this.state();
    if (!s) return;
    this.state.set(null);
    s.resolve(value);
  }
}
