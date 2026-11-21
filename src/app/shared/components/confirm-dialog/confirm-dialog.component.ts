import { Component, ElementRef, HostListener, effect, inject, viewChild } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [],
  template: `
@if (svc.state(); as s) {
  <div class="cd-overlay" (click)="annuler()">
    <div class="cd-modal" role="dialog" aria-modal="true" [attr.aria-label]="s.title" (click)="$event.stopPropagation()">
      <h3>{{ s.title }}</h3>
      @if (s.message) { <p>{{ s.message }}</p> }
      @if (s.input; as inp) {
        <label class="cd-label">{{ inp.label }}</label>
        @if (inp.type === 'textarea') {
          <textarea #champ class="cd-input" rows="3" [value]="valeur" (input)="valeur = $any($event.target).value" [placeholder]="inp.placeholder ?? ''"></textarea>
        } @else {
          <input #champ class="cd-input" [type]="inp.type ?? 'text'" [value]="valeur" (input)="valeur = $any($event.target).value" [placeholder]="inp.placeholder ?? ''" (keydown.enter)="valider()">
        }
        @if (inp.minLength && valeur.trim().length > 0 && valeur.trim().length < inp.minLength) {
          <div class="cd-err">Minimum {{ inp.minLength }} caractères.</div>
        }
      }
      <div class="cd-actions">
        <button class="cd-btn cd-ghost" (click)="annuler()">{{ s.cancelLabel ?? 'Annuler' }}</button>
        <button class="cd-btn" [class.cd-danger]="s.danger" [disabled]="!valide()" (click)="valider()">{{ s.confirmLabel ?? 'Confirmer' }}</button>
      </div>
    </div>
  </div>
}`,
  styles: [`
    .cd-overlay { position: fixed; inset: 0; z-index: 9500; background: rgba(8,10,14,.6); display: grid; place-items: center; padding: 1rem; animation: cd-fade .15s ease-out; }
    .cd-modal { width: min(460px, 100%); background: #111318; color: #f0ece3; font-family: 'DM Sans', system-ui, sans-serif; border: 1px solid rgba(240,236,227,.086); border-radius: 16px; padding: 1.4rem; box-shadow: 0 24px 60px rgba(0,0,0,.45); }
    h3 { margin: 0 0 .5rem; font-size: 1.25rem; color: #f0ece3; font-family: 'Playfair Display', Georgia, serif; font-weight: 500; }
    p { margin: 0 0 1rem; color: #85847d; line-height: 1.55; font-size: .9rem; }
    .cd-label { display: block; font-size: .85rem; color: #85847d; margin-bottom: .35rem; }
    .cd-input { width: 100%; background: #1a1d28; color: #f0ece3; border: 1px solid transparent; border-radius: 12px; padding: .65rem .8rem; font: inherit; resize: vertical; }
    .cd-input:focus { outline: none; box-shadow: 0 0 0 3px rgba(200,146,42,.35); }
    .cd-err { color: #fca5a5; font-size: .8rem; margin-top: .3rem; }
    .cd-actions { display: flex; justify-content: flex-end; gap: .6rem; margin-top: 1.2rem; }
    .cd-btn { border: none; border-radius: 12px; padding: .7rem 1.15rem; font: inherit; font-size: .875rem; font-weight: 500; cursor: pointer; background: #c8922a; color: #08090e; }
    .cd-btn:disabled { opacity: .5; cursor: not-allowed; }
    .cd-ghost { background: #1a1d28; color: #f0ece3; }
    .cd-danger { background: #e0534a; color: #fff; }
    @media (max-width: 480px) { .cd-actions .cd-btn { flex: 1; } }
    @keyframes cd-fade { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class ConfirmDialogComponent {
  readonly svc = inject(ConfirmService);
  private champ = viewChild<ElementRef<HTMLInputElement>>('champ');
  valeur = '';

  constructor() {
    effect(() => {
      const s = this.svc.state();
      this.valeur = s?.input?.value ?? '';
      if (s?.input) setTimeout(() => this.champ()?.nativeElement.focus(), 30);
    });
  }

  valide(): boolean {
    const inp = this.svc.state()?.input;
    if (!inp) return true;
    const v = this.valeur.trim();
    return v.length > 0 && (!inp.minLength || v.length >= inp.minLength);
  }

  valider() {
    const s = this.svc.state();
    if (!s || !this.valide()) return;
    this.svc.close(s.input ? this.valeur.trim() : true);
  }

  annuler() {
    const s = this.svc.state();
    if (s) this.svc.close(s.input ? null : false);
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.annuler(); }
}
