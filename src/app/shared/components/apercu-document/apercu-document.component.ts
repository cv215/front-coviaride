import { Component, HostListener, OnDestroy, OnInit, inject, input, output, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { DocumentKyc } from '../../../core/models';
import { IconComponent } from '../icon/icon.component';

export const LIBELLES_DOCUMENTS: Record<string, string> = {
  PERMIS: 'Permis de conduire',
  CNI: "Pièce d'identité (CNI)",
  ASSURANCE: 'Assurance du véhicule',
  CARTE_GRISE: 'Carte grise',
};

/**
 * Aperçu d'un justificatif KYC. Le fichier est protégé par le jeton : il est téléchargé
 * puis affiché via une URL locale (blob), révoquée à la fermeture.
 */
@Component({
  selector: 'lx-apercu-document',
  standalone: true,
  imports: [IconComponent],
  template: `
<div class="lx-overlay" (click)="fermer.emit()">
  <div class="viewer" role="dialog" aria-modal="true" [attr.aria-label]="titre()" (click)="$event.stopPropagation()">
    <header class="viewer-head">
      <div class="min-w-0">
        <div class="viewer-title">{{ titre() }}</div>
        <div class="lx-muted" style="font-size:.75rem">{{ doc().nomFichier }}</div>
      </div>
      <div class="lx-row" style="gap:.4rem;flex-wrap:nowrap">
        @if (url()) {
          <a class="lx-btn lx-btn-secondary lx-btn-sm" [href]="urlBrute" [attr.download]="doc().nomFichier || 'document'"><lx-icon name="download" /> Télécharger</a>
        }
        <button class="lx-btn lx-btn-ghost lx-btn-sm" (click)="fermer.emit()" aria-label="Fermer"><lx-icon name="x" /></button>
      </div>
    </header>
    <div class="viewer-body">
      @if (erreur()) {
        <div class="lx-empty" style="border:0"><lx-icon name="alert" /><p>{{ erreur() }}</p></div>
      } @else if (!url()) {
        <div class="lx-empty" style="border:0"><lx-icon name="refresh" class="lx-spin" /><p>Chargement du document…</p></div>
      } @else if (estPdf()) {
        <iframe [src]="url()" title="Document PDF"></iframe>
      } @else {
        <img [src]="url()" [alt]="titre()" />
      }
    </div>
  </div>
</div>
  `,
  styles: [`
    .min-w-0 { min-width: 0; }
    .viewer { width: min(900px, 100%); height: min(88vh, 900px); display: flex; flex-direction: column;
      background: var(--lx-popover); border: 1px solid var(--lx-border); border-radius: var(--lx-r-lg); overflow: hidden; animation: lx-rise 0.2s ease-out; }
    .viewer-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.85rem 1rem 0.85rem 1.25rem; border-bottom: 1px solid var(--lx-border); }
    .viewer-title { font-family: var(--lx-font-display); font-size: 1.1rem; }
    .viewer-body { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; background: var(--lx-bg);
      img { max-width: 100%; max-height: 100%; object-fit: contain; }
      iframe { width: 100%; height: 100%; border: 0; background: #fff; } }
  `]
})
export class ApercuDocumentComponent implements OnInit, OnDestroy {
  private userSvc = inject(UtilisateurService);
  private sanitizer = inject(DomSanitizer);

  utilisateurId = input.required<number>();
  doc = input.required<DocumentKyc>();
  fermer = output<void>();

  url = signal<SafeResourceUrl | null>(null);
  erreur = signal('');
  urlBrute = '';

  titre() { return LIBELLES_DOCUMENTS[this.doc().typeDocument] ?? this.doc().typeDocument; }
  estPdf() { return (this.doc().typeContenu ?? '').includes('pdf'); }

  ngOnInit() {
    this.userSvc.telechargerDocument(this.utilisateurId(), this.doc().id).subscribe({
      next: blob => {
        this.urlBrute = URL.createObjectURL(blob);
        // URL locale (blob:) créée à partir d'un fichier contrôlé par le serveur.
        this.url.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.urlBrute));
      },
      error: () => this.erreur.set('Impossible de charger ce document.')
    });
  }

  @HostListener('document:keydown.escape')
  echap() { this.fermer.emit(); }

  ngOnDestroy() {
    if (this.urlBrute) URL.revokeObjectURL(this.urlBrute);
  }
}
