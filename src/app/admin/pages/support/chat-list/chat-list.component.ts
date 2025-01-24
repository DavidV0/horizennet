import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { map, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';

interface Chat {
  id: string;
  userId: string;
  userName: string;
  createdAt: Date;
  status: 'active' | 'resolved';
}

interface FirestoreMessage {
  text: string;
  timestamp: any;
  senderId: string;
  senderName: string;
  status: 'sent' | 'delivered' | 'read';
}

interface ExtendedChat extends Chat {
  unreadCount: number;
  lastMessage?: string;
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

      <div class="chats-container">
        <div class="empty-state" *ngIf="(activeChats$ | async)?.length === 0">
          <mat-icon>chat_bubble_outline</mat-icon>
          <p>Keine aktiven Support-Anfragen</p>
        </div>
        
        <div class="chat-list">
          <div class="chat-item" *ngFor="let chat of activeChats$ | async"
               (click)="openChat(chat.id)">
            <div class="chat-info">
              <div class="user-details">
                <span class="user-name">{{chat.userName || 'Unbekannter Benutzer'}}</span>
                <span class="date">{{chat.createdAt | date:'dd.MM.yyyy HH:mm'}}</span>
              </div>
              <p class="last-message" *ngIf="chat.lastMessage">{{chat.lastMessage}}</p>
            </div>

            <div class="chat-actions">
              <div class="unread-badge" *ngIf="chat.unreadCount > 0">
                {{chat.unreadCount}}
              </div>
              <button mat-button class="solve-button" 
                      (click)="markAsSolved(chat.id, $event)"
                      matTooltip="Chat als gelöst markieren">
                <mat-icon>check_circle</mat-icon>
                Als gelöst markieren
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-content {
      padding: var(--spacing-xl);
    }

    .admin-header {
      margin-bottom: var(--spacing-xl);

      .header-title {
        h1 {
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-bold);
          margin: 0 0 var(--spacing-xs);
          background: linear-gradient(135deg, var(--color-accent) 0%, #FFC740 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        p {
          color: var(--color-text-secondary);
          margin: 0;
        }
      }
    }

    .chats-container {
      background: var(--color-background-light);
      border-radius: 12px;
      border: 1px solid var(--color-border);
      overflow: hidden;
    }

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
        color: var(--color-accent);
      }

      p {
        font-size: 1.1rem;
        margin: 0;
      }
    }

    .chat-list {
      .chat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-md) var(--spacing-lg);
        border-bottom: 1px solid var(--color-border);
        cursor: pointer;
        transition: all 0.3s ease;
        background: rgba(255, 255, 255, 0.02);

        &:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-1px);
        }

        &:last-child {
          border-bottom: none;
        }

        .chat-info {
          flex: 1;

          .user-details {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            margin-bottom: var(--spacing-xs);

            .user-name {
              font-size: var(--font-size-lg);
              font-weight: var(--font-weight-medium);
              color: var(--color-white);
            }

            .date {
              color: var(--color-text-secondary);
              font-size: var(--font-size-sm);
            }
          }

          .last-message {
            color: var(--color-text-secondary);
            margin: 0;
            font-size: var(--font-size-md);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 500px;
          }
        }

        .chat-actions {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);

          .unread-badge {
            background: var(--color-accent);
            color: var(--color-primary);
            font-weight: var(--font-weight-bold);
            padding: var(--spacing-xs) var(--spacing-sm);
            border-radius: 12px;
            min-width: 24px;
            text-align: center;
          }

          .solve-button {
            color: var(--color-accent);
            border: 1px solid var(--color-accent);
            border-radius: 20px;
            padding: var(--spacing-xs) var(--spacing-md);
            transition: all 0.3s ease;

            mat-icon {
              margin-right: var(--spacing-xs);
            }

            &:hover {
              background: var(--color-accent);
              color: var(--color-primary);
            }
          }
        }
      }
    }
  `]
})
export class ChatListComponent implements OnInit {
  activeChats$: Observable<ExtendedChat[]> = new Observable<ExtendedChat[]>();

  constructor(
    private firestore: AngularFirestore,
    private router: Router,
    private authService: AuthService
  ) {
    this.authService.user$.pipe(take(1)).subscribe(admin => {
      if (admin) {
        this.activeChats$ = this.firestore
          .collection<Chat>('chats', ref => 
            ref.where('status', '==', 'active')
               .orderBy('createdAt', 'desc'))
          .valueChanges({ idField: 'id' })
          .pipe(
            switchMap(chats => {
              const chatsWithMeta = chats.map(async chat => {
                const messagesRef = this.firestore.collection(`chats/${chat.id}/messages`);
                
                // Get unread count
                const unreadSnapshot = await messagesRef
                  .ref.where('status', '==', 'sent')
                  .get();
                
                // Get last message
                const lastMessageSnapshot = await messagesRef
                  .ref.orderBy('timestamp', 'desc')
                  .limit(1)
                  .get();

                const lastMessageData = lastMessageSnapshot.docs[0]?.data() as FirestoreMessage | undefined;
                const lastMessage = lastMessageData?.text || '';
                
                return {
                  ...chat,
                  createdAt: (chat.createdAt as any).toDate(),
                  unreadCount: unreadSnapshot.size,
                  lastMessage
                } as ExtendedChat;
              });

              return Promise.all(chatsWithMeta);
            })
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

  async markAsSolved(chatId: string, event: Event) {
    event.stopPropagation();
    
    try {
      const chatRef = this.firestore.collection('chats').doc(chatId);
      
      // Add solved message
      await chatRef.collection('messages').add({
        text: 'Der Support-Chat wurde geschlossen, da Ihr Anliegen gelöst wurde. Vielen Dank für Ihre Anfrage!',
        senderId: 'support',
        senderName: 'Support',
        timestamp: new Date(),
        status: 'sent',
        isSystemMessage: true
      });

      // Mark chat as solved
      await chatRef.update({
        status: 'solved',
        solvedAt: new Date()
      });

      // Delete chat after a delay to ensure the message is received
      setTimeout(async () => {
        await chatRef.delete();
      }, 5000);
      
    } catch (error) {
      console.error('Error marking chat as solved:', error);
    }
  }
}