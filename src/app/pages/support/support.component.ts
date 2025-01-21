import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
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
  templateUrl: './support.component.html',
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
  private messagesSubscription?: Subscription;

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService,
    private storageService: StorageService
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe(async user => {
      if (user) {
        console.log('Current User ID:', user.uid);
        this.currentUserId = user.uid;
        
        try {
          // Hole zusätzliche Benutzerinformationen aus Firestore
          const userDoc = await this.firestore
            .collection('users')
            .doc(user.uid)
            .get()
            .toPromise();

          if (userDoc?.exists) {
            const userData = userDoc.data() as UserData;
            if (userData.firstName && userData.lastName) {
              this.currentUserName = `${userData.firstName} ${userData.lastName}`;
            } else {
              // Fallback auf Email
              this.currentUserName = user.email?.split('@')[0] || 'Anonymous';
            }
          } else {
            // Fallback auf Email wenn kein Firestore Dokument existiert
            this.currentUserName = user.email?.split('@')[0] || 'Anonymous';
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          this.currentUserName = user.email?.split('@')[0] || 'Anonymous';
        }
      }
    });
    this.loadMessages();
  }

  ngOnDestroy() {
    if (this.messagesSubscription) {
      this.messagesSubscription.unsubscribe();
    }
  }

  loadMessages() {
    this.authService.user$.pipe(take(1)).subscribe(async user => {
      if (!user) return;

      try {
        const chatsRef = await this.firestore
          .collection('chats', ref => 
            ref.where('userId', '==', user.uid)
            .where('status', '==', 'active')
            .limit(1))
          .get()
          .toPromise();

        if (!chatsRef || chatsRef.empty) {
          // Kein aktiver Chat vorhanden - erstelle einen neuen
          const chatRef = await this.firestore.collection('chats').add({
            userId: user.uid,
            userName: this.currentUserName,
            createdAt: new Date(),
            status: 'active',
            adminEmail: 'support@horizon-consulting.at'
          });
          this.loadChatMessages(chatRef.id);
        } else {
          const firstDoc = chatsRef.docs[0];
          if (firstDoc) {
            this.loadChatMessages(firstDoc.id);
          }
        }
      } catch (error) {
        console.error('Error loading chat:', error);
      }
    });
  }

  loadChatMessages(chatId: string) {
    this.messagesSubscription = this.firestore
      .collection<FirestoreMessage>(`chats/${chatId}/messages`, ref => 
        ref.orderBy('timestamp', 'asc'))
      .valueChanges({ idField: 'id' })
      .pipe(
        map(messages => messages.map(message => {
          console.log('Message:', message);
          console.log('Is own message:', message.senderId === this.currentUserId);
          return {
            ...message,
            timestamp: message.timestamp?.toDate() || new Date(),
          } as ChatMessage;
        }))
      )
      .subscribe(messages => {
        this.messages = messages;
        setTimeout(() => this.scrollToBottom(), 100);
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

  async sendMessage() {
    if (!this.newMessage?.trim() && !this.selectedFiles.length) return;

    try {
      const files = await this.uploadFiles();
      const user = await this.authService.user$.pipe(take(1)).toPromise();
      
      if (!user) {
        console.error('No user found');
        return;
      }

      const chatsRef = await this.firestore
        .collection('chats', ref => 
          ref.where('userId', '==', user.uid)
          .where('status', '==', 'active')
          .limit(1))
        .get()
        .toPromise();

      let chatId: string;
      
      if (!chatsRef || chatsRef.empty) {
        const chatRef = await this.firestore.collection('chats').add({
          userId: user.uid,
          userName: this.currentUserName,
          createdAt: new Date(),
          status: 'active',
          adminEmail: 'support@horizon-consulting.at'
        });
        chatId = chatRef.id;
      } else {
        const firstDoc = chatsRef.docs[0];
        if (!firstDoc) {
          throw new Error('No chat document found');
        }
        chatId = firstDoc.id;
      }

      // Füge Nachricht hinzu
      const message: Partial<ChatMessage> = {
        text: this.newMessage?.trim() || '',
        senderId: this.currentUserId,
        senderName: this.currentUserName,
        timestamp: new Date(),
        files,
        status: 'sent'
      };

      await this.firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add(message);

      this.newMessage = '';
      this.selectedFiles = [];
      this.selectedFilePreview = null;
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
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      const file = files[0];
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'video/mp4',
        'video/quicktime'
      ];

      if (!allowedTypes.includes(file.type)) {
        return;
      }

      this.selectedFiles = [file];
      this.selectedFilePreview = {
        name: file.name,
        type: file.type,
        icon: this.getFileIcon(file.type)
      };
    }
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
} 