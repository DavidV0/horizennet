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
    <div class="chat-container">
      <div class="chat-header">
        <button mat-button class="back-button" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          Zurück zur Übersicht
        </button>
        <div class="header-content">
          <h1>Chat mit {{userName}}</h1>
          <p>Support-Konversation</p>
        </div>
      </div>

      <div class="messages-container" #scrollContainer>
        <div class="auth-warning" *ngIf="!isAuthenticated">
          <mat-icon>warning</mat-icon>
          <p>Bitte melden Sie sich an, um Nachrichten zu senden.</p>
        </div>

        <div class="message" *ngFor="let message of messages" 
             [class.own-message]="message.senderId === 'support'"
             [class.fade-in]="true">
          <div class="message-content">
            <div class="message-header">
              <span class="sender-name">
                {{message.senderId === 'support' ? 'Support Team' : message.senderName}}
              </span>
              <span class="timestamp">{{message.timestamp | date:'dd.MM.yyyy HH:mm'}}</span>
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

      <div class="input-container" [class.disabled]="!isAuthenticated">
        <input #fileInput type="file" multiple hidden (change)="onFilesSelected($event)"
               accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov"
               [disabled]="!isAuthenticated">
        
        <div class="file-preview" *ngIf="selectedFilePreview">
          <div class="file-info">
            <mat-icon>{{selectedFilePreview.icon}}</mat-icon>
            <span class="file-name">{{selectedFilePreview.name}}</span>
          </div>
          <button mat-icon-button (click)="removeSelectedFile()" [disabled]="!isAuthenticated">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <button mat-icon-button class="attach-button" (click)="fileInput.click()" [disabled]="!isAuthenticated">
          <mat-icon>attach_file</mat-icon>
        </button>
        
        <mat-form-field appearance="outline" class="message-input">
          <input matInput 
                 [(ngModel)]="newMessage" 
                 placeholder="{{isAuthenticated ? 'Schreiben Sie eine Nachricht...' : 'Bitte melden Sie sich an...'}}"
                 (keyup.enter)="sendMessage()"
                 [disabled]="!isAuthenticated">
        </mat-form-field>

        <button mat-icon-button class="send-button" (click)="sendMessage()" 
                [disabled]="!isAuthenticated || (!newMessage?.trim() && !selectedFiles.length)">
          <mat-icon>send</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      height: calc(100vh - 64px);
      display: flex;
      flex-direction: column;
      background: var(--color-primary);
      padding-top: 2vh;
    }

    .chat-header {
      padding: 0 var(--spacing-xl);
      margin-bottom: var(--spacing-xl);

      .back-button {
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-md);
        transition: all 0.3s ease;
        
        mat-icon {
          margin-right: var(--spacing-xs);
        }

        &:hover {
          color: var(--color-accent);
          transform: translateX(-4px);
        }
      }

      .header-content {
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

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-md);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      background: rgba(255, 255, 255, 0.02);
    }

    .message {
      display: flex;
      align-items: flex-start;
      max-width: 70%;
      margin-right: auto;

      .message-content {
        .message-bubble {
          background: rgba(255, 255, 255, 0.9);
          color: var(--color-primary);
          border-radius: 4px 20px 20px 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .message-header {
          padding-left: var(--spacing-md);

          .sender-name {
            color: var(--color-white);
          }
        }
      }

      &.own-message {
        margin-left: auto;
        margin-right: 0;
        
        .message-content {
          align-items: flex-end;

          .message-bubble {
            background: linear-gradient(135deg, var(--color-accent) 0%, #FFC740 100%);
            color: var(--color-primary);
            border-radius: 20px 4px 20px 20px;
            box-shadow: 0 2px 8px rgba(255, 183, 0, 0.2);
          }

          .message-header {
            text-align: right;
            padding-right: var(--spacing-md);
          }
        }
      }
    }

    .message-content {
      display: flex;
      flex-direction: column;
    }

    .message-header {
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      
      .sender-name {
        font-size: 0.9rem;
        font-weight: var(--font-weight-medium);
      }
      
      .timestamp {
        font-size: 0.8rem;
        color: var(--color-gray-300);
      }
    }

    .message-bubble {
      padding: var(--spacing-sm) var(--spacing-md);
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-1px);
      }

      .message-text {
        line-height: 1.5;
        font-size: var(--font-size-md);
      }

      .files {
        margin-top: var(--spacing-sm);
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        padding-top: var(--spacing-sm);
        
        .file {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: 0.9rem;
          cursor: pointer;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: 4px;
          transition: all 0.2s ease;

          &:hover {
            background: rgba(0, 0, 0, 0.05);
            transform: translateX(2px);
          }

          mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
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
    }

    .message-status {
      margin-top: 4px;
      display: flex;
      justify-content: flex-end;
      padding-right: var(--spacing-md);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--color-text-secondary);
        opacity: 0.7;

        &.read {
          color: var(--color-accent);
          opacity: 1;
        }
      }
    }

    .input-container {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: rgba(255, 255, 255, 0.03);
      border-top: 1px solid var(--color-border);
      backdrop-filter: blur(10px);

      .message-input {
        flex: 1;
        margin-bottom: -1.25em;

        ::ng-deep {
          .mat-mdc-form-field-flex {
            background-color: rgba(255, 255, 255, 0.05);
          }

          .mat-mdc-form-field-outline {
            color: rgba(255, 255, 255, 0.1);
          }

          .mat-mdc-text-field-wrapper {
            padding-bottom: 0;
          }

          .mdc-text-field--outlined {
            --mdc-outlined-text-field-outline-color: rgba(255, 255, 255, 0.1);
            --mdc-outlined-text-field-hover-outline-color: var(--color-accent);
            --mdc-outlined-text-field-focus-outline-color: var(--color-accent);
          }

          input.mat-mdc-input-element {
            color: var(--color-white);
          }

          .mat-mdc-form-field-focus-overlay {
            background-color: transparent;
          }
        }
      }

      .attach-button, .send-button {
        color: var(--color-text-secondary);
        transition: all 0.3s ease;

        &:hover {
          color: var(--color-accent);
          transform: scale(1.1);
        }

        &:disabled {
          opacity: 0.5;
          transform: none;
        }
      }

      .send-button {
        background: linear-gradient(135deg, var(--color-accent) 0%, #FFC740 100%);
        color: var(--color-primary);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(255, 183, 0, 0.2);

        &:hover:not(:disabled) {
          transform: scale(1.1) rotate(15deg);
        }

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }
    }

    .file-preview {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);

      .file-info {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);

        mat-icon {
          color: var(--color-accent);
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        .file-name {
          font-size: 0.9rem;
          color: var(--color-white);
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      button {
        color: var(--color-text-secondary);
        
        &:hover {
          color: var(--color-accent);
        }
      }
    }

    .fade-in {
      animation: messageSlideIn 0.3s ease-out forwards;
    }

    @keyframes messageSlideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .auth-warning {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: rgba(255, 183, 0, 0.1);
      border-radius: 8px;
      margin: var(--spacing-md);
      
      mat-icon {
        color: var(--color-accent);
      }
      
      p {
        color: var(--color-white);
        margin: 0;
      }
    }

    .input-container {
      &.disabled {
        opacity: 0.7;
        pointer-events: none;

        .message-input {
          ::ng-deep {
            input {
              cursor: not-allowed;
            }
          }
        }
      }
    }
  `]
})
export class ChatDetailComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  
  userName: string = 'User';
  currentUserId: string = '';
  chatId: string = '';
  messages: ChatMessage[] = [];
  newMessage: string = '';
  selectedFiles: File[] = [];
  selectedFilePreview: { name: string; type: string; icon: string } | null = null;
  isAuthenticated: boolean = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private firestore: AngularFirestore,
    private authService: AuthService,
    private storageService: StorageService
  ) {}

  ngOnInit() {
    // Subscribe to auth state
    this.subscriptions.push(
      this.authService.user$.subscribe(user => {
        this.isAuthenticated = !!user;
        if (user) {
          this.currentUserId = user.uid;
          this.loadUserData(user.uid);
        }
      })
    );

    const chatId = this.route.snapshot.paramMap.get('id');
    if (chatId) {
      this.chatId = chatId;
      this.loadChat(chatId);
    }
  }

  private async loadUserData(userId: string) {
    try {
      const userDoc = await this.firestore
        .collection('users')
        .doc(userId)
        .get()
        .toPromise();

      if (userDoc?.exists) {
        const userData = userDoc.data() as any;
        if (userData?.firstName && userData?.lastName) {
          this.userName = `${userData.firstName} ${userData.lastName}`;
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  private loadChat(chatId: string) {
    this.subscriptions.push(
      this.firestore
        .collection('chats')
        .doc(chatId)
        .valueChanges()
        .subscribe((chat: any) => {
          if (chat) {
            this.userName = chat.userName || 'Unbekannter Benutzer';
          }
        })
    );

    this.loadMessages(chatId);
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

    try {
      const user = await this.authService.user$.pipe(take(1)).toPromise();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Upload files if any
      const files = await this.uploadFiles();

      // Create and send the message
      const message: Partial<ChatMessage> = {
        text: this.newMessage?.trim() || '',
        senderId: 'support',
        senderName: 'Support Team',  // Fixed sender name for support messages
        timestamp: new Date(),
        files,
        status: 'sent'
      };

      await this.firestore
        .collection('chats')
        .doc(this.chatId)
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