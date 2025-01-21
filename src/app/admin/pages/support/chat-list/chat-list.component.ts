import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { map } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { take } from 'rxjs/operators';

interface Chat {
  id: string;
  userId: string;
  userName: string;
  createdAt: Date;
  status: 'active' | 'resolved';
}

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTooltipModule
  ],
  template: `
    <div class="admin-content">
      <div class="admin-header">
        <div class="header-title">
          <h1>Support Anfragen</h1>
          <p>Verwalten Sie hier alle Support-Anfragen</p>
        </div>
      </div>

      <mat-card>
        <mat-card-content>
          <div class="chat-list">
            <div class="empty-state" *ngIf="(activeChats$ | async)?.length === 0">
              <mat-icon>chat_bubble_outline</mat-icon>
              <p>Keine aktiven Support-Anfragen</p>
            </div>
            
            <div class="chat-item" *ngFor="let chat of activeChats$ | async"
                 (click)="openChat(chat.id)">
              <div class="chat-info">
                <div class="user-details">
                  <span class="user-name">{{chat.userName || 'Unbekannter Benutzer'}}</span>
                  <span class="date">{{chat.createdAt | date:'dd.MM.yyyy HH:mm'}}</span>
                </div>
              </div>
              <button mat-icon-button color="warn" 
                      (click)="resolveChat(chat.id, $event)"
                      matTooltip="Chat beenden">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .admin-content {
        padding: var(--spacing-xl);
      }

      .admin-header {
        margin-bottom: var(--spacing-xl);

        .header-title {
          h1 {
            font-size: 2rem;
            font-weight: 600;
            margin: 0 0 var(--spacing-xs);
            color: var(--color-accent);
          }

          p {
            color: var(--color-text-secondary);
            margin: 0;
          }
        }
      }

      mat-card {
        background: var(--color-background-light);
        border: 1px solid var(--color-border);
      }

      .chat-list {
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--spacing-xl);
          color: var(--color-text-secondary);

          mat-icon {
            font-size: 48px;
            width: 48px;
            height: 48px;
            margin-bottom: var(--spacing-md);
          }

          p {
            font-size: 1.1rem;
            margin: 0;
          }
        }

        .chat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--color-border);
          cursor: pointer;
          transition: background-color 0.2s ease;

          &:hover {
            background: var(--color-background-hover);
          }

          &:last-child {
            border-bottom: none;
          }

          .chat-info {
            .user-details {
              display: flex;
              flex-direction: column;
              gap: var(--spacing-xs);

              .user-name {
                font-size: 1.1rem;
                font-weight: 500;
                color: var(--color-text);
              }

              .date {
                color: var(--color-text-secondary);
                font-size: 0.9rem;
              }
            }
          }
        }
      }
    `
  ]
})
export class ChatListComponent implements OnInit {
  activeChats$: Observable<Chat[]> = new Observable<Chat[]>();

  constructor(
    private firestore: AngularFirestore,
    private router: Router,
    private authService: AuthService
  ) {
    this.authService.user$.pipe(take(1)).subscribe(admin => {
      if (admin) {
        this.activeChats$ = this.firestore
          .collection<Chat>('chats', ref => 
            ref.where('adminEmail', '==', admin.email)
               .where('status', '==', 'active')
               .orderBy('createdAt', 'desc'))
          .valueChanges({ idField: 'id' })
          .pipe(
            map(chats => chats.map(chat => ({
              ...chat,
              createdAt: (chat.createdAt as any).toDate()
            })))
          );
      }
    });
  }

  ngOnInit() {
    // Implementierung der OnInit-Schnittstelle
  }

  openChat(chatId: string) {
    this.router.navigate(['/admin/support', chatId]);
  }

  async resolveChat(chatId: string, event: Event) {
    event.stopPropagation();
    
    try {
      // Chat als gelöst markieren
      await this.firestore.collection('chats').doc(chatId).delete();
      
      // Alle zugehörigen Nachrichten löschen
      const messages = await this.firestore
        .collection(`chats/${chatId}/messages`)
        .get()
        .toPromise();
      
      const batch = this.firestore.firestore.batch();
      messages?.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error resolving chat:', error);
    }
  }
}