export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  files?: { url: string; name: string; type: string; }[];
  status: 'sent' | 'delivered' | 'read';
  avatar?: string;
} 