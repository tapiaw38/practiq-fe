export const REVIEW_BELOW = 70;
export const MASTERED_AT = 90;

export type MasteryTier = 'review' | 'progress' | 'mastered';

export function masteryTier(score: number): MasteryTier {
    if (score >= MASTERED_AT) return 'mastered';
    if (score >= REVIEW_BELOW) return 'progress';
    return 'review';
}

export function needsReview(topic: { mastery_score: number; total_attempts: number }) {
    return topic.mastery_score < REVIEW_BELOW && topic.total_attempts > 0;
}
