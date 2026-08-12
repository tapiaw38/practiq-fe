<script setup lang="ts">
  import { ref, reactive, computed, onMounted } from "vue";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import CourseStrategyAssignments from "@/components/teacher/strategy/CourseStrategyAssignments.vue";
  import StrategyCatalog from "@/components/teacher/strategy/StrategyCatalog.vue";
  import { useCourse } from "@/composables/useCourse";
  import { useStrategy } from "@/composables/useStrategy";
  import { useAuthStore } from "@/stores/authStore";
  import type { LearningStrategy } from "@/types";

  const authStore = useAuthStore();

  const { courses, loadCourses } = useCourse();
  const {
    strategies,
    courseAssignments,
    loadStrategies,
    loadCourseStrategies,
    assignStrategyToCourse,
    removeCourseStrategy,
    createStrategy: createStrategyService,
    updateStrategy: updateStrategyService,
    deleteStrategy: deleteStrategyService,
  } = useStrategy();
  const loading = ref(true);
  const selectedStrategyForCourse = ref<Record<string, string>>({});
  const assigning = ref<Record<string, boolean>>({});

  const showStrategyModal = ref(false);
  const editingStrategy = ref<LearningStrategy | null>(null);
  const saving = ref(false);

  const deletingStrategy = ref<LearningStrategy | null>(null);
  const deleting = ref(false);

  const strategyForm = reactive({
    name: "",
    code: "",
    description: "",
  });

  const isAdmin = computed(() => {
    const roles = authStore.authUser?.roles || [];
    return roles.some(
      (role) => role.name === "admin" || role.name === "superadmin",
    );
  });

  onMounted(async () => {
    await loadData();
  });

  async function loadData() {
    loading.value = true;
    try {
      await Promise.all([loadStrategies(), loadCourses("teacher")]);

      for (const course of courses.value) {
        try {
          await loadCourseStrategies(course.id);
        } catch {
          courseAssignments.value[course.id] = [];
        }
        selectedStrategyForCourse.value[course.id] = "";
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      loading.value = false;
    }
  }

  async function assignStrategy(courseId: string) {
    const strategyId = selectedStrategyForCourse.value[courseId];
    if (!strategyId) return;

    assigning.value[courseId] = true;
    try {
      await assignStrategyToCourse(courseId, strategyId);
      selectedStrategyForCourse.value[courseId] = "";
    } catch (err) {
      console.error("Failed to assign strategy:", err);
    } finally {
      assigning.value[courseId] = false;
    }
  }

  async function removeAssignment(courseId: string, assignmentId: string) {
    try {
      await removeCourseStrategy(assignmentId);
      courseAssignments.value[courseId] = courseAssignments.value[
        courseId
      ].filter((a) => a.id !== assignmentId);
    } catch (err) {
      console.error("Failed to remove assignment:", err);
    }
  }

  function openCreateModal() {
    editingStrategy.value = null;
    strategyForm.name = "";
    strategyForm.code = "";
    strategyForm.description = "";
    showStrategyModal.value = true;
  }

  function editStrategy(strategy: LearningStrategy) {
    editingStrategy.value = strategy;
    strategyForm.name = strategy.name;
    strategyForm.code = strategy.code;
    strategyForm.description = strategy.description;
    showStrategyModal.value = true;
  }

  function closeStrategyModal() {
    showStrategyModal.value = false;
    editingStrategy.value = null;
  }

  async function saveStrategy() {
    saving.value = true;
    try {
      if (editingStrategy.value) {
        await updateStrategyService(editingStrategy.value.id, {
          name: strategyForm.name,
          code: strategyForm.code,
          description: strategyForm.description,
        });
      } else {
        await createStrategyService({
          name: strategyForm.name,
          code: strategyForm.code,
          description: strategyForm.description,
        });
      }

      closeStrategyModal();
      await loadData();
    } catch (err) {
      console.error("Failed to save strategy:", err);
    } finally {
      saving.value = false;
    }
  }

  function confirmDeleteStrategy(strategy: LearningStrategy) {
    deletingStrategy.value = strategy;
  }

  async function deleteStrategy() {
    if (!deletingStrategy.value) return;

    deleting.value = true;
    try {
      await deleteStrategyService(deletingStrategy.value.id);
      deletingStrategy.value = null;
    } catch (err) {
      console.error("Failed to delete strategy:", err);
    } finally {
      deleting.value = false;
    }
  }
</script>

<template>
  <TeacherLayout>
    <div class="strategy-dashboard">
      <!-- Header -->
      <div class="page-header">
        <div class="page-header__left">
          <div class="page-kicker">Configuracion avanzada</div>
          <h1 class="page-title">Estrategias de Aprendizaje</h1>
        </div>
        <div class="page-header__right">
          <button
            v-if="isAdmin"
            class="btn btn-primary"
            @click="openCreateModal"
          >
            <i class="pi pi-plus"></i>
            Nueva estrategia
          </button>
        </div>
      </div>

      <!-- Loading skeleton -->
      <template v-if="loading">
        <section class="content-section">
          <div class="section-header">
            <div>
              <Skeleton width="180px" height="24px" />
              <Skeleton width="320px" height="14px" />
            </div>
          </div>
          <div class="strategies-grid">
            <div
              v-for="i in 3"
              :key="i"
              class="strategy-card strategy-card--skeleton"
            >
              <div class="strategy-header">
                <Skeleton width="140px" height="20px" />
                <div style="display: flex; gap: 6px">
                  <Skeleton variant="circle" size="28px" />
                  <Skeleton variant="circle" size="28px" />
                </div>
              </div>
              <Skeleton width="100%" height="14px" style="margin: 12px 0" />
              <Skeleton width="80%" height="14px" />
              <div style="display: flex; gap: 8px; margin-top: 16px">
                <Skeleton width="80px" height="24px" rounded />
                <Skeleton width="100px" height="24px" rounded />
              </div>
            </div>
          </div>
        </section>
      </template>

      <template v-else>
        <StrategyCatalog
          :strategies="strategies"
          :is-admin="isAdmin"
          @create="openCreateModal"
          @edit="editStrategy"
          @delete="confirmDeleteStrategy"
        />

        <CourseStrategyAssignments
          :courses="courses"
          :strategies="strategies"
          :course-assignments="courseAssignments"
          :selected-strategy-for-course="selectedStrategyForCourse"
          :assigning="assigning"
          @update:selected-strategy-for-course="
            selectedStrategyForCourse = $event
          "
          @assign="assignStrategy"
          @remove="removeAssignment"
        />
      </template>

      <!-- Create/Edit Strategy Modal -->
      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="showStrategyModal"
            class="modal-overlay"
            @click.self="closeStrategyModal"
          >
            <div class="modal-box">
              <div class="modal-head">
                <h3 class="modal-title">
                  {{
                    editingStrategy ? "Editar estrategia" : "Nueva estrategia"
                  }}
                </h3>
                <button class="icon-btn" @click="closeStrategyModal">
                  <i class="pi pi-times"></i>
                </button>
              </div>

              <form @submit.prevent="saveStrategy">
                <div class="form-group">
                  <label class="form-label">Nombre *</label>
                  <input
                    v-model="strategyForm.name"
                    class="form-input"
                    placeholder="Ej: Aprendizaje adaptativo"
                    required
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Código *</label>
                  <input
                    v-model="strategyForm.code"
                    class="form-input"
                    placeholder="Ej: adaptive_practice"
                    required
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Descripcion</label>
                  <textarea
                    v-model="strategyForm.description"
                    class="form-textarea"
                    placeholder="Describe como funciona esta estrategia..."
                    rows="3"
                  ></textarea>
                </div>
                <div class="modal-actions">
                  <button
                    type="button"
                    class="btn btn-secondary"
                    @click="closeStrategyModal"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    class="btn btn-primary"
                    :disabled="saving"
                  >
                    <span v-if="saving" class="spinner spinner-sm"></span>
                    <i v-else class="pi pi-check"></i>
                    {{
                      editingStrategy ? "Guardar cambios" : "Crear estrategia"
                    }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Delete Confirmation Modal -->
      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="deletingStrategy"
            class="modal-overlay"
            @click.self="deletingStrategy = null"
          >
            <div class="modal-box">
              <h3 class="modal-title">Eliminar estrategia</h3>
              <p class="submit-copy">
                ¿Estas seguro de eliminar la estrategia
                <strong>{{ deletingStrategy.name }}</strong
                >? Esta accion no se puede deshacer.
              </p>
              <div class="modal-actions">
                <button
                  class="btn btn-secondary"
                  @click="deletingStrategy = null"
                >
                  Cancelar
                </button>
                <button
                  class="btn btn-danger"
                  :disabled="deleting"
                  @click="deleteStrategy"
                >
                  <span v-if="deleting" class="spinner spinner-sm"></span>
                  <i v-else class="pi pi-trash"></i>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </TeacherLayout>
</template>

<style scoped>
  .strategy-dashboard {
    padding: 24px 28px 40px;
    max-width: 1200px;
  }

  /* Header */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
    padding: 24px 28px;
    border-radius: 28px;
    background: var(--gradient-card-accent);
    border: 1px solid var(--surface-elevated-strong);
    box-shadow: var(--shadow-soft);
  }

  .page-kicker {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-weight: 700;
    color: var(--practiq-violet);
    margin-bottom: 2px;
  }

  .page-title {
    font-size: var(--font-hero);
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
  }

  /* Loading & Empty */
  .loading-state {
    display: flex;
    justify-content: center;
    padding: 80px;
  }

  .empty-state {
    text-align: center;
    padding: 48px 24px;
    background: var(--surface-glass);
    border-radius: var(--radius-2xl);
    border: 1px dashed rgba(var(--surface-border-rgb), 0.3);
  }

  .empty-icon {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-xl);
    background: var(--fill-primary-subtle);
    display: grid;
    place-items: center;
    margin: 0 auto 16px;
    font-size: 24px;
    color: var(--practiq-violet);
  }

  .empty-state h3 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .empty-state p {
    font-size: var(--text-md);
    color: var(--text-secondary);
    margin-bottom: 20px;
  }

  /* Sections */
  .content-section {
    margin-bottom: 32px;
  }

  .section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  /* Strategies Grid */
  .strategies-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 16px;
  }

  .strategy-card {
    background: var(--surface-elevated);
    border-radius: var(--radius-2xl);
    border: 1px solid var(--surface-elevated-strong);
    box-shadow: var(--shadow-card);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .strategy-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .icon-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(var(--surface-border-rgb), 0.2);
    background: transparent;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.15s;
  }

  .icon-btn:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .icon-btn--danger:hover {
    background: rgba(var(--color-error-rgb), 0.1);
    color: var(--color-error);
    border-color: rgba(var(--color-error-rgb), 0.3);
  }

  /* Modal */
  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .form-textarea--code {
    font-family: monospace;
    font-size: var(--text-sm);
  }

  .form-error {
    display: block;
    color: var(--color-error);
    font-size: var(--text-sm);
    margin-top: 4px;
  }

  .btn-danger {
    background: var(--color-error);
    color: white;
    border: none;
  }

  .btn-danger:hover {
    opacity: 0.9;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .strategy-dashboard {
      padding: 20px 16px 40px;
    }

    .strategies-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
      padding: 20px;
    }

    /* Tap targets >= 44px en mobile */
    .icon-btn {
      width: 44px;
      height: 44px;
    }
  }
</style>
