<script setup lang="ts">
  import type {
    TopicForm,
    TopicModalEmits,
    TopicModalProps,
  } from "./TopicModal.types";

  const props = defineProps<TopicModalProps>();
  const emit = defineEmits<TopicModalEmits>();

  const updateField = <K extends keyof TopicForm>(
    field: K,
    value: TopicForm[K],
  ) => {
    emit("update:topic", { ...props.topic, [field]: value });
  };
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
        <div class="modal-box">
          <h3 class="modal-title">Nuevo Tema</h3>
          <form @submit.prevent="emit('submit')">
            <div class="form-group">
              <label class="form-label">Título *</label>
              <input
                :value="topic.title"
                class="form-input"
                placeholder="Fracciones"
                required
                @input="
                  updateField(
                    'title',
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
            </div>
            <div class="form-group">
              <label class="form-label">Descripción</label>
              <textarea
                :value="topic.description"
                class="form-textarea"
                rows="2"
                @input="
                  updateField(
                    'description',
                    ($event.target as HTMLTextAreaElement).value,
                  )
                "
              ></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Orden</label>
              <input
                :value="topic.order_index"
                type="number"
                class="form-input"
                min="0"
                @input="
                  updateField(
                    'order_index',
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
              />
            </div>
            <div class="modal-actions">
              <button
                type="button"
                class="btn btn-secondary"
                @click="emit('close')"
              >
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary">Crear Tema</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .modal-overlay {
    z-index: 1000;
    display: grid;
    place-items: center;
  }
  .modal-box {
    width: min(560px, 100%);
    max-height: calc(100vh - 40px);
    overflow: auto;
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-lg);
    padding: 22px;
  }
  .modal-title {
    margin: 0 0 18px;
    font-size: 1.2rem;
    font-weight: 800;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }
  @media (max-width: 560px) {
    .modal-actions {
      flex-direction: column;
    }
    .modal-actions .btn {
      width: 100%;
    }
  }
</style>
