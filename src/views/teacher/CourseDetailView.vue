<template>
  <TeacherLayout>
    <div class="course-detail">
      <div class="course-header">
        <button class="btn btn-ghost btn-sm" @click="router.back()">
          <i class="pi pi-arrow-left"></i> Volver
        </button>
        <div v-if="course">
          <h1 class="page-title">{{ course.title }}</h1>
          <div class="course-badges">
            <span class="badge badge-violet">{{
              course.subject || "General"
            }}</span>
            <span class="badge badge-muted">{{
              course.level || "Sin nivel"
            }}</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ 'tab-active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <i :class="tab.icon"></i> {{ tab.label }}
        </button>
      </div>

      <!-- TAB: Niveles -->
      <CourseLevelsPanel
        v-if="activeTab === 'levels'"
        :levels="teacherLevels"
        @create-next-level="createNextLevel"
        @create-practice="openPracticeForLevel"
        @create-level-test="openLevelTestForLevel"
        @create-notebook="openNotebookForLevel"
        @open-sheet="goToSheet"
        @open-notebook="openNotebook"
      />

      <!-- TAB: Temas -->
      <TopicsList
        v-if="activeTab === 'topics'"
        :topics="topics"
        :editing-topic-id="editingTopicId"
        :edit-topic-title="editTopicTitle"
        @create="showTopicModal = true"
        @edit="startTopicEdit"
        @delete="deleteTopic"
        @save="saveTopicEdit"
        @cancel-edit="editingTopicId = null"
        @update:edit-topic-title="editTopicTitle = $event"
      />

      <!-- TAB: Ejercicios -->
      <ExercisesList
        v-if="activeTab === 'exercises'"
        :topics="topics"
        :selected-topic-id="selectedTopicId"
        :exercises="exercises"
        @update:selected-topic-id="selectedTopicId = $event"
        @create="showExerciseModal = true"
        @edit="openEditExercise"
        @delete="deleteExercise"
      />

      <!-- TAB: Materiales -->
      <MaterialsList
        v-if="activeTab === 'materials'"
        :materials="materials"
        @create="showMaterialModal = true"
        @delete="deleteMaterial"
      />

      <!-- TAB: Alumnos -->
      <StudentsList
        v-if="activeTab === 'students'"
        :students="students"
      />

      <!-- TAB: Hojas de Práctica -->
      <PracticeSheetsList
        v-if="activeTab === 'sheets'"
        :sheets="sheets"
        @create="openNewSheet"
        @edit="openEditSheet"
        @delete="deleteSheet"
      />

      <!-- TAB: Cuadernos -->
      <NotebooksList
        v-if="activeTab === 'notebooks'"
        :notebooks="notebooks"
        @create="showNotebookModal = true"
        @open="openNotebook"
        @edit="openEditNotebook"
        @delete="deleteNotebook"
      />
    </div>

    <TopicModal
      :visible="showTopicModal"
      :topic="newTopic"
      @close="showTopicModal = false"
      @submit="createTopic"
      @update:topic="Object.assign(newTopic, $event)"
    />

    <!-- Exercise Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showExerciseModal"
          class="modal-overlay"
          @click.self="showExerciseModal = false"
        >
          <div class="modal-box">
            <h3 class="modal-title">Nuevo Ejercicio</h3>
            <form @submit.prevent="createExercise">
              <div class="form-group">
                <label class="form-label">Tipo *</label>
                <select v-model="newExercise.type" class="form-select" required>
                  <option value="open_text">Texto abierto</option>
                  <option value="equation">Ecuación</option>
                  <option value="multiple_choice">Opción múltiple</option>
                  <option value="canvas">Canvas/Dibujo</option>
                  <option value="handwritten">Escrito a mano</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Pregunta *</label>
                <template v-if="newExercise.type === 'equation'">
                  <div class="equation-editor-wrap">
                    <div class="equation-editor-label">Editor de ecuación</div>
                    <MathFieldEditor v-model="newExercise.question" />
                  </div>
                  <div class="field-hint">
                    Usa el teclado virtual o escribe LaTeX directamente.
                    Ejemplo: \frac{2x+4}{3}=10
                  </div>
                </template>
                <textarea
                  v-else
                  v-model="newExercise.question"
                  class="form-textarea"
                  :class="{
                    'form-textarea--large': needsLargeQuestionInput(
                      newExercise.type,
                    ),
                  }"
                  :placeholder="questionPlaceholder(newExercise.type)"
                  :required="newExercise.type !== 'handwritten'"
                  :rows="needsLargeQuestionInput(newExercise.type) ? 6 : 2"
                ></textarea>
              </div>
              <div v-if="newExercise.type === 'handwritten'" class="form-group">
                <label class="form-label">Consigna manuscrita</label>
                <div class="teacher-canvas-wrap">
                  <div class="teacher-canvas-toolbar">
                    <span>Escribe aquí el ejercicio que verá el alumno</span>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      @click="clearTeacherCanvas('new')"
                    >
                      <i class="pi pi-trash"></i> Limpiar
                    </button>
                  </div>
                  <canvas
                    :ref="
                      (el) =>
                        setTeacherCanvasRef(
                          'new',
                          el as HTMLCanvasElement | null,
                        )
                    "
                    class="teacher-canvas"
                    @mousedown="startTeacherDraw($event, 'new')"
                    @mousemove="drawTeacherCanvas($event, 'new')"
                    @mouseup="stopTeacherDraw('new')"
                    @mouseleave="stopTeacherDraw('new')"
                    @touchstart.prevent="startTeacherDrawTouch($event, 'new')"
                    @touchmove.prevent="drawTeacherCanvasTouch($event, 'new')"
                    @touchend="stopTeacherDraw('new')"
                  ></canvas>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Respuesta correcta</label>
                <template v-if="newExercise.type === 'equation'">
                  <MathFieldEditor
                    v-model="newExercise.correct_answer"
                    :show-latex-toggle="false"
                    virtual-keyboard-mode="manual"
                  />
                  <div class="field-hint">
                    Escribe la respuesta esperada. Ejemplo: x=13
                  </div>
                </template>
                <input
                  v-else
                  v-model="newExercise.correct_answer"
                  class="form-input"
                  :placeholder="answerPlaceholder(newExercise.type)"
                />
              </div>
              <div
                v-if="newExercise.type === 'multiple_choice'"
                class="form-group"
              >
                <label class="form-label">Opciones</label>
                <div class="options-editor">
                  <input
                    v-for="(_, idx) in newExercise.options"
                    :key="idx"
                    v-model="newExercise.options[idx]"
                    class="form-input"
                    :placeholder="`Opción ${idx + 1}`"
                  />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Explicación</label>
                <textarea
                  v-model="newExercise.explanation"
                  class="form-textarea"
                  rows="2"
                ></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Dificultad (1-10)</label>
                <input
                  v-model.number="newExercise.difficulty"
                  type="number"
                  class="form-input"
                  min="1"
                  max="10"
                />
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="showExerciseModal = false"
                >
                  Cancelar
                </button>
                <button type="submit" class="btn btn-primary">
                  Crear Ejercicio
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Material Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showMaterialModal"
          class="modal-overlay"
          @click.self="showMaterialModal = false"
        >
          <div class="modal-box">
            <h3 class="modal-title">Agregar Material</h3>
            <form @submit.prevent="createMaterial">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input
                  v-model="newMaterial.title"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">Tipo *</label>
                <select v-model="newMaterial.type" class="form-select" required>
                  <option value="text">Texto</option>
                  <option value="pdf">PDF</option>
                  <option value="image">Imagen</option>
                  <option value="video">Video</option>
                  <option value="worksheet">Hoja de trabajo</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Contenido</label>
                <textarea
                  v-model="newMaterial.extracted_text"
                  class="form-textarea"
                  rows="4"
                  placeholder="Escribe el contenido del material..."
                ></textarea>
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="showMaterialModal = false"
                >
                  Cancelar
                </button>
                <button type="submit" class="btn btn-primary">Agregar</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Practice Sheet Modal -->
    <Teleport to="body">
      <!-- Notebook Modal -->
      <Transition name="fade">
        <div
          v-if="showNotebookModal"
          class="modal-overlay"
          @click.self="showNotebookModal = false"
        >
          <div class="modal-box">
            <h3 class="modal-title">Nuevo Cuaderno</h3>
            <form @submit.prevent="createNotebook">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input
                  v-model="newNotebook.title"
                  class="form-input"
                  placeholder="Cuaderno de Matemáticas"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea
                  v-model="newNotebook.description"
                  class="form-textarea"
                  rows="2"
                  placeholder="Descripción opcional"
                ></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Nivel</label>
                <input
                  v-model.number="newNotebook.level"
                  type="number"
                  min="1"
                  class="form-input"
                />
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="showNotebookModal = false"
                >
                  Cancelar
                </button>
                <button type="submit" class="btn btn-primary">
                  Crear Cuaderno
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div
          v-if="showSheetModal"
          class="modal-overlay"
          @click.self="showSheetModal = false"
        >
          <div class="modal-box">
            <h3 class="modal-title">Nueva Hoja de Práctica</h3>
            <form @submit.prevent="createSheet">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input v-model="newSheet.title" class="form-input" required />
              </div>
              <div class="form-group">
                <label class="form-label">Tema</label>
                <select v-model="newSheet.topic_id" class="form-select">
                  <option value="">Sin tema específico</option>
                  <option v-for="t in topics" :key="t.id" :value="t.id">
                    {{ t.title }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Tipo</label>
                <select v-model="newSheet.sheet_type" class="form-input">
                  <option value="practice">Hoja de Práctica</option>
                  <option value="level_test">🏆 Prueba de Nivel</option>
                </select>
              </div>
              <div
                v-if="newSheet.sheet_type === 'level_test'"
                class="form-group"
              >
                <label class="form-label">Estilo de respuesta</label>
                <select v-model="newSheet.test_style" class="form-input">
                  <option value="keyboard">⌨️ Teclado (texto)</option>
                  <option value="canvas">✏️ Hoja (dibujar)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Nivel</label>
                <input
                  v-model.number="newSheet.level"
                  type="number"
                  class="form-input"
                  min="1"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Ejercicios (seleccionar)</label>
                <div class="exercise-selector">
                  <div
                    v-if="sheetExercises.length === 0"
                    class="empty-inline empty-inline--compact"
                  >
                    {{
                      newSheet.topic_id
                        ? "Este tema no tiene ejercicios aún."
                        : "Selecciona un tema para ver los ejercicios."
                    }}
                  </div>
                  <label
                    v-for="ex in sheetExercises"
                    :key="ex.id"
                    class="exercise-checkbox"
                  >
                    <input
                      type="checkbox"
                      :value="ex.id"
                      v-model="newSheet.exercise_ids"
                    />
                    <span>{{ ex.question.slice(0, 60) }}...</span>
                  </label>
                </div>
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="showSheetModal = false"
                >
                  Cancelar
                </button>
                <button type="submit" class="btn btn-primary">
                  Crear Hoja
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit Sheet Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showEditSheetModal"
          class="modal-overlay"
          @click.self="showEditSheetModal = false"
        >
          <div class="modal-box">
            <h3 class="modal-title">Editar Hoja de Práctica</h3>
            <form @submit.prevent="saveSheetEdit">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input v-model="editSheet.title" class="form-input" required />
              </div>
              <div class="form-group">
                <label class="form-label">Tema</label>
                <select v-model="editSheet.topic_id" class="form-select">
                  <option value="">Sin tema específico</option>
                  <option v-for="t in topics" :key="t.id" :value="t.id">
                    {{ t.title }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Tipo</label>
                <select v-model="editSheet.sheet_type" class="form-select">
                  <option value="practice">Hoja de Práctica</option>
                  <option value="level_test">🏆 Prueba de Nivel</option>
                </select>
              </div>
              <div
                v-if="editSheet.sheet_type === 'level_test'"
                class="form-group"
              >
                <label class="form-label">Estilo de respuesta</label>
                <select v-model="editSheet.test_style" class="form-select">
                  <option value="keyboard">⌨️ Teclado (texto)</option>
                  <option value="canvas">✏️ Hoja (dibujar)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Nivel</label>
                <input
                  v-model.number="editSheet.level"
                  type="number"
                  class="form-input"
                  min="1"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Ejercicios</label>
                <div class="exercise-selector">
                  <div
                    v-if="editSheetExercises.length === 0"
                    class="empty-inline empty-inline--compact"
                  >
                    {{
                      editSheet.topic_id
                        ? "Este tema no tiene ejercicios aún."
                        : "Selecciona un tema para ver los ejercicios."
                    }}
                  </div>
                  <label
                    v-for="ex in editSheetExercises"
                    :key="ex.id"
                    class="exercise-checkbox"
                  >
                    <input
                      type="checkbox"
                      :value="ex.id"
                      v-model="editSheet.exercise_ids"
                    />
                    <span>{{ ex.question.slice(0, 60) }}...</span>
                  </label>
                </div>
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="showEditSheetModal = false"
                >
                  Cancelar
                </button>
                <button type="submit" class="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit Exercise Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showEditExerciseModal"
          class="modal-overlay"
          @click.self="showEditExerciseModal = false"
        >
          <div class="modal-box">
            <h3 class="modal-title">Editar Ejercicio</h3>
            <form @submit.prevent="saveExerciseEdit">
              <div class="form-group">
                <label class="form-label">Tipo *</label>
                <select
                  v-model="editExercise.type"
                  class="form-select"
                  required
                >
                  <option value="open_text">Texto abierto</option>
                  <option value="equation">Ecuación</option>
                  <option value="multiple_choice">Opción múltiple</option>
                  <option value="canvas">Canvas/Dibujo</option>
                  <option value="handwritten">Escrito a mano</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Pregunta *</label>
                <template v-if="editExercise.type === 'equation'">
                  <div class="equation-editor-wrap">
                    <div class="equation-editor-label">Editor de ecuación</div>
                    <MathFieldEditor v-model="editExercise.question" />
                  </div>
                  <div class="field-hint">
                    Usa el teclado virtual o escribe LaTeX directamente.
                    Ejemplo: \frac{2x+4}{3}=10
                  </div>
                </template>
                <textarea
                  v-else
                  v-model="editExercise.question"
                  class="form-textarea"
                  :class="{
                    'form-textarea--large': needsLargeQuestionInput(
                      editExercise.type,
                    ),
                  }"
                  :placeholder="questionPlaceholder(editExercise.type)"
                  :rows="needsLargeQuestionInput(editExercise.type) ? 6 : 2"
                  :required="editExercise.type !== 'handwritten'"
                ></textarea>
              </div>
              <div
                v-if="editExercise.type === 'handwritten'"
                class="form-group"
              >
                <label class="form-label">Consigna manuscrita</label>
                <div class="teacher-canvas-wrap">
                  <div class="teacher-canvas-toolbar">
                    <span>Escribe aquí el ejercicio que verá el alumno</span>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      @click="clearTeacherCanvas('edit')"
                    >
                      <i class="pi pi-trash"></i> Limpiar
                    </button>
                  </div>
                  <canvas
                    :ref="
                      (el) =>
                        setTeacherCanvasRef(
                          'edit',
                          el as HTMLCanvasElement | null,
                        )
                    "
                    class="teacher-canvas"
                    @mousedown="startTeacherDraw($event, 'edit')"
                    @mousemove="drawTeacherCanvas($event, 'edit')"
                    @mouseup="stopTeacherDraw('edit')"
                    @mouseleave="stopTeacherDraw('edit')"
                    @touchstart.prevent="startTeacherDrawTouch($event, 'edit')"
                    @touchmove.prevent="drawTeacherCanvasTouch($event, 'edit')"
                    @touchend="stopTeacherDraw('edit')"
                  ></canvas>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Respuesta correcta</label>
                <template v-if="editExercise.type === 'equation'">
                  <MathFieldEditor
                    v-model="editExercise.correct_answer"
                    :show-latex-toggle="false"
                    virtual-keyboard-mode="manual"
                  />
                  <div class="field-hint">
                    Escribe la respuesta esperada. Ejemplo: x=13
                  </div>
                </template>
                <input
                  v-else
                  v-model="editExercise.correct_answer"
                  class="form-input"
                  :placeholder="answerPlaceholder(editExercise.type)"
                />
              </div>
              <div
                v-if="editExercise.type === 'multiple_choice'"
                class="form-group"
              >
                <label class="form-label">Opciones</label>
                <div class="options-editor">
                  <input
                    v-for="(_, idx) in editExercise.options"
                    :key="idx"
                    v-model="editExercise.options[idx]"
                    class="form-input"
                    :placeholder="`Opción ${idx + 1}`"
                  />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Explicación</label>
                <textarea
                  v-model="editExercise.explanation"
                  class="form-textarea"
                  rows="2"
                ></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Dificultad (1-10)</label>
                <input
                  v-model.number="editExercise.difficulty"
                  type="number"
                  class="form-input"
                  min="1"
                  max="10"
                />
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="showEditExerciseModal = false"
                >
                  Cancelar
                </button>
                <button type="submit" class="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit Notebook Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showEditNotebookModal"
          class="modal-overlay"
          @click.self="showEditNotebookModal = false"
        >
          <div class="modal-box">
            <h3 class="modal-title">Editar Cuaderno</h3>
            <form @submit.prevent="saveNotebookEdit">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input
                  v-model="editNotebook.title"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea
                  v-model="editNotebook.description"
                  class="form-textarea"
                  rows="2"
                ></textarea>
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="showEditNotebookModal = false"
                >
                  Cancelar
                </button>
                <button type="submit" class="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmModal
      v-bind="confirmState"
      @confirm="onConfirm"
      @cancel="onCancel"
    />
  </TeacherLayout>
</template>

<script setup lang="ts">
  import { computed, ref, reactive, onMounted, watch, nextTick } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import ConfirmModal from "@/components/ui/ConfirmModal.vue";
  import MathFieldEditor from "@/components/ui/MathFieldEditor.vue";
  import ExercisesList from "@/components/teacher/exercises/ExercisesList.vue";
  import CourseLevelsPanel from "@/components/teacher/levels/CourseLevelsPanel.vue";
  import MaterialsList from "@/components/teacher/materials/MaterialsList.vue";
  import NotebooksList from "@/components/teacher/notebooks/NotebooksList.vue";
  import PracticeSheetsList from "@/components/teacher/practiceSheets/PracticeSheetsList.vue";
  import StudentsList from "@/components/teacher/students/StudentsList.vue";
  import TopicModal from "@/components/teacher/topics/TopicModal.vue";
  import TopicsList from "@/components/teacher/topics/TopicsList.vue";
  import { useConfirm } from "@/composables/useConfirm";
  import { useCourse } from "@/composables/useCourse";
  import { useTopic } from "@/composables/useTopic";
  import { useExercise } from "@/composables/useExercise";
  import { usePracticeSheet } from "@/composables/usePracticeSheet";
  import { useMaterial } from "@/composables/useMaterial";
  import { useNotebook } from "@/composables/useNotebook";
  import { useLevel } from "@/composables/useLevel";
  import type {
    Topic,
    Exercise,
    Material,
    PracticeSheet,
    Notebook,
    CourseLevelsResponse,
  } from "@/types";
  import { parseExerciseMetadata } from "@/utils/assistantExerciseContext";
  import { renderContent } from "@/composables/useContentRenderer";

  const route = useRoute();
  const router = useRouter();
  const courseId = route.params.id as string;
  const { confirmState, showConfirm, onConfirm, onCancel } = useConfirm();
  const {
    currentCourse: course,
    students,
    loadCourse,
    loadStudents,
  } = useCourse();
  const {
    topics,
    loadTopics,
    createTopic: createTopicService,
    updateTopic: updateTopicService,
    deleteTopic: deleteTopicService,
  } = useTopic();
  const {
    exercises,
    loadExercises,
    createExercise: createExerciseService,
    updateExercise: updateExerciseService,
    deleteExercise: deleteExerciseService,
  } = useExercise();
  const {
    loadPracticeSheets,
    createPracticeSheet,
    updatePracticeSheet,
    deletePracticeSheet: deletePracticeSheetService,
  } = usePracticeSheet();
  const {
    loadMaterials,
    createMaterial: createMaterialService,
    deleteMaterial: deleteMaterialService,
  } = useMaterial();
  const {
    loadNotebooks,
    createNotebook: createNotebookService,
    updateNotebook: updateNotebookService,
    deleteNotebook: deleteNotebookService,
  } = useNotebook();
  const { loadCourseLevels } = useLevel();
  const materials = ref<Material[]>([]);
  const sheets = ref<PracticeSheet[]>([]);
  const notebooks = ref<Notebook[]>([]);
  const courseLevels = ref<CourseLevelsResponse | null>(null);
  const selectedTopicId = ref("");
  const sheetExercises = ref<Exercise[]>([]);

  const activeTab = ref("levels");
  const tabs = [
    { id: "levels", label: "Niveles", icon: "pi pi-sitemap" },
    { id: "topics", label: "Temas", icon: "pi pi-list" },
    { id: "exercises", label: "Ejercicios", icon: "pi pi-pencil" },
    { id: "materials", label: "Materiales", icon: "pi pi-file" },
    { id: "students", label: "Alumnos", icon: "pi pi-users" },
    { id: "sheets", label: "Hojas de Práctica", icon: "pi pi-copy" },
    { id: "notebooks", label: "Cuadernos", icon: "pi pi-book" },
  ];

  const showTopicModal = ref(false);
  const showExerciseModal = ref(false);
  const showMaterialModal = ref(false);
  const showSheetModal = ref(false);
  const showNotebookModal = ref(false);
  const showEditSheetModal = ref(false);
  const showEditNotebookModal = ref(false);
  const showEditExerciseModal = ref(false);

  // Inline topic edit state
  const editingTopicId = ref<string | null>(null);
  const editTopicTitle = ref("");

  // Edit sheet state
  const editingSheetId = ref<string | null>(null);
  const editSheet = reactive({
    title: "",
    topic_id: "",
    level: 1,
    sheet_type: "practice",
    test_style: "keyboard",
    exercise_ids: [] as string[],
  });
  const editSheetExercises = ref<Exercise[]>([]);

  // Edit notebook state
  const editingNotebookId = ref<string | null>(null);
  const editNotebook = reactive({ title: "", description: "" });

  // Edit exercise state
  const editingExerciseId = ref<string | null>(null);
  const editExercise = reactive({
    question: "",
    type: "open_text" as Exercise["type"],
    correct_answer: "",
    explanation: "",
    difficulty: 1,
    metadata: "{}",
    teacher_image: "",
    options: ["", "", "", ""],
  });

  const newTopic = reactive({ title: "", description: "", order_index: 0 });
  const newExercise = reactive({
    question: "",
    type: "open_text" as Exercise["type"],
    correct_answer: "",
    explanation: "",
    difficulty: 1,
    metadata: "{}",
    teacher_image: "",
    options: ["", "", "", ""],
  });
  const newMaterial = reactive({
    title: "",
    type: "text" as Material["type"],
    extracted_text: "",
  });
  const newSheet = reactive({
    title: "",
    topic_id: "",
    level: 1,
    sheet_type: "practice",
    test_style: "keyboard",
    exercise_ids: [] as string[],
  });
  const newNotebook = reactive({ title: "", description: "", level: 1 });

  const teacherLevels = computed(() => {
    if (courseLevels.value?.levels?.length) {
      return courseLevels.value.levels.map((ld) => ({
        level: ld.level,
        practices: ld.practices,
        levelTest: ld.level_test,
        notebooks: ld.notebooks,
      }));
    }
    const maxFromSheets = sheets.value.reduce(
      (max, sheet) => Math.max(max, sheet.level || 1),
      1,
    );
    const maxFromNotebooks = notebooks.value.reduce(
      (max, notebook) => Math.max(max, notebook.level || 1),
      1,
    );
    const maxLevel = Math.max(maxFromSheets, maxFromNotebooks, 1);

    return Array.from({ length: maxLevel }, (_, index) => {
      const level = index + 1;
      return {
        level,
        practices: sheets.value.filter(
          (sheet) => sheet.level === level && sheet.sheet_type !== "level_test",
        ),
        levelTest:
          sheets.value.find(
            (sheet) =>
              sheet.level === level && sheet.sheet_type === "level_test",
          ) || null,
        notebooks: notebooks.value.filter(
          (notebook) => (notebook.level || 1) === level,
        ),
      };
    });
  });

  type TeacherCanvasKind = "new" | "edit";
  const teacherCanvasRefs: Record<TeacherCanvasKind, HTMLCanvasElement | null> =
    { new: null, edit: null };
  const teacherDrawing: Record<TeacherCanvasKind, boolean> = {
    new: false,
    edit: false,
  };
  const teacherLastPos: Record<TeacherCanvasKind, { x: number; y: number }> = {
    new: { x: 0, y: 0 },
    edit: { x: 0, y: 0 },
  };

  onMounted(async () => {
    const [
      courseRes,
      topicsRes,
      materialsRes,
      studentsRes,
      sheetsRes,
      notebooksRes,
      levelsRes,
    ] = await Promise.allSettled([
      loadCourse(courseId),
      loadTopics(courseId),
      loadMaterials(courseId),
      loadStudents(courseId),
      loadPracticeSheets(courseId),
      loadNotebooks(courseId),
      loadCourseLevels(courseId),
    ]);

    if (materialsRes.status === "fulfilled")
      materials.value = materialsRes.value || [];
    if (sheetsRes.status === "fulfilled") sheets.value = sheetsRes.value || [];
    if (notebooksRes.status === "fulfilled")
      notebooks.value = notebooksRes.value || [];
    if (levelsRes.status === "fulfilled") courseLevels.value = levelsRes.value;
  });

  watch(selectedTopicId, async (id) => {
    if (!id) return;
    try {
      await loadExercises(id);
    } catch {}
  });

  watch(
    () => newSheet.topic_id,
    (id) => loadSheetExercises(id),
  );

  watch(
    () => editSheet.topic_id,
    async (id) => {
      editSheet.exercise_ids = [];
      await loadEditSheetExercises(id);
    },
  );

  watch(
    () => newExercise.type,
    async (type) => {
      if (type === "handwritten" && showExerciseModal.value) {
        await nextTick();
        initTeacherCanvas("new", newExercise.teacher_image);
      }
    },
  );

  watch(
    () => editExercise.type,
    async (type) => {
      if (type === "handwritten" && showEditExerciseModal.value) {
        await nextTick();
        initTeacherCanvas("edit", editExercise.teacher_image);
      }
    },
  );

  async function loadSheetExercises(topicId: string) {
    newSheet.exercise_ids = [];
    if (!topicId) {
      sheetExercises.value = [];
      return;
    }
    try {
      const res = await loadExercises(topicId);
      sheetExercises.value = res || [];
    } catch {
      sheetExercises.value = [];
    }
  }

  async function createTopic() {
    await createTopicService(courseId, newTopic);
    showTopicModal.value = false;
    newTopic.title = "";
    newTopic.description = "";
    newTopic.order_index = 0;
  }

  async function createExercise() {
    await createExerciseService(
      selectedTopicId.value,
      buildExercisePayload(newExercise, "new"),
    );
    showExerciseModal.value = false;
    resetExerciseForm(newExercise);
  }

  async function createMaterial() {
    await createMaterialService(courseId, newMaterial);
    showMaterialModal.value = false;
    const res = await loadMaterials(courseId);
    materials.value = res || [];
  }

  async function createSheet() {
    await createPracticeSheet(courseId, { ...newSheet });
    showSheetModal.value = false;
    newSheet.title = "";
    newSheet.topic_id = "";
    newSheet.level = 1;
    newSheet.sheet_type = "practice";
    newSheet.test_style = "keyboard";
    newSheet.exercise_ids = [];
    sheetExercises.value = [];
    const res = await loadPracticeSheets(courseId);
    sheets.value = res || [];
  }

  async function createNotebook() {
    const res = await createNotebookService(courseId, { ...newNotebook });
    showNotebookModal.value = false;
    newNotebook.title = "";
    newNotebook.description = "";
    newNotebook.level = 1;
    router.push(`/teacher/courses/${courseId}/notebooks/${res.id}`);
  }

  async function deleteExercise(id: string) {
    const ok = await showConfirm("¿Eliminar este ejercicio?");
    if (!ok) return;
    await deleteExerciseService(id);
  }

  function openNewSheet() {
    newSheet.topic_id = selectedTopicId.value;
    loadSheetExercises(newSheet.topic_id);
    showSheetModal.value = true;
  }

  function goToSheet(sheetId: string) {
    const sheet = sheets.value.find((s) => s.id === sheetId);
    if (!sheet) return;
    activeTab.value = "sheets";
    openEditSheet(sheet);
  }

  function openNotebook(notebookId: string) {
    router.push(`/teacher/courses/${courseId}/notebooks/${notebookId}`);
  }

  function openPracticeForLevel(level: number) {
    newSheet.level = level;
    newSheet.sheet_type = "practice";
    newSheet.test_style = "keyboard";
    newSheet.topic_id = selectedTopicId.value;
    loadSheetExercises(newSheet.topic_id);
    showSheetModal.value = true;
  }

  function openLevelTestForLevel(level: number) {
    newSheet.level = level;
    newSheet.sheet_type = "level_test";
    newSheet.topic_id = selectedTopicId.value;
    loadSheetExercises(newSheet.topic_id);
    showSheetModal.value = true;
  }

  function openNotebookForLevel(level: number) {
    newNotebook.level = level;
    showNotebookModal.value = true;
  }

  function createNextLevel() {
    const nextLevel = teacherLevels.value.length;
    openPracticeForLevel(nextLevel);
  }

  function startTopicEdit(topic: Topic) {
    editingTopicId.value = topic.id;
    editTopicTitle.value = topic.title;
  }

  async function saveTopicEdit(topic: Topic) {
    if (!editTopicTitle.value.trim()) return;
    await updateTopicService(topic.id, {
      title: editTopicTitle.value,
      description: topic.description,
      order_index: topic.order_index,
    });
    editingTopicId.value = null;
  }

  async function deleteTopic(id: string) {
    const ok = await showConfirm("¿Eliminar este tema?");
    if (!ok) return;
    await deleteTopicService(id);
  }

  async function deleteMaterial(id: string) {
    const ok = await showConfirm("¿Eliminar este material?");
    if (!ok) return;
    await deleteMaterialService(id);
    materials.value = materials.value.filter((m) => m.id !== id);
  }

  async function openEditSheet(sheet: PracticeSheet) {
    editingSheetId.value = sheet.id;
    editSheet.title = sheet.title;
    editSheet.topic_id = sheet.topic_id || "";
    editSheet.level = sheet.level ?? 1;
    editSheet.sheet_type = sheet.sheet_type || "practice";
    editSheet.test_style = sheet.test_style || "keyboard";
    editSheet.exercise_ids = (sheet.exercises || []).map((e) => e.exercise.id);
    await loadEditSheetExercises(editSheet.topic_id);
    showEditSheetModal.value = true;
  }

  async function loadEditSheetExercises(topicId: string) {
    if (!topicId) {
      editSheetExercises.value = [];
      return;
    }
    try {
      const res = await loadExercises(topicId);
      editSheetExercises.value = res || [];
    } catch {
      editSheetExercises.value = [];
    }
  }

  async function saveSheetEdit() {
    if (!editingSheetId.value) return;
    await updatePracticeSheet(editingSheetId.value, {
      title: editSheet.title,
      topic_id: editSheet.topic_id,
      level: editSheet.level,
      sheet_type: editSheet.sheet_type,
      test_style: editSheet.test_style,
      exercise_ids: editSheet.exercise_ids,
    });
    showEditSheetModal.value = false;
    const res = await loadPracticeSheets(courseId);
    sheets.value = res || [];
  }

  async function deleteSheet(id: string) {
    const ok = await showConfirm("¿Eliminar esta hoja de práctica?");
    if (!ok) return;
    await deletePracticeSheetService(id);
    sheets.value = sheets.value.filter((s) => s.id !== id);
  }

  function openEditExercise(ex: Exercise) {
    editingExerciseId.value = ex.id;
    editExercise.question = ex.question;
    editExercise.type = ex.type;
    editExercise.correct_answer = ex.correct_answer || "";
    editExercise.explanation = ex.explanation || "";
    editExercise.difficulty = ex.difficulty ?? 1;
    editExercise.metadata = ex.metadata || "{}";
    editExercise.teacher_image = getMetadataTeacherImage(ex.metadata);
    setExerciseOptions(editExercise, getMetadataOptions(ex.metadata));
    showEditExerciseModal.value = true;
    if (editExercise.type === "handwritten") {
      nextTick(() => initTeacherCanvas("edit", editExercise.teacher_image));
    }
  }

  async function saveExerciseEdit() {
    if (!editingExerciseId.value) return;
    await updateExerciseService(
      editingExerciseId.value,
      buildExercisePayload(editExercise, "edit"),
    );
    showEditExerciseModal.value = false;
  }

  function needsLargeQuestionInput(type: Exercise["type"]) {
    return type === "handwritten" || type === "canvas";
  }

  function questionPlaceholder(type: Exercise["type"]) {
    if (type === "handwritten") {
      return "Texto de respaldo opcional para buscar/listar el ejercicio";
    }
    if (type === "canvas") {
      return "Escribe la consigna completa que verá el alumno...";
    }
    if (type === "multiple_choice") {
      return "¿Cuánto es 12 + 5 + 8?";
    }
    if (type === "equation") {
      return "Resuelve: $\\frac{2x + 4}{3} = 10$";
    }
    return "¿Cuánto es 1/2 + 1/4?";
  }

  function answerPlaceholder(type: Exercise["type"]) {
    if (type === "equation") return "x = 13 o $x = 13$";
    if (type === "multiple_choice") return "Opción correcta";
    return "3/4";
  }

  function getMetadataOptions(metadata?: string) {
    const parsed = parseExerciseMetadata(metadata);
    const value = parsed?.options;
    return Array.isArray(value) ? value.map((option) => String(option)) : [];
  }

  function getMetadataTeacherImage(metadata?: string) {
    const parsed = parseExerciseMetadata(metadata);
    const value =
      parsed?.teacher_image ||
      parsed?.teacherImage ||
      parsed?.image_data ||
      parsed?.imageData;
    return typeof value === "string" && value.startsWith("data:image/")
      ? value
      : "";
  }

  function setExerciseOptions(
    form: typeof newExercise | typeof editExercise,
    options: string[],
  ) {
    const next = [...options];
    while (next.length < 4) next.push("");
    form.options.splice(0, form.options.length, ...next.slice(0, 8));
  }

  function buildExerciseMetadata(
    form: typeof newExercise | typeof editExercise,
    canvasKind?: TeacherCanvasKind,
  ) {
    const parsed = parseExerciseMetadata(form.metadata) || {};
    if (form.type === "multiple_choice") {
      const options = form.options
        .map((option) => option.trim())
        .filter(Boolean);
      return JSON.stringify({ ...parsed, options });
    }
    const rest = { ...parsed };
    delete rest.options;
    if (form.type === "handwritten") {
      const canvasImage = canvasKind ? captureTeacherCanvas(canvasKind) : "";
      rest.teacher_image = canvasImage || form.teacher_image;
    } else {
      delete rest.teacher_image;
    }
    return JSON.stringify(rest);
  }

  function buildExercisePayload(
    form: typeof newExercise | typeof editExercise,
    canvasKind?: TeacherCanvasKind,
  ): Partial<Exercise> {
    return {
      question:
        form.question.trim() ||
        (form.type === "handwritten" ? "Ejercicio manuscrito" : form.question),
      type: form.type,
      correct_answer: form.correct_answer,
      explanation: form.explanation,
      difficulty: form.difficulty,
      metadata: buildExerciseMetadata(form, canvasKind),
    };
  }

  function resetExerciseForm(form: typeof newExercise) {
    form.question = "";
    form.type = "open_text";
    form.correct_answer = "";
    form.explanation = "";
    form.difficulty = 1;
    form.metadata = "{}";
    form.teacher_image = "";
    setExerciseOptions(form, []);
    clearTeacherCanvas("new");
  }

  function setTeacherCanvasRef(
    kind: TeacherCanvasKind,
    el: HTMLCanvasElement | null,
  ) {
    if (teacherCanvasRefs[kind] === el) return;
    teacherCanvasRefs[kind] = el;
    if (el) {
      const form = kind === "new" ? newExercise : editExercise;
      nextTick(() => initTeacherCanvas(kind, form.teacher_image));
    }
  }

  function initTeacherCanvas(kind: TeacherCanvasKind, imageData = "") {
    const canvas = teacherCanvasRefs[kind];
    if (!canvas) return;
    const width = canvas.offsetWidth || 720;
    const height = canvas.offsetHeight || 240;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawTeacherCanvasBackground(ctx, width, height);
    if (imageData) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = imageData;
    }
  }

  function drawTeacherCanvasBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(124, 58, 237, 0.12)";
    ctx.lineWidth = 1;
    for (let y = 34; y < height; y += 34) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function getTeacherCanvasPos(e: MouseEvent, kind: TeacherCanvasKind) {
    const canvas = teacherCanvasRefs[kind];
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function startTeacherDraw(e: MouseEvent, kind: TeacherCanvasKind) {
    const canvas = teacherCanvasRefs[kind];
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    teacherDrawing[kind] = true;
    teacherLastPos[kind] = getTeacherCanvasPos(e, kind);
    ctx.beginPath();
    ctx.moveTo(teacherLastPos[kind].x, teacherLastPos[kind].y);
  }

  function drawTeacherCanvas(e: MouseEvent, kind: TeacherCanvasKind) {
    if (!teacherDrawing[kind]) return;
    const canvas = teacherCanvasRefs[kind];
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pos = getTeacherCanvasPos(e, kind);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    teacherLastPos[kind] = pos;
  }

  function stopTeacherDraw(kind: TeacherCanvasKind) {
    teacherDrawing[kind] = false;
    const form = kind === "new" ? newExercise : editExercise;
    form.teacher_image = captureTeacherCanvas(kind);
  }

  function startTeacherDrawTouch(e: TouchEvent, kind: TeacherCanvasKind) {
    const touch = e.touches[0];
    if (!touch) return;
    startTeacherDraw(
      { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent,
      kind,
    );
  }

  function drawTeacherCanvasTouch(e: TouchEvent, kind: TeacherCanvasKind) {
    const touch = e.touches[0];
    if (!touch) return;
    drawTeacherCanvas(
      { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent,
      kind,
    );
  }

  function clearTeacherCanvas(kind: TeacherCanvasKind) {
    initTeacherCanvas(kind);
    const form = kind === "new" ? newExercise : editExercise;
    form.teacher_image = "";
  }

  function captureTeacherCanvas(kind: TeacherCanvasKind) {
    return teacherCanvasRefs[kind]?.toDataURL("image/png") || "";
  }

  function openEditNotebook(nb: Notebook) {
    editingNotebookId.value = nb.id;
    editNotebook.title = nb.title;
    editNotebook.description = nb.description || "";
    showEditNotebookModal.value = true;
  }

  async function saveNotebookEdit() {
    if (!editingNotebookId.value) return;
    await updateNotebookService(editingNotebookId.value, {
      title: editNotebook.title,
      description: editNotebook.description,
    });
    showEditNotebookModal.value = false;
    notebooks.value = await loadNotebooks(courseId);
  }

  async function deleteNotebook(id: string) {
    const ok = await showConfirm("¿Eliminar este cuaderno?");
    if (!ok) return;
    await deleteNotebookService(id);
    notebooks.value = notebooks.value.filter((n) => n.id !== id);
  }
</script>

<style scoped>
  .course-detail {
    padding: 24px 28px 40px;
    max-width: 1180px;
  }

  .course-header {
    position: relative;
    margin-bottom: 18px;
    padding: 24px 28px;
    border-radius: 28px;
    background: var(--gradient-card-accent);
    border: 1px solid var(--surface-elevated-strong);
    box-shadow: var(--shadow-soft);
    backdrop-filter: blur(18px);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    overflow: hidden;
  }

  .course-header > .btn {
    align-self: flex-start;
    width: auto;
    flex: 0 0 auto;
  }

  .course-header::after {
    content: "";
    position: absolute;
    right: 28px;
    bottom: -52px;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: var(--gradient-brand-soft);
    pointer-events: none;
  }

  .course-header > * {
    position: relative;
    z-index: 1;
  }

  .page-title {
    font-size: clamp(1.4rem, 2.4vw, 2rem);
    font-weight: 800;
    color: var(--text-heading);
    line-height: 1.12;
    margin: 0;
  }

  .course-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }

  .badge-muted {
    background: var(--surface-hover);
    color: var(--text-secondary);
  }

  .tabs {
    display: flex;
    gap: 8px;
    padding: 8px;
    border-radius: var(--radius-2xl);
    background: var(--surface-glass);
    border: 1px solid var(--surface-elevated-strong);
    box-shadow: var(--shadow-card);
    margin-bottom: 24px;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .tab {
    padding: 10px 14px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-xl);
    font-size: var(--text-base);
    font-weight: 700;
    color: var(--text-secondary);
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  .tab:hover {
    background: var(--surface-elevated-strong);
    color: var(--text-heading);
  }

  .tab-active {
    color: var(--practiq-violet-dark);
    background: var(--gradient-brand-soft);
    border-color: rgba(var(--practiq-violet-rgb), 0.18);
  }

.empty-inline {
  color: var(--text-muted);
  font-size: var(--text-md);
    padding: 24px 18px;
    border: 1px dashed rgba(var(--surface-border-rgb), 0.3);
    border-radius: var(--radius-xl);
    background: var(--surface-glass);
  }

.empty-inline--compact {
  padding: 12px;
}
  .exercise-selector {
    border: 1px solid rgba(var(--surface-border-rgb), 0.2);
    border-radius: var(--radius-lg);
    padding: 8px;
    max-height: 180px;
    overflow-y: auto;
    background: var(--surface-subtle);
  }
  .exercise-checkbox {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 4px;
    cursor: pointer;
    font-size: var(--text-base);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
  }

  .exercise-checkbox:hover {
    background: var(--surface-hover);
  }
  .options-editor {
    display: grid;
    gap: 8px;
  }
  .form-textarea--large {
    min-height: 180px;
  }
  .field-hint {
    margin-top: 6px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }
  .math-preview {
    margin-top: 10px;
    padding: 12px 14px;
    border: 1px solid rgba(var(--practiq-violet-rgb), 0.16);
    border-radius: var(--radius-md);
    background: var(--surface-subtle);
    color: var(--text-primary);
  }
  .math-preview-label {
    margin-bottom: 6px;
    font-size: var(--text-xs);
    font-weight: 800;
    text-transform: uppercase;
    color: var(--text-secondary);
  }
  .equation-editor-wrap {
    display: grid;
    gap: 6px;
  }
  .equation-editor-label {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--practiq-violet);
  }
  .teacher-canvas-wrap {
    display: grid;
    gap: 8px;
  }
  .teacher-canvas-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }
  .teacher-canvas {
    width: 100%;
    height: 240px;
    display: block;
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.18);
    border-radius: var(--radius-lg);
    background: #ffffff;
    cursor: crosshair;
    touch-action: none;
    box-shadow: var(--shadow-card);
  }
  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
  }
/* Tablet landscape */
@media (max-width: 1024px) {
  .course-detail {
    padding: 20px 20px 40px;
  }
}

  /* Tablet portrait */
  @media (max-width: 768px) {
    .course-detail {
      padding: 16px 14px 32px;
      max-width: 100%;
    }
    .course-header {
      padding: 22px 18px;
      border-radius: 22px;
    }
}

/* Mobile */
@media (max-width: 600px) {
  .tabs {
    margin-left: -4px;
      margin-right: -4px;
    }
    .tab {
      padding: 9px 12px;
    }
    .modal-actions {
      flex-direction: column-reverse;
    }
    .modal-actions .btn {
      width: 100%;
    }
  }
</style>
