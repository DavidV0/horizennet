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
  description?: string;
  type: 'video' | 'article';
  videoUrl?: string;
  duration?: string;
  content?: string;
  files?: Array<{ url: string; name: string; type: string }>;
  quiz?: Quiz;
  completed?: boolean;
  completedAt?: Date;
  completedBy?: string;
  completionType?: 'video' | 'quiz';
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