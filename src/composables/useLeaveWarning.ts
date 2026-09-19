import { onMounted, onUnmounted } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router";
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

  const confirmNavigation = async () => {
    if (allowNextNavigation) {
      allowNextNavigation = false;
      return true;
    }
    if (!hasPendingWork()) return true;
    return askToLeave();
  };

  // Changing only :id (for example practice A → practice B through browser
  // history) reuses the same route record, so Vue Router runs update guards
  // instead of leave guards. Both paths must protect unsent work.
  onBeforeRouteLeave(confirmNavigation);
  onBeforeRouteUpdate(confirmNavigation);

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

  // Confirm destructive modal actions without arming a route-navigation
  // bypass. The action may close a dialog rather than navigate.
  async function discard(action: () => void) {
    if (!hasPendingWork()) {
      action();
      return;
    }
    if (!(await askToLeave())) return;
    action();
  }

  return {
    leaveConfirmState,
    onLeaveConfirm,
    onLeaveCancel,
    leave,
    discard,
  };
}
