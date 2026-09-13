import confetti from "canvas-confetti";

export function useConfetti() {
  const fireSuccess = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#7c3aed", "#8b5cf6", "#a78bfa", "#fbbf24", "#34d399"],
    });
  };

  const fireLevelUp = () => {
    // Big celebration burst
    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#7c3aed", "#fbbf24", "#34d399"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#7c3aed", "#fbbf24", "#34d399"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const fireCorrect = () => {
    confetti({
      particleCount: 40,
      spread: 40,
      origin: { y: 0.65 },
      colors: ["#34d399", "#6ee7b7", "#a7f3d0"],
    });
  };

  return { fireSuccess, fireLevelUp, fireCorrect };
}
