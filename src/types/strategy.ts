export interface LearningStrategy {
  id: string;
  name: string;
  code: string;
  description: string;
  status?: string;
  created_at: string;
}

export interface CourseLearningStrategy {
  id: string;
  course_id: string;
  strategy_id: string;
  is_default?: boolean;
  config?: string;
  created_at?: string;
  strategy_name?: string;
  strategy_code?: string;
  strategy_description?: string;
  strategy: LearningStrategy;
}
