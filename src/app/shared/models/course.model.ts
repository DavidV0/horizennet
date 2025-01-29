export interface Course {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  image: string;
  modules: Module[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  image?: string;
  lessons: Lesson[];
  order: number;
  progress?: number;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'article';
  duration: string;
  videoUrl?: string;
  content?: string;
  files?: File[];
  quiz?: Quiz;
  completed?: boolean;
  progress?: number;
  videoProgress?: number;
  quizCompleted?: boolean;
  order?: number;
}

export interface File {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface Question {
  text: string;
  options: string[];
  correctAnswers: number[];
  explanation?: string;
}

export interface Quiz {
  title: string;
  questions: Question[];
} 