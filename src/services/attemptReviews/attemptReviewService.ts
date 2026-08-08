import type { AxiosInstance } from "axios";
import type { AttemptReview, OperationResult } from "@/types";

export interface IAttemptReviewService {
  list(includeReviewed?: boolean): Promise<{ data: AttemptReview[] }>;
  review(
    attemptId: string,
    params: { is_correct: boolean; feedback?: string },
  ): Promise<{ data: OperationResult }>;
}

export class AttemptReviewService implements IAttemptReviewService {
  constructor(private readonly api: AxiosInstance) {}

  async list(includeReviewed = false): Promise<{ data: AttemptReview[] }> {
    const { data } = await this.api.get("/attempt-reviews", {
      params: { include_reviewed: includeReviewed ? "true" : undefined },
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
}
