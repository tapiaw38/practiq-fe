import type { Course } from "@/types";

export type UiTheme = "primary" | "secondary" | "teacher";

/** Applies grade visual identity globally; components stay token-based. */
export function setUiTheme(theme: UiTheme | undefined) {
  const root = document.documentElement;
  if (theme && theme !== "primary") root.dataset.uiTheme = theme;
  else delete root.dataset.uiTheme;
}

export function setCourseUiTheme(course: Pick<Course, "grade_theme"> | null | undefined) {
  setUiTheme(course?.grade_theme);
}
