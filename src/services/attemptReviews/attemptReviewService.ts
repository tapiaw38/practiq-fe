import type { AxiosInstance } from "axios";
import type { AttemptReview, OperationResult } from "@/types";

export interface AttemptReviewFilters {
  courseId?: string;
  studentId?: string;
  /** "practice" | "level_test" */
  sheetType?: string;
  /** "" | "reviewed" | "unreviewed" */
  reviewed?: string;
  limit?: number;
  offset?: number;
}

export interface AttemptReviewPage {
  data: AttemptReview[];
  /** Another page exists; the API does not return a total count. */
  has_more: boolean;
}

export interface IAttemptReviewService {
  list(params?: AttemptReviewFilters): Promise<AttemptReviewPage>;
  review(
    attemptId: string,
    params: { is_correct: boolean; feedback?: string },
  ): Promise<{ data: OperationResult }>;
  /** The handwritten statement, fetched only when the teacher opens it. */
  statementImage(attemptId: string): Promise<{ data: { image: string } }>;
}

export class AttemptReviewService implements IAttemptReviewService {
  constructor(private readonly api: AxiosInstance) {}

  async list(params: AttemptReviewFilters = {}): Promise<AttemptReviewPage> {
    const { data } = await this.api.get("/attempt-reviews", {
      params: {
        course_id: params.courseId || undefined,
        student_id: params.studentId || undefined,
        sheet_type: params.sheetType || undefined,
        reviewed: params.reviewed || undefined,
        limit: params.limit,
        offset: params.offset,
      },
    });
    return data;
  }

  async review(
    attemptId: string,
    params: { is_correct: boolean; feedback?: string },
  ): Promise<{ data: OperationResult }> {
    const { data } = await this.api.post(`/attempt-reviews/${attemptId}`, params);
    return data;
  }

  async statementImage(attemptId: string): Promise<{ data: { image: string } }> {
    const { data } = await this.api.get(
      `/attempt-reviews/${attemptId}/statement-image`,
    );
    return data;
  }
}
