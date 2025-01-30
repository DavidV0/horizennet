export interface Progress {
  courses: {
    [courseId: string]: CourseProgress;
  };
}

export interface CourseProgress {
  modules: {
    [moduleId: string]: ModuleProgress;
  };
  startedAt: any;
}

export interface ModuleProgress {
  lessons: {
    [lessonId: string]: LessonProgress;
  };
}

export interface LessonProgress {
  completed: boolean;
  completedAt: any | null;
  completionType: string | null;
  videoProgress: number | null;
  quizCompleted: boolean | null;
} 
