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
  duration: string;
  type: 'video' | 'article';
  videoUrl?: string;
  content?: string;
  completed: boolean;
  files?: {
    name: string;
    url: string;
    type: string;
  }[];
  quiz?: {
    title: string;
    questions: {
      text: string;
      options: string[];
      correctAnswer: number;
    }[];
  };
}

export interface File {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  completed?: boolean;
  score?: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
} 