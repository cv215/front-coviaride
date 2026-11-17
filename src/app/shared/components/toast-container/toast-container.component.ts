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
      background: #161a22; color: #eef1f8; border: 1px solid rgba(255,255,255,.1);
      border-left: 4px solid #3b82f6; border-radius: 12px; padding: .8rem .9rem;
      box-shadow: 0 12px 30px rgba(0,0,0,.35); animation: toast-in .25s ease-out;
    }
    .toast-success { border-left-color: #10b981; }
    .toast-error   { border-left-color: #ef4444; }
    .toast-warning { border-left-color: #f59e0b; }
    .toast-icon {
      flex: 0 0 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
      font-weight: 800; font-size: .85rem; background: rgba(59,130,246,.18); color: #93c5fd;
    }
    .toast-success .toast-icon { background: rgba(16,185,129,.18); color: #6ee7b7; }
    .toast-error .toast-icon   { background: rgba(239,68,68,.18); color: #fca5a5; }
    .toast-warning .toast-icon { background: rgba(245,158,11,.18); color: #fcd34d; }
    .toast-body { flex: 1; min-width: 0; }
    .toast-title { font-weight: 700; font-size: .95rem; }
    .toast-msg { color: #aeb6c2; font-size: .88rem; margin-top: .15rem; line-height: 1.4; word-break: break-word; }
    .toast-close {
      background: none; border: none; color: #aeb6c2; font-size: 1.25rem; line-height: 1;
      cursor: pointer; padding: 0 .2rem;
    }
    .toast-close:hover { color: #fff; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
  `]
})
export class ToastContainerComponent {
  readonly toast = inject(ToastService);
}
