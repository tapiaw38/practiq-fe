<script setup lang="ts">
  import { onMounted, ref } from "vue";
  import { useToast } from "primevue/usetoast";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import { useInvitation } from "@/composables/useInvitation";
  import { formatShortDate } from "@/utils/formatters";

  const emit = defineEmits<{ (e: "close"): void }>();

  const toast = useToast();
  const { invitation, generating, loadActive, generate } = useInvitation();
  const copied = ref(false);
  // Arranca en true: el primer render pasa antes de onMounted y sin esto la
  // pantalla mostraba "no tenés código" un instante antes de cargarlo.
  const initializing = ref(true);

  onMounted(async () => {
    try {
      await loadActive();
    } catch {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar el código de invitación",
        life: 3000,
      });
    } finally {
      initializing.value = false;
    }
  });

  async function generateCode() {
    try {
      await generate();
      copied.value = false;
    } catch {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo generar el código",
        life: 3000,
      });
    }
  }

  async function copyCode() {
    if (!invitation.value) return;

    const code = invitation.value.formatted_code;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Safari en iOS y los WebView sin permiso rechazan la API del
      // portapapeles; el textarea temporal sigue siendo el único camino que
      // funciona en todos lados.
      const helper = document.createElement("textarea");
      helper.value = code;
      helper.setAttribute("readonly", "");
      helper.style.position = "absolute";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }

    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  }
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-box">
      <div class="modal-head">
        <h3 class="modal-title">Invitar alumnos</h3>
        <button class="icon-btn" @click="emit('close')">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <p class="invite-help">
        Compartí este código con tus alumnos. Cuando lo ingresen en su panel,
        quedan vinculados con vos y vas a ver su progreso.
      </p>

      <div v-if="initializing" class="invite-code-box">
        <Skeleton width="220px" height="42px" />
        <Skeleton width="160px" height="14px" />
      </div>

      <template v-else-if="invitation">
        <div class="invite-code-box">
          <!-- Siempre seleccionable: si el portapapeles falla en el navegador
               del docente, el código se puede copiar a mano. -->
          <code class="invite-code">{{ invitation.formatted_code }}</code>
          <button
            class="btn btn-primary invite-copy"
            type="button"
            @click="copyCode"
          >
            <i :class="copied ? 'pi pi-check' : 'pi pi-copy'"></i>
            {{ copied ? "¡Copiado!" : "Copiar" }}
          </button>
        </div>

        <div class="invite-meta">
          <span>
            <i class="pi pi-users"></i>
            {{ invitation.uses }}
            {{ invitation.uses === 1 ? "alumno usó" : "alumnos usaron" }} el
            código
          </span>
          <span v-if="invitation.expires_at">
            <i class="pi pi-calendar"></i>
            Vence el {{ formatShortDate(invitation.expires_at) }}
          </span>
        </div>

        <div class="modal-actions">
          <button
            class="btn btn-ghost"
            type="button"
            :disabled="generating"
            @click="generateCode"
          >
            <i class="pi pi-refresh"></i>
            {{ generating ? "Generando..." : "Generar uno nuevo" }}
          </button>
        </div>
        <p class="invite-note">
          Al generar uno nuevo, el anterior deja de funcionar. Los alumnos ya
          vinculados siguen estándolo.
        </p>
      </template>

      <template v-else>
        <p class="invite-empty">Todavía no tenés un código activo.</p>
        <div class="modal-actions">
          <button
            class="btn btn-primary"
            type="button"
            :disabled="generating"
            @click="generateCode"
          >
            <i class="pi pi-plus"></i>
            {{ generating ? "Generando..." : "Generar código" }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 100;
  }

  .modal-box {
    background: var(--surface-elevated-strong);
    border-radius: var(--radius-2xl);
    padding: 24px;
    width: 100%;
    max-width: 460px;
    box-shadow: var(--shadow-card-lg);
  }

  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .modal-title {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
  }

  .icon-btn {
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
  }

  .invite-help {
    font-size: 0.88rem;
    color: var(--text-secondary);
    margin: 0 0 18px;
    line-height: 1.5;
  }

  .invite-code-box {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 18px;
    border-radius: var(--radius-xl);
    background: var(--fill-primary-faint);
    border: 1.5px dashed rgba(var(--practiq-violet-rgb), 0.35);
  }

  .invite-code {
    flex: 1;
    min-width: 180px;
    font-family: ui-monospace, "SFMono-Regular", "Menlo", monospace;
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: var(--practiq-violet);
    user-select: all;
  }

  .invite-copy {
    white-space: nowrap;
  }

  .invite-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 14px;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .invite-meta i {
    margin-right: 4px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }

  .invite-note,
  .invite-empty {
    font-size: 0.78rem;
    color: var(--text-secondary);
    margin: 10px 0 0;
    line-height: 1.5;
  }

  .invite-empty {
    font-size: 0.88rem;
    margin: 18px 0 0;
  }

  @media (max-width: 680px) {
    .invite-code {
      font-size: 1.35rem;
    }
  }
</style>
