import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss'
})
export class MessagesComponent implements OnInit {
  convActive = signal<'support' | 'chauffeur'>('support');
  chauffeurActif = signal(false);
  msgsNonLusChauffeur = signal(0);
  messages = signal<any[]>([]);
  nouveauMessage = '';
  activeConversationId = signal<number | null>(null);
  activeContactId = signal<number | null>(null);

  constructor(
    private auth: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.chargerMessages();
  }

  private getConversationTarget(convs: any[], userId: number): any | null {
    const supportId = 1;
    if (this.convActive() === 'support') {
      return convs.find(c => c.participant1Id === supportId || c.participant2Id === supportId) ?? null;
    }

    return convs.find(c => {
      const otherId = c.participant1Id === userId ? c.participant2Id : c.participant1Id;
      return otherId !== userId && otherId !== supportId;
    }) ?? null;
  }

  chargerMessages() {
    const u = this.auth.currentUser();
    if (!u) {
      this.messages.set([]);
      this.activeConversationId.set(null);
      this.activeContactId.set(null);
      return;
    }

    this.http.get<any[]>(`${environment.apiUrl}/chat/conversations/${u.compteId}`).subscribe({
      next: convs => {
        const conversation = this.getConversationTarget(convs ?? [], u.compteId);

        if (!conversation) {
          this.messages.set([]);
          this.activeConversationId.set(null);
          this.activeContactId.set(null);
          return;
        }

        const otherId = conversation.participant1Id === u.compteId ? conversation.participant2Id : conversation.participant1Id;
        this.activeConversationId.set(conversation.id);
        this.activeContactId.set(otherId);

        this.http.get<any>(`${environment.apiUrl}/chat/conversations/${conversation.id}/messages?size=30`).subscribe({
          next: res => this.messages.set((res.content || []).map((m: any) => ({
            id: m.id,
            contenu: m.contenu,
            moi: m.expediteurId === u.compteId,
            heure: new Date(m.dateEnvoi).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })
          }))),
          error: () => this.messages.set([])
        });
      },
      error: () => this.messages.set([])
    });
  }

  envoyer() {
    if (!this.nouveauMessage.trim()) return;
    const u = this.auth.currentUser();
    if (!u) return;

    const targetId = this.activeContactId() ?? (this.convActive() === 'support' ? 1 : null);
    if (!targetId) return;

    this.http.post(`${environment.apiUrl}/chat/envoyer`, {
      expediteurId: u.compteId,
      destinataireId: targetId,
      contenu: this.nouveauMessage,
      trajetId: null
    }).subscribe({
      next: () => {
        this.messages.update(arr => [...arr, {
          id: Date.now(),
          contenu: this.nouveauMessage,
          moi: true,
          heure: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })
        }]);
        this.nouveauMessage = '';
      },
      error: () => {
        this.messages.update(arr => [...arr, {
          id: Date.now(),
          contenu: this.nouveauMessage,
          moi: true,
          heure: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })
        }]);
        this.nouveauMessage = '';
      }
    });
  }
}
