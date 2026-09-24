export interface DrawingColor {
  value: string;
  label: string;
}

/**
 * Literal hex, not theme tokens: these are ink colours saved into the drawing,
 * so they must not shift when the theme does.
 */
export const BASE_COLORS: DrawingColor[] = [
  { value: "#1f2937", label: "Negro" },
  { value: "#dc2626", label: "Rojo" },
  { value: "#16a34a", label: "Verde" },
  { value: "#2563eb", label: "Azul" },
  { value: "#f59e0b", label: "Amarillo" },
  { value: "#7c3aed", label: "Violeta" },
];

/**
 * Opened from the "más colores" control. Covers what drawing tasks actually
 * ask for and the base six cannot express — browns, oranges, skin tones.
 *
 * No white: the canvas background follows the theme, so a white pen draws
 * invisible strokes in light mode. That is what the eraser is for.
 */
export const EXTENDED_COLORS: DrawingColor[] = [
  { value: "#1f2937", label: "Negro" },
  { value: "#6b7280", label: "Gris" },
  { value: "#d1d5db", label: "Gris claro" },
  { value: "#78350f", label: "Marrón oscuro" },
  { value: "#92400e", label: "Marrón" },
  { value: "#b45309", label: "Marrón claro" },
  { value: "#d9a066", label: "Beige" },
  { value: "#fcd5b5", label: "Piel clara" },
  { value: "#991b1b", label: "Rojo oscuro" },
  { value: "#dc2626", label: "Rojo" },
  { value: "#f87171", label: "Rojo claro" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#f9a8d4", label: "Rosa claro" },
  { value: "#ea580c", label: "Naranja oscuro" },
  { value: "#f97316", label: "Naranja" },
  { value: "#fb923c", label: "Naranja claro" },
  { value: "#f59e0b", label: "Amarillo" },
  { value: "#fde047", label: "Amarillo claro" },
  { value: "#15803d", label: "Verde oscuro" },
  { value: "#16a34a", label: "Verde" },
  { value: "#4ade80", label: "Verde claro" },
  { value: "#a3e635", label: "Lima" },
  { value: "#0e7490", label: "Verde azulado" },
  { value: "#38bdf8", label: "Celeste" },
  { value: "#2563eb", label: "Azul" },
  { value: "#1e3a8a", label: "Azul oscuro" },
  { value: "#7c3aed", label: "Violeta" },
  { value: "#a855f7", label: "Morado" },
];
