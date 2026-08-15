import { onMounted, onUnmounted } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { useConfirm } from "./useConfirm";

/** Protects in-progress student work from accidental navigation. */
export function useLeaveWarning(hasPendingWork: () => boolean) {
  const {
    confirmState: leaveConfirmState,
    showConfirm,
    onConfirm: onLeaveConfirm,
    onCancel: onLeaveCancel,
  } = useConfirm();
  let allowNextNavigation = false;

  const askToLeave = () =>
    showConfirm("¿Querés salir de esta actividad?", {
      description: "Si salís ahora, podés perder las respuestas que todavía no enviaste.",
      confirmLabel: "Salir",
      danger: false,
    });

  onBeforeRouteLeave(async () => {
    if (allowNextNavigation) {
      allowNextNavigation = false;
      return true;
    }
    if (!hasPendingWork()) return true;
    return askToLeave();
  });

  // Browser security rules only allow its native dialog on reload/close.
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!hasPendingWork()) return;
    event.preventDefault();
    event.returnValue = "";
  };

  onMounted(() => window.addEventListener("beforeunload", onBeforeUnload));
  onUnmounted(() => window.removeEventListener("beforeunload", onBeforeUnload));

  async function leave(action: () => void) {
    if (!hasPendingWork()) {
      action();
      return;
    }
    if (!(await askToLeave())) return;
    allowNextNavigation = true;
    action();
  }

  return { leaveConfirmState, onLeaveConfirm, onLeaveCancel, leave };
}
