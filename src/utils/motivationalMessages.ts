export const loadingMessages = [
  "Analizando tu trabajo...",
  "¡Veamos cómo te fue!",
  "Revisando cada detalle...",
  "¡Ya casi está!",
  "Preparando tu resultado...",
  "Pensando... 🤔",
  "Calculando tu puntaje...",
];

export const successMessages = [
  "¡Increíble trabajo!",
  "¡Eres un crack!",
  "¡Sigue así, campeón!",
  "¡Lo lograste!",
  "¡Genial!",
  "¡Excelente!",
  "¡Eso es!",
  "¡Muy bien hecho!",
];

export const encourageMessages = [
  "¡Tú puedes!",
  "¡Sigue intentando!",
  "¡Cada error es aprendizaje!",
  "¡La práctica hace al maestro!",
  "¡No te rindas!",
  "¡Vamos de nuevo!",
  "¡A seguir practicando!",
];

export const levelUpMessages = [
  "¡Subiste de nivel!",
  "¡Nivel desbloqueado!",
  "¡Eres imparable!",
  "¡Nuevo nivel alcanzado!",
];

export function randomMessage(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}
