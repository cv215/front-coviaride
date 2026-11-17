import { Component, DestroyRef, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** Identifiant du compte « Service client » côté chat. */
const SUPPORT_ID = 1;

interface Conversation {
  /** Identifiant de la conversation côté serveur (null tant qu'aucun message n'a été échangé). */
  id: number | null;
  contactId: number;
  nom: string;
  sousTitre: string;
  support: boolean;
}

interface Message { id: number; contenu: string; moi: boolean; heure: string; }

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss'
})
export class MessagesComponent implements OnInit {
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('fil') fil?: ElementRef<HTMLElement>;

  conversations = signal<Conversation[]>([]);
  activeContactId = signal<number>(SUPPORT_ID);
  messages = signal<Message[]>([]);
  chargementMessages = signal(false);
  envoiEnCours = signal(false);
  /** Sur mobile, on affiche soit la liste, soit le fil. */
  vueFil = signal(false);
  nouveauMessage = '';

  active = computed(() => this.conversations().find(c => c.contactId === this.activeContactId()) ?? null);

  ngOnInit() {
    const avec = Number(this.route.snapshot.queryParamMap.get('avec'));
    if (avec > 0) {
      this.activeContactId.set(avec);
      this.vueFil.set(true);
    }
    this.chargerConversations();

    // Rafraîchissement léger du fil ouvert
    interval(15000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!document.hidden) this.chargerMessages(true);
    });
  }

  private chargerConversations() {
    const u = this.auth.currentUser();
    if (!u) return;
    this.http.get<any[]>(`${environment.apiUrl}/chat/conversations/${u.compteId}`).subscribe({
      next: convs => this.construireListe(convs ?? [], u.compteId),
      error: () => this.construireListe([], u.compteId)
    });
  }

  private construireListe(convs: any[], userId: number) {
    const liste: Conversation[] = [];
    const support = convs.find(c => c.participant1Id === SUPPORT_ID || c.participant2Id === SUPPORT_ID);
    liste.push({ id: support?.id ?? null, contactId: SUPPORT_ID, nom: 'Service client', sousTitre: 'Support Coviaride', support: true });

    for (const c of convs) {
      const autre = c.participant1Id === userId ? c.participant2Id : c.participant1Id;
      if (autre === SUPPORT_ID || autre === userId) continue;
      liste.push({ id: c.id, contactId: autre, nom: `Chauffeur #${autre}`, sousTitre: 'Conversation trajet', support: false });
    }

    // Contact demandé via ?avec= mais sans conversation existante : on prépare un fil vide.
    const demande = this.activeContactId();
    if (!liste.some(c => c.contactId === demande)) {
      liste.push({ id: null, contactId: demande, nom: `Chauffeur #${demande}`, sousTitre: 'Nouveau message', support: false });
    }

    this.conversations.set(liste);
    this.enrichirNoms(liste);
    this.chargerMessages();
  }

  /** Remplace « Chauffeur #id » par le vrai nom du chauffeur. */
  private enrichirNoms(liste: Conversation[]) {
    for (const c of liste.filter(x => !x.support)) {
      this.http.get<any>(`${environment.apiUrl}/utilisateurs/profil/${c.contactId}`).subscribe({
        next: p => {
          const nom = [p?.prenom, p?.nom].filter(Boolean).join(' ').trim();
          if (nom) this.conversations.update(arr => arr.map(x => x.contactId === c.contactId ? { ...x, nom } : x));
        },
        error: () => {}
      });
    }
  }

  ouvrir(c: Conversation) {
    this.activeContactId.set(c.contactId);
    this.vueFil.set(true);
    this.messages.set([]);
    this.chargerMessages();
  }

  chargerMessages(silencieux = false) {
    const u = this.auth.currentUser();
    const conv = this.active();
    if (!u || !conv || conv.id === null) {
      if (!silencieux) this.messages.set([]);
      return;
    }
    if (!silencieux) this.chargementMessages.set(true);
    const convId = conv.id;
    this.http.get<any>(`${environment.apiUrl}/chat/conversations/${convId}/messages?size=50`).subscribe({
      next: res => {
        if (this.active()?.id !== convId) return; // l'utilisateur a changé de conversation entre-temps
        const liste: Message[] = (res?.content || []).map((m: any) => ({
          id: m.id,
          contenu: m.contenu,
          moi: m.expediteurId === u.compteId,
          heure: new Date(m.dateEnvoi).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }));
        // Le serveur renvoie souvent les plus récents d'abord : on remet dans l'ordre chronologique.
        const ordonnes = this.trierChrono(res?.content || [], liste);
        const avant = this.messages().length;
        this.messages.set(ordonnes);
        this.chargementMessages.set(false);
        if (!silencieux || ordonnes.length !== avant) this.defilerEnBas();
      },
      error: () => {
        this.chargementMessages.set(false);
        if (!silencieux) this.messages.set([]);
      }
    });
  }

  private trierChrono(brut: any[], liste: Message[]): Message[] {
    if (brut.length < 2) return liste;
    const premier = new Date(brut[0].dateEnvoi).getTime();
    const dernier = new Date(brut[brut.length - 1].dateEnvoi).getTime();
    return premier > dernier ? [...liste].reverse() : liste;
  }

  envoyer() {
    const contenu = this.nouveauMessage.trim();
    const u = this.auth.currentUser();
    const conv = this.active();
    if (!contenu || !u || !conv || this.envoiEnCours()) return;

    this.envoiEnCours.set(true);
    this.http.post<any>(`${environment.apiUrl}/chat/envoyer`, {
      expediteurId: u.compteId,
      destinataireId: conv.contactId,
      contenu,
      trajetId: null
    }).subscribe({
      next: res => {
        this.envoiEnCours.set(false);
        this.nouveauMessage = '';
        this.messages.update(arr => [...arr, {
          id: res?.id ?? Date.now(),
          contenu,
          moi: true,
          heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }]);
        this.defilerEnBas();
        // Première conversation avec ce contact : on récupère son identifiant.
        if (conv.id === null) this.chargerConversations();
      },
      error: err => {
        this.envoiEnCours.set(false);
        // Le message n'est pas ajouté au fil : il n'a pas été envoyé.
        this.toast.error("Message non envoyé", err);
      }
    });
  }

  initiales(nom: string): string {
    return nom.split(' ').filter(Boolean).slice(0, 2).map(p => p.charAt(0)).join('').toUpperCase() || '?';
  }

  private defilerEnBas() {
    setTimeout(() => {
      const el = this.fil?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
