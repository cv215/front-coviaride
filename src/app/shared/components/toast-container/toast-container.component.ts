import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
<div class="toast-stack" aria-live="polite" aria-atomic="false">
  @for (t of toast.toasts(); track t.id) {
    <div class="toast" [class]="'toast toast-' + t.type" role="status">
      <span class="toast-icon" aria-hidden="true">
        @switch (t.type) {
          @case ('success') { ✓ }
          @case ('error') { ! }
          @case ('warning') { ⚠ }
          @default { i }
        }
      </span>
      <div class="toast-body">
        <div class="toast-title">{{ t.title }}</div>
        @if (t.message) { <div class="toast-msg">{{ t.message }}</div> }
      </div>
      <button class="toast-close" (click)="toast.dismiss(t.id)" aria-label="Fermer">×</button>
    </div>
  }
</div>`,
  styles: [`
    .toast-stack {
      position: fixed; z-index: 10000; right: 1rem; bottom: 1rem;
      display: flex; flex-direction: column; gap: .6rem; width: min(380px, calc(100vw - 2rem));
      pointer-events: none;
    }
    .toast {
      pointer-events: auto; display: flex; gap: .75rem; align-items: flex-start;
      background: #111318; color: #f0ece3; font-family: 'DM Sans', system-ui, sans-serif; border: 1px solid rgba(240,236,227,.086);
      border-left: 4px solid #c8922a; border-radius: 12px; padding: .8rem .9rem;
      box-shadow: 0 12px 30px rgba(0,0,0,.35); animation: toast-in .25s ease-out;
    }
    .toast-success { border-left-color: #10b981; }
    .toast-error   { border-left-color: #ef4444; }
    .toast-warning { border-left-color: #f59e0b; }
    .toast-icon {
      flex: 0 0 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
      font-weight: 800; font-size: .85rem; background: rgba(200,146,42,.18); color: #e6c27a;
    }
    .toast-success .toast-icon { background: rgba(16,185,129,.18); color: #6ee7b7; }
    .toast-error .toast-icon   { background: rgba(239,68,68,.18); color: #fca5a5; }
    .toast-warning .toast-icon { background: rgba(245,158,11,.18); color: #fcd34d; }
    .toast-body { flex: 1; min-width: 0; }
    .toast-title { font-weight: 500; font-size: .92rem; }
    .toast-msg { color: #85847d; font-size: .88rem; margin-top: .15rem; line-height: 1.4; word-break: break-word; }
    .toast-close {
      background: none; border: none; color: #aeb6c2; font-size: 1.25rem; line-height: 1;
      cursor: pointer; padding: 0 .2rem;
    }
    .toast-close:hover { color: #fff; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
    /* Au-dessus de la barre de navigation basse sur mobile */
    @media (max-width: 767px) { .toast-stack { bottom: calc(5rem + env(safe-area-inset-bottom)); left: 1rem; right: 1rem; width: auto; } }
  `]
})
export class ToastContainerComponent {
  readonly toast = inject(ToastService);
}
