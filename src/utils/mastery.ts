/**
 * Mastery thresholds — one place, because four competing numbers is what caused
 * the drift this replaces.
 *
 * These come from the learning strategy that actually drives the student's loop
 * (practiq-be internal/domain/learning_strategy.go): ShouldRepeatTopic fires
 * below 70, ShouldLevelUp at 90. The home used to flag review below 60, which
 * left topics between 60 and 69 unflagged even though the engine was already
 * telling the student to repeat them.
 *
 * 75 is deliberately absent: that is levelTestPassThreshold, and it grades a
 * level test's own score, never a topic's mastery.
 */
export const REVIEW_BELOW = 70;
export const MASTERED_AT = 90;

export type MasteryTier = "review" | "progress" | "mastered";

export function masteryTier(score: number): MasteryTier {
  if (score >= MASTERED_AT) return "mastered";
  if (score >= REVIEW_BELOW) return "progress";
  return "review";
}

/**
 * A topic nobody has attempted is not "failing" — it has no score yet, so the
 * zero it reports must not be read as a bad one.
 */
export function needsReview(topic: {
  mastery_score: number;
  total_attempts: number;
}) {
  return topic.mastery_score < REVIEW_BELOW && topic.total_attempts > 0;
}
