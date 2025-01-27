export interface LessonProgress {
  completed: boolean;
  completedAt: Date;
  completionType?: 'video' | 'quiz';
}

export interface ModuleProgress {
  lessons: Record<string, LessonProgress>;
}

export interface CourseProgress {
  modules: Record<string, ModuleProgress>;
  startedAt: Date;
}

export interface Progress {
  courses: Record<string, CourseProgress>;
}

export interface User {
  id?: string;
  uid?: string;
  firebaseUid?: string;
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  streetNumber: string;
  zipCode: string;
  city: string;
  country: string;
  mobile: string;
  paymentPlan: number;
  purchaseDate: Date;
  productKey: string;
  status: string;
  keyActivated: boolean;
  accountActivated: boolean;
  activatedAt?: Date;
  purchasedCourses?: string[];
  purchased?: string[];
  courses?: {
    purchased?: string[];
  };
  progress?: Progress;
  consent?: {
    acceptTerms: boolean;
    consent1: boolean;
    consent2: boolean;
    timestamp: string;
  };
  products?: {
    [productId: string]: {
      activated: boolean;
      activatedAt: Date;
      productKey: string;
    };
  };
} 