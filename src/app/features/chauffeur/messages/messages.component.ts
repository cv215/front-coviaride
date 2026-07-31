import { Component, OnInit, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.prod';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss'
})
export class MessagesComponent implements OnInit {
  convActive       = signal<'support'|'client'>('support');
    clientActif   = signal(false);
    msgsNonLusClient = signal(0);
    messages         = signal<any[]>([]);
    nouveauMessage   = '';
  
    constructor(
      private auth: AuthService, 
      private http: HttpClient
    ) {}
  
    ngOnInit() {
      this.chargerMessages();
    }
  
    chargerMessages() {
      // Messages de démonstration — à remplacer par appel API service-chat
      this.messages.set([
        { id: 1, contenu: 'Bonjour, comment puis-je vous aider ?',
          moi: false, heure: '09:00' },
      ]);
    }
  
    envoyer() {
      if (!this.nouveauMessage.trim()) return;
      const u = this.auth.currentUser();
      if (!u) return;
  
      // Appel API service-chat
      this.http.post(`${environment.apiUrl}/chat/envoyer`, {
        expediteurId:   u.compteId,
        destinataireId: this.convActive() === 'support' ? 1 : 999,
        contenu:        this.nouveauMessage
      }).subscribe({
        next: (msg: any) => {
          this.messages.update(arr => [...arr, {
            id:      Date.now(),
            contenu: this.nouveauMessage,
            moi:     true,
            heure:   new Date().toLocaleTimeString('fr', {
                       hour:'2-digit', minute:'2-digit'})
          }]);
          this.nouveauMessage = '';
        },
        error: () => {
          // Affichage local si API indisponible
          this.messages.update(arr => [...arr, {
            id:      Date.now(),
            contenu: this.nouveauMessage,
            moi:     true,
            heure:   new Date().toLocaleTimeString('fr', {
                       hour:'2-digit', minute:'2-digit'})
          }]);
          this.nouveauMessage = '';
        }
      });
    }
}
