export interface Event {
  id: string;
  title: string;
  description: string;
  time: string;
  location: string;
  image: string;
  date: {
    day: string;
    month: string;
  };
  status?: 'upcoming' | 'ongoing' | 'past';
} 