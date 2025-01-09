export interface Event {
  id: string;
  title: string;
  description: string;
  day: string;
  month: string;
  time: string;
  location: string;
  image?: string;
  status: 'bevorstehend' | 'laufend' | 'abgeschlossen' | 'abgesagt';
} 