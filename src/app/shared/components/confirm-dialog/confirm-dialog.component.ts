import { Component, ElementRef, HostListener, effect, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
@if (svc.state(); as s) {
  <div class="cd-overlay" (click)="annuler()">
    <div class="cd-modal" role="dialog" aria-modal="true" [attr.aria-label]="s.title" (click)="$event.stopPropagation()">
      <h3>{{ s.title }}</h3>
      @if (s.message) { <p>{{ s.message }}</p> }
      @if (s.input; as inp) {
        <label class="cd-label">{{ inp.label }}</label>
        @if (inp.type === 'textarea') {
          <textarea #champ class="cd-input" rows="3" [(ngModel)]="valeur" [placeholder]="inp.placeholder ?? ''"></textarea>
        } @else {
          <input #champ class="cd-input" [type]="inp.type ?? 'text'" [(ngModel)]="valeur" [placeholder]="inp.placeholder ?? ''" (keydown.enter)="valider()">
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
    .cd-modal { width: min(460px, 100%); background: #161a22; color: #eef1f8; border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 1.4rem; box-shadow: 0 24px 60px rgba(0,0,0,.45); }
    h3 { margin: 0 0 .5rem; font-size: 1.15rem; color: #fff; }
    p { margin: 0 0 1rem; color: #aeb6c2; line-height: 1.5; }
    .cd-label { display: block; font-size: .85rem; color: #aeb6c2; margin-bottom: .35rem; }
    .cd-input { width: 100%; background: #0f1116; color: #eef1f8; border: 1px solid rgba(255,255,255,.14); border-radius: 10px; padding: .65rem .8rem; font: inherit; resize: vertical; }
    .cd-input:focus { outline: 2px solid rgba(215,177,90,.6); border-color: transparent; }
    .cd-err { color: #fca5a5; font-size: .8rem; margin-top: .3rem; }
    .cd-actions { display: flex; justify-content: flex-end; gap: .6rem; margin-top: 1.2rem; }
    .cd-btn { border: none; border-radius: 999px; padding: .6rem 1.2rem; font-weight: 700; cursor: pointer; background: #d7b15a; color: #101720; }
    .cd-btn:disabled { opacity: .5; cursor: not-allowed; }
    .cd-ghost { background: rgba(255,255,255,.08); color: #eef1f8; }
    .cd-danger { background: #ef4444; color: #fff; }
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
