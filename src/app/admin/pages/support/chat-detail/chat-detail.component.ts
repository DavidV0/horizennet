import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../../../../shared/services/auth.service';
import { StorageService } from '../../../../shared/services/storage.service';
import { Subscription } from 'rxjs';
import { map, take } from 'rxjs/operators';

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  files?: { url: string; name: string; type: string; }[];
  status: 'sent' | 'delivered' | 'read';
}

@Component({
  selector: 'app-chat-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule
  ],
  template: `
    <div class="admin-content">
      <div class="admin-header">
        <div class="header-actions">
          <button mat-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Zurück zur Übersicht
          </button>
        </div>
        <div class="header-title">
          <h1>Chat mit {{userName}}</h1>
          <p>Support-Konversation</p>
        </div>
      </div>

      <mat-card class="chat-card">
        <mat-card-content>
          <div class="messages-container" #scrollContainer>
            <div class="message" *ngFor="let message of messages" 
                 [class.own-message]="message.senderId === currentUserId">
              <div class="message-content">
                <div class="message-header">
                  <span class="sender-name">{{message.senderName}}</span>
                  <span class="timestamp">{{message.timestamp | date:'HH:mm'}}</span>
                </div>
                <div class="message-bubble">
                  <div class="message-text">{{message.text}}</div>
                  <div class="files" *ngIf="message.files?.length">
                    <div class="file" *ngFor="let file of message.files" (click)="downloadFile(file)">
                      <mat-icon>{{getFileIcon(file.type)}}</mat-icon>
                      <span class="file-name">{{file.name}}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="input-container">
            <input #fileInput type="file" multiple hidden (change)="onFilesSelected($event)"
                   accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov">
            
            <div class="file-preview" *ngIf="selectedFilePreview">
              <div class="file-info">
                <mat-icon>{{selectedFilePreview.icon}}</mat-icon>
                <span class="file-name">{{selectedFilePreview.name}}</span>
              </div>
              <button mat-icon-button (click)="removeSelectedFile()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <button mat-icon-button (click)="fileInput.click()">
              <mat-icon>attach_file</mat-icon>
            </button>
            
            <mat-form-field appearance="outline">
              <input matInput 
                     [(ngModel)]="newMessage" 
                     placeholder="Schreiben Sie eine Nachricht..."
                     (keyup.enter)="sendMessage()">
            </mat-form-field>

            <button mat-icon-button (click)="sendMessage()" 
                    [disabled]="!newMessage?.trim() && !selectedFiles.length">
              <mat-icon>send</mat-icon>
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .admin-content {
      padding: var(--spacing-xl);
      height: calc(100vh - 120px);
      display: flex;
      flex-direction: column;
    }

    .admin-header {
      margin-bottom: var(--spacing-xl);

      .header-actions {
        margin-bottom: var(--spacing-md);

        button {
          color: var(--color-text-secondary);
          
          mat-icon {
            margin-right: var(--spacing-xs);
          }

          &:hover {
            color: var(--color-accent);
          }
        }
      }

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

    .chat-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--color-background-light);
      border: 1px solid var(--color-border);
      overflow: hidden;

      mat-card-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 0;
      }
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-md);
    }

    .message {
      display: flex;
      margin-bottom: var(--spacing-md);
      
      &.own-message {
        flex-direction: row-reverse;
        
        .message-content {
          .message-bubble {
            background: linear-gradient(45deg, var(--color-accent), #ffed4a);
            color: #1a1a1a;
            border-radius: 20px 20px 0 20px;
          }
        }
      }
    }

    .message-content {
      max-width: 70%;
    }

    .message-header {
      margin-bottom: 4px;
      
      .sender-name {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
      }
      
      .timestamp {
        font-size: 0.8rem;
        color: var(--color-text-secondary);
        margin-left: var(--spacing-sm);
      }
    }

    .message-bubble {
      background: var(--color-background);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: 20px 20px 20px 0;
    }

    .files {
      margin-top: var(--spacing-sm);
      
      .file {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        font-size: 0.9rem;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }
    }

    .input-container {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      border-top: 1px solid var(--color-border);

      mat-form-field {
        flex: 1;
      }
    }

    .file-preview {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--color-background);
      border-radius: 4px;

      .file-info {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);

        mat-icon {
          color: var(--color-accent);
        }

        .file-name {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  `]
})
export class ChatDetailComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  
  userName: string = 'User';
  currentUserId: string = '';
  messages: ChatMessage[] = [];
  newMessage: string = '';
  selectedFiles: File[] = [];
  selectedFilePreview: { name: string; type: string; icon: string } | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private firestore: AngularFirestore,
    private authService: AuthService,
    private storageService: StorageService
  ) {}

  ngOnInit() {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.currentUserId = userId;
    }

    const chatId = this.route.snapshot.paramMap.get('id');
    if (chatId) {
      this.firestore
        .collection('chats')
        .doc(chatId)
        .valueChanges()
        .subscribe((chat: any) => {
          if (chat) {
            this.userName = chat.userName || 'Unbekannter Benutzer';
          }
        });

      this.loadMessages(chatId);
    }
  }

  loadMessages(chatId: string) {
    const messagesSub = this.firestore
      .collection<ChatMessage>(`chats/${chatId}/messages`, ref => 
        ref.orderBy('timestamp', 'asc'))
      .valueChanges({ idField: 'id' })
      .pipe(
        map(messages => messages.map(message => ({
          ...message,
          timestamp: (message.timestamp as any).toDate()
        })))
      )
      .subscribe(messages => {
        this.messages = messages;
        this.scrollToBottom();
      });

    this.subscriptions.push(messagesSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async sendMessage() {
    if (!this.newMessage?.trim() && !this.selectedFiles.length) return;

    const chatId = this.route.snapshot.paramMap.get('id');
    if (!chatId) {
      console.error('No chat ID found');
      return;
    }

    try {
      const files = await this.uploadFiles();
      
      const message: Partial<ChatMessage> = {
        text: this.newMessage?.trim() || '',
        senderId: 'support', // Feste ID für Support-Nachrichten
        senderName: 'Support',
        timestamp: new Date(),
        files,
        status: 'sent'
      };

      await this.firestore
        .collection('chats')
        .doc(chatId)  // Jetzt ist chatId definitiv nicht null
        .collection('messages')
        .add(message);

      this.newMessage = '';
      this.selectedFiles = [];
      this.selectedFilePreview = null;
      this.scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  async uploadFiles() {
    const uploadedFiles = [];
    
    for (const file of this.selectedFiles) {
      try {
        const path = `support-files/${Date.now()}_${file.name}`;
        const url = await this.storageService.uploadFile(path, file);
        uploadedFiles.push({
          url,
          name: file.name,
          type: file.type
        });
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    return uploadedFiles;
  }

  onFilesSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target && target.files) {
      this.selectedFiles = Array.from(target.files);
      this.selectedFilePreview = {
        icon: 'attach_file',
        name: this.selectedFiles[0].name,
        type: this.selectedFiles[0].type
      };
    }
  }

  removeSelectedFile() {
    this.selectedFilePreview = null;
    this.selectedFiles = [];
  }

  downloadFile(file: { url: string; name: string; }) {
    fetch(file.url)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => console.error('Error downloading file:', error));
  }

  getFileIcon(type: string): string {
    if (type.includes('image')) return 'image';
    if (type.includes('pdf')) return 'picture_as_pdf';
    if (type.includes('word')) return 'description';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'table_chart';
    if (type.includes('video')) return 'videocam';
    return 'insert_file';
  }

  private scrollToBottom() {
    try {
      setTimeout(() => {
        const element = this.scrollContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }, 100);
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  goBack() {
    this.router.navigate(['/admin/support']);
  }
} 