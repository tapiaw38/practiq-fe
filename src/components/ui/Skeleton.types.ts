export type SkeletonVariant =
  | "text"
  | "rect"
  | "circle"
  | "card"
  | "avatar"
  | "button"
  | "badge";

export interface SkeletonProps {
  width?: string;
  height?: string;
  size?: string;
  variant?: SkeletonVariant;
  rounded?: boolean | string;
  rows?: number;
  rowGap?: string;
  grid?: number;
  gridCols?: string;
  gridHeight?: string;
  animate?: boolean;
  wrapper?: boolean;
  wrapperClass?: string;
  flex?: boolean;
  gap?: string;
}
