import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../../shared/services/auth.service';
import { StorageService } from '../../shared/services/storage.service';
import { ChatMessage } from './support.interface';
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { UserData } from '../../shared/services/user.service';

interface FirestoreMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: any;
  files?: { url: string; name: string; type: string; }[];
  status: 'sent' | 'delivered' | 'read';
}

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  template: `
    <div class="chat-container">
      <div class="chat-header">
        <h1>Support Chat</h1>
        <p>Unser Support-Team ist für Sie da</p>
      </div>

      <div class="messages-container" #scrollContainer>
        <div class="auth-warning" *ngIf="!isAuthenticated">
          <mat-icon>warning</mat-icon>
          <p>Bitte melden Sie sich an, um mit unserem Support-Team zu chatten.</p>
          <button mat-raised-button color="accent" (click)="navigateToLogin()">
            Jetzt anmelden
          </button>
        </div>

        <div class="message" *ngFor="let message of messages" 
             [class.own-message]="message.senderId === currentUserId"
             [class.fade-in]="true">
          <div class="message-content">
            <div class="message-header">
              <span class="sender-name">
                {{message.senderId === 'support' ? 'Support Team' : message.senderName}}
              </span>
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
            <div class="message-status" *ngIf="message.senderId === currentUserId">
              <mat-icon [class.read]="message.status === 'read'">
                {{getStatusIcon(message.status)}}
              </mat-icon>
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
  styleUrls: ['./support.component.scss']
})
export class SupportComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  
  messages: ChatMessage[] = [];
  newMessage: string = '';
  currentUserId: string = '';
  currentUserName: string = '';
  selectedFiles: File[] = [];
  selectedFilePreview: { name: string; type: string; icon: string } | null = null;
  isAuthenticated: boolean = false;
  private messagesSubscription?: Subscription;
  private subscriptions: Subscription[] = [];

  readonly allowedFileTypes = {
    'image/jpeg': 'Bilder (JPEG)',
    'image/png': 'Bilder (PNG)',
    'image/gif': 'Bilder (GIF)',
    'application/pdf': 'PDF Dokumente',
    'application/msword': 'Word Dokumente',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Dokumente',
    'application/vnd.ms-excel': 'Excel Tabellen',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Tabellen'
  };

  constructor(
    private router: Router,
    private firestore: AngularFirestore,
    private authService: AuthService,
    private storageService: StorageService
  ) {}

  ngOnInit() {
    // Subscribe to auth state
    this.subscriptions.push(
      this.authService.user$.subscribe(async user => {
        this.isAuthenticated = !!user;
        if (user) {
          console.log('Current User ID:', user.uid);
          this.currentUserId = user.uid;
          await this.loadUserData(user.uid);
          this.loadMessages();
        } else {
          this.messages = [];
          this.currentUserId = '';
          this.currentUserName = '';
          this.newMessage = '';
          this.selectedFiles = [];
          this.selectedFilePreview = null;
        }
      })
    );
  }

  private async loadUserData(userId: string) {
    try {
      const userDoc = await this.firestore
        .collection('users')
        .doc(userId)
        .get()
        .toPromise();

      if (userDoc?.exists) {
        const userData = userDoc.data() as UserData;
        if (userData.firstName && userData.lastName) {
          this.currentUserName = `${userData.firstName} ${userData.lastName}`;
        } else {
          this.currentUserName = 'Anonymous';
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.currentUserName = 'Anonymous';
    }
  }

  loadMessages() {
    if (!this.isAuthenticated) {
      console.error('User not authenticated');
      return;
    }

    // Subscribe to existing chats
    this.messagesSubscription = this.firestore
      .collection('chats', ref => 
        ref.where('userId', '==', this.currentUserId)
        .where('status', '==', 'active')
        .limit(1))
      .snapshotChanges()
      .subscribe(snapshot => {
        if (snapshot.length > 0) {
          const chatDoc = snapshot[0];
          if (chatDoc) {
            this.loadChatMessages(chatDoc.payload.doc.id);
          }
        }
      });
  }

  loadChatMessages(chatId: string) {
    if (this.messagesSubscription) {
      this.messagesSubscription.unsubscribe();
    }

    this.messagesSubscription = this.firestore
      .collection<FirestoreMessage>(`chats/${chatId}/messages`, ref => 
        ref.orderBy('timestamp', 'asc'))
      .valueChanges({ idField: 'id' })
      .pipe(
        map(messages => messages.map(message => ({
          ...message,
          timestamp: message.timestamp?.toDate() || new Date(),
        } as ChatMessage)))
      )
      .subscribe(messages => {
        this.messages = messages;
        setTimeout(() => this.scrollToBottom(), 100);
      });
  }

  async sendMessage() {
    if (!this.isAuthenticated) {
      console.error('User not authenticated');
      return;
    }

    if ((!this.newMessage?.trim() && !this.selectedFiles.length) || !this.currentUserId) {
      return;
    }

    try {
      // Find existing chat or create new one
      const chatsRef = await this.firestore
        .collection('chats', ref => 
          ref.where('userId', '==', this.currentUserId)
          .where('status', '==', 'active')
          .limit(1))
        .get()
        .toPromise();

      let chatId: string;

      if (!chatsRef || chatsRef.empty) {
        // Create new chat
        const chatRef = await this.firestore.collection('chats').add({
          userId: this.currentUserId,
          userName: this.currentUserName,
          createdAt: new Date(),
          status: 'active',
          adminEmail: 'support@horizon-consulting.at'
        });
        chatId = chatRef.id;
        this.loadChatMessages(chatId);
      } else {
        chatId = chatsRef.docs[0].id;
      }

      // Upload files if any
      const files = await this.uploadFiles();

      // Create and send the message
      const message: Partial<ChatMessage> = {
        text: this.newMessage?.trim() || '',
        senderId: this.currentUserId,
        senderName: this.currentUserName,
        timestamp: new Date(),
        files,
        status: 'sent'
      };

      console.log('Sending message to chat:', chatId, message); // Debug log

      await this.firestore
        .collection('chats')
        .doc(chatId)
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
      const url = await this.storageService.uploadFile(`support-files/${file.name}`, file);
      uploadedFiles.push({
        url,
        name: file.name,
        type: file.type
      });
    }

    return uploadedFiles;
  }

  getFileIcon(type: string): string {
    if (type.includes('image')) return 'image';
    if (type.includes('pdf')) return 'picture_as_pdf';
    if (type.includes('word')) return 'description';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'table_chart';
    if (type.includes('video')) return 'videocam';
    return 'insert_drive_file';
  }

  onFilesSelected(event: Event) {
    if (!this.isAuthenticated) {
      console.error('User not authenticated');
      return;
    }

    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!this.allowedFileTypes[file.type as keyof typeof this.allowedFileTypes]) {
      // Show error message for unsupported file type
      console.error('Unsupported file type:', file.type);
      // You could add a MatSnackBar or other UI feedback here
      return;
    }

    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeInBytes) {
      console.error('File too large:', file.size);
      // You could add a MatSnackBar or other UI feedback here
      return;
    }

    this.selectedFiles = [file];
    this.selectedFilePreview = {
      name: file.name,
      type: file.type,
      icon: this.getFileIcon(file.type)
    };
  }

  removeSelectedFile() {
    this.selectedFiles = [];
    this.selectedFilePreview = null;
  }

  private scrollToBottom() {
    try {
      this.scrollContainer.nativeElement.scrollTop = 
        this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) {}
  }

  downloadFile(file: { url: string; name: string }) {
    // Fetch the file and create a blob
    fetch(file.url)
      .then(response => response.blob())
      .then(blob => {
        // Create a blob URL
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create link and trigger download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      });
  }

  navigateToLogin() {
    this.router.navigate(['/login'], { 
      queryParams: { returnUrl: '/support' }
    });
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'sent': return 'check';
      case 'delivered': return 'done_all';
      case 'read': return 'done_all';
      default: return 'schedule';
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.messagesSubscription) {
      this.messagesSubscription.unsubscribe();
    }
  }
} 