<script setup lang="ts">
import UiModal from '@/components/ui/UiModal.vue';
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import TeacherLayout from '@/layouts/TeacherLayout.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import { useCourse } from '@/composables/useCourse';
import { useNotebook } from '@/composables/useNotebook';
import { useGrade } from '@/composables/useGrade';
import { useSubject } from '@/composables/useSubject';
import { useToast } from '@/composables/useToast';
import { formatDateTime } from '@/utils/formatters';
import type { NotebookSubmissionFull } from '@/types';

function effectiveVerdict(submission: NotebookSubmissionFull) {
    return submission.teacher_is_correct ?? submission.ai_is_correct;
}

const { courses, students, loadCourses, loadStudents } = useCourse();
const { grades, loadGrades } = useGrade();
const { subjects, loadSubjects } = useSubject();
const {
    submissionsPage,
    submissionsPageSize,
    submissionsHasMore,
    loadSubmissions: loadSubmissionsService,
    loadSubmissionsPage,
    nextSubmissionsPage,
    prevSubmissionsPage,
    triggerAIReview: triggerAIReviewService,
    updateManualReview: updateManualReviewService,
} = useNotebook();
const loading = ref(true);
const submissions = ref<NotebookSubmissionFull[]>([]);
const reviewingIds = ref<Set<string>>(new Set());
const previewSubmission = ref<NotebookSubmissionFull | null>(null);
const savingReview = ref(false);
const studentsLoading = ref(false);
const toast = useToast();
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const filters = reactive({
    courseId: '',
    gradeId: '',
    subjectId: '',
    studentId: '',
    reviewedStatus: '',
    studentSearch: '',
});

const reviewForm = reactive({
    isCorrect: null as boolean | null,
    feedback: '',
});

const filteredSubmissions = computed(() => {
    let result = [...submissions.value];

    if (filters.studentSearch.trim()) {
        const search = filters.studentSearch.toLowerCase();
        result = result.filter(
            (s) =>
                (s.student_name?.toLowerCase() || '').includes(search) ||
                (s.student_email?.toLowerCase() || '').includes(search),
        );
    }

    return result;
});

const activeFilterCount = computed(
    () =>
        [
            filters.gradeId,
            filters.subjectId,
            filters.courseId,
            filters.studentId,
            filters.reviewedStatus,
            filters.studentSearch,
        ].filter(Boolean).length,
);

const hasScope = () => !!(filters.courseId || filters.gradeId || filters.subjectId);

onMounted(async () => {
    await Promise.all([loadCoursesData(), loadGrades(), loadSubjects()]);
    if (hasScope()) {
        if (filters.courseId) {
            await loadStudentsForCourse();
        }
        await loadSubmissions();
    } else {
        loading.value = false;
    }
});

watch(
    () => filters.studentSearch,
    () => {
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
        searchDebounceTimer = setTimeout(() => {
            if (hasScope()) {
                loadSubmissions(1);
            }
        }, 300);
    },
);

async function loadCoursesData() {
    try {
        await loadCourses('teacher');
    } catch (err) {
        console.error('Failed to load courses:', err);
    }
}

async function loadSubmissions(page = 1) {
    if (!hasScope()) {
        submissions.value = [];

        submissionsPage.value = 1;
        loading.value = false;
        return;
    }

    loading.value = true;
    try {
        const filterParams: Record<string, string | boolean | undefined> = {};
        if (filters.courseId) filterParams.course_id = filters.courseId;
        if (filters.gradeId) filterParams.grade_id = filters.gradeId;
        if (filters.subjectId) filterParams.subject_id = filters.subjectId;
        if (filters.studentId) filterParams.student_id = filters.studentId;
        if (filters.reviewedStatus === 'reviewed') filterParams.reviewed = true;
        if (filters.reviewedStatus === 'unreviewed') filterParams.reviewed = false;

        if (filters.studentSearch.trim()) {
            submissions.value = (await loadSubmissionsService(filterParams)) || [];
        } else {
            submissions.value = (await loadSubmissionsPage(page, filterParams)) || [];
        }
    } catch (err) {
        console.error('Failed to load submissions:', err);
        submissions.value = [];
    } finally {
        loading.value = false;
    }
}

async function goToNextPage() {
    if (!submissionsHasMore.value) return;
    const filterParams: Record<string, string | boolean | undefined> = {};
    if (filters.courseId) filterParams.course_id = filters.courseId;
    if (filters.gradeId) filterParams.grade_id = filters.gradeId;
    if (filters.subjectId) filterParams.subject_id = filters.subjectId;
    if (filters.studentId) filterParams.student_id = filters.studentId;
    if (filters.reviewedStatus === 'reviewed') filterParams.reviewed = true;
    if (filters.reviewedStatus === 'unreviewed') filterParams.reviewed = false;

    loading.value = true;
    try {
        submissions.value = (await nextSubmissionsPage(filterParams)) || [];
    } catch (err) {
        console.error('Failed to load next page:', err);
    } finally {
        loading.value = false;
    }
}

async function goToPrevPage() {
    if (submissionsPage.value <= 1) return;
    const filterParams: Record<string, string | boolean | undefined> = {};
    if (filters.courseId) filterParams.course_id = filters.courseId;
    if (filters.gradeId) filterParams.grade_id = filters.gradeId;
    if (filters.subjectId) filterParams.subject_id = filters.subjectId;
    if (filters.studentId) filterParams.student_id = filters.studentId;
    if (filters.reviewedStatus === 'reviewed') filterParams.reviewed = true;
    if (filters.reviewedStatus === 'unreviewed') filterParams.reviewed = false;

    loading.value = true;
    try {
        submissions.value = (await prevSubmissionsPage(filterParams)) || [];
    } catch (err) {
        console.error('Failed to load previous page:', err);
    } finally {
        loading.value = false;
    }
}

async function loadStudentsForCourse() {
    if (!filters.courseId) {
        students.value = [];
        return;
    }

    studentsLoading.value = true;
    try {
        await loadStudents(filters.courseId);
    } catch (err) {
        console.error('Failed to load students:', err);
        students.value = [];
    } finally {
        studentsLoading.value = false;
    }
}

async function onCourseChange() {
    filters.studentId = '';
    await Promise.all([loadStudentsForCourse(), loadSubmissions()]);
}

async function refreshSubmissions() {
    await loadSubmissions(submissionsPage.value);
}

async function clearFilters() {
    Object.assign(filters, {
        courseId: '',
        gradeId: '',
        subjectId: '',
        studentId: '',
        reviewedStatus: '',
        studentSearch: '',
    });
    students.value = [];
    await loadSubmissions(1);
}

function getInitial(name?: string) {
    return (name || 'E').charAt(0).toUpperCase();
}

function openPreview(submission: NotebookSubmissionFull) {
    previewSubmission.value = submission;
}

const activeTab = ref<'pending' | 'confirmed' | 'all'>('pending');
const pendingTabCount = computed(
    () => filteredSubmissions.value.filter((s) => !s.teacher_reviewed_at).length,
);
const confirmedTabCount = computed(
    () => filteredSubmissions.value.filter((s) => !!s.teacher_reviewed_at).length,
);
const statusTabs = computed(() => [
    { key: 'pending' as const, label: 'Pendientes', count: pendingTabCount.value },
    { key: 'confirmed' as const, label: 'Confirmadas', count: confirmedTabCount.value },
    { key: 'all' as const, label: 'Todas', count: filteredSubmissions.value.length },
]);
const tabFilteredSubmissions = computed(() =>
    filteredSubmissions.value.filter((s) => {
        if (activeTab.value === 'pending') return !s.teacher_reviewed_at;
        if (activeTab.value === 'confirmed') return !!s.teacher_reviewed_at;
        return true;
    }),
);

const moreFiltersOpen = ref(false);
const selectedId = ref<string | null>(null);
const detailOpen = ref(false);

const current = computed<NotebookSubmissionFull | null>(
    () =>
        tabFilteredSubmissions.value.find((s) => s.id === selectedId.value) ??
        tabFilteredSubmissions.value[0] ??
        null,
);
const currentPosition = computed(() => {
    const idx = tabFilteredSubmissions.value.findIndex((s) => s.id === current.value?.id);
    return idx === -1 ? '' : `${idx + 1} de ${tabFilteredSubmissions.value.length}`;
});

watch(current, (submission) => {
    reviewForm.isCorrect = submission
        ? (submission.teacher_is_correct ?? submission.ai_is_correct ?? null)
        : null;
    reviewForm.feedback = submission?.teacher_feedback || submission?.ai_feedback || '';
});

function selectSubmission(submission: NotebookSubmissionFull) {
    selectedId.value = submission.id;
    detailOpen.value = true;
}
function backToList() {
    detailOpen.value = false;
}
function askToRedo() {
    toast.add({
        severity: 'info',
        summary: 'Próximamente',
        detail: 'Pedirle al alumno que rehaga esta página todavía no está disponible.',
        life: 3000,
    });
}

async function triggerAIReview(submissionId: string) {
    reviewingIds.value.add(submissionId);
    try {
        const reviewedSubmission = await triggerAIReviewService(submissionId);
        const index = submissions.value.findIndex((s) => s.id === submissionId);
        if (index >= 0 && reviewedSubmission) {
            submissions.value[index] = reviewedSubmission;
        }
    } catch (err) {
        console.error('Failed to trigger AI review:', err);
    } finally {
        reviewingIds.value.delete(submissionId);
    }
}

async function confirmAndNext() {
    const submission = current.value;
    if (!submission || reviewForm.isCorrect === null) return;

    const idx = tabFilteredSubmissions.value.findIndex((s) => s.id === submission.id);
    savingReview.value = true;
    try {
        await updateManualReviewService(submission.id, {
            teacher_is_correct: reviewForm.isCorrect,
            teacher_feedback: reviewForm.feedback,
        });

        const allIdx = submissions.value.findIndex((s) => s.id === submission.id);
        if (allIdx >= 0) {
            submissions.value[allIdx] = {
                ...submissions.value[allIdx],
                teacher_is_correct: reviewForm.isCorrect,
                teacher_feedback: reviewForm.feedback,
                teacher_reviewed_at: new Date().toISOString(),
            };
        }

        await nextTick();
        const remaining = tabFilteredSubmissions.value;
        if (!remaining.length) {
            selectedId.value = null;
            detailOpen.value = false;
        } else {
            selectedId.value = remaining[Math.min(idx, remaining.length - 1)].id;
        }
    } catch (err) {
        console.error('Failed to save review:', err);
    } finally {
        savingReview.value = false;
    }
}
</script>

<template>
    <TeacherLayout>
        <div class="review-dashboard anim-stagger" :class="{ 'detail-open': detailOpen }">
            <div class="page-header">
                <div class="page-header__left">
                    <div class="page-kicker">Revisar</div>
                    <h1 class="page-title">Cuadernos entregados</h1>
                    <p class="page-subtitle">
                        La IA deja una primera devolución. Vos la confirmás, la ajustás o pedís que
                        lo rehaga.
                    </p>
                </div>
                <div class="page-header__right">
                    <button class="btn btn-secondary" @click="refreshSubmissions">
                        <i class="pi pi-refresh"></i>
                        Actualizar
                    </button>
                </div>
            </div>

            <div class="toolbar">
                <div class="status-tabs" role="tablist" aria-label="Estado">
                    <button
                        v-for="tab in statusTabs"
                        :key="tab.key"
                        type="button"
                        role="tab"
                        class="status-tab"
                        :class="{ 'status-tab--on': activeTab === tab.key }"
                        @click="activeTab = tab.key"
                    >
                        {{ tab.label }} <span>{{ tab.count }}</span>
                    </button>
                </div>
                <select
                    v-model="filters.courseId"
                    class="filter-select"
                    aria-label="Curso"
                    @change="onCourseChange"
                >
                    <option value="">Todos mis cursos</option>
                    <option v-for="course in courses" :key="course.id" :value="course.id">
                        {{ course.title }}
                    </option>
                </select>
                <button
                    type="button"
                    class="more-filters-toggle"
                    :class="{ 'more-filters-toggle--on': moreFiltersOpen }"
                    @click="moreFiltersOpen = !moreFiltersOpen"
                >
                    <i class="pi pi-filter"></i> Grado, materia, alumno
                    <span v-if="activeFilterCount">{{ activeFilterCount }}</span>
                </button>
                <button
                    v-if="activeFilterCount"
                    class="filters-clear"
                    type="button"
                    @click="clearFilters"
                >
                    <i class="pi pi-filter-slash"></i> Limpiar
                </button>
            </div>

            <section v-if="moreFiltersOpen" class="filters-panel" aria-label="Más filtros">
                <div class="filters-bar">
                    <div class="filter-group">
                        <label class="filter-label">Grado</label>
                        <select
                            v-model="filters.gradeId"
                            class="filter-select"
                            @change="() => loadSubmissions(1)"
                        >
                            <option value="">Todos los grados</option>
                            <option v-for="grade in grades" :key="grade.id" :value="grade.id">
                                {{ grade.name }}
                            </option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Materia</label>
                        <select
                            v-model="filters.subjectId"
                            class="filter-select"
                            @change="() => loadSubmissions(1)"
                        >
                            <option value="">Todas las materias</option>
                            <option
                                v-for="subject in subjects"
                                :key="subject.id"
                                :value="subject.id"
                            >
                                {{ subject.name }}
                            </option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Estado de revisión IA</label>
                        <select
                            v-model="filters.reviewedStatus"
                            class="filter-select"
                            @change="() => loadSubmissions(1)"
                        >
                            <option value="">Todas del curso</option>
                            <option value="reviewed">Revisadas (IA)</option>
                            <option value="unreviewed">Sin revisar (IA)</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Estudiante</label>
                        <select
                            v-model="filters.studentId"
                            class="filter-select"
                            :disabled="studentsLoading || students.length === 0"
                            @change="() => loadSubmissions(1)"
                        >
                            <option value="">Todos los alumnos del curso</option>
                            <option
                                v-for="student in students"
                                :key="student.id"
                                :value="student.id"
                            >
                                {{ student.name }} · {{ student.email }}
                            </option>
                        </select>
                    </div>
                    <div class="filter-group filter-group--search">
                        <label class="filter-label">Buscar en resultados</label>
                        <input
                            v-model="filters.studentSearch"
                            type="text"
                            class="filter-input"
                            placeholder="Nombre o email..."
                        />
                    </div>
                </div>
            </section>

            <div
                v-if="!filters.courseId && !filters.gradeId && !filters.subjectId && !loading"
                class="scope-hint"
            >
                <i class="pi pi-filter"></i>
                Selecciona al menos un filtro (grado, materia o curso) para ver entregas.
            </div>

            <template v-if="loading">
                <div class="submissions-grid">
                    <article
                        v-for="n in 4"
                        :key="n"
                        class="submission-card submission-card--skeleton"
                    >
                        <div
                            class="submission-header"
                            style="
                                display: flex;
                                justify-content: space-between;
                                align-items: flex-start;
                            "
                        >
                            <div
                                class="student-info"
                                style="display: flex; gap: 12px; align-items: center"
                            >
                                <Skeleton variant="avatar" size="42px" />
                                <div
                                    class="student-details"
                                    style="display: flex; flex-direction: column; gap: 6px"
                                >
                                    <Skeleton width="120px" height="16px" />
                                    <Skeleton width="160px" height="14px" />
                                </div>
                            </div>
                            <Skeleton variant="badge" width="80px" />
                        </div>
                        <div
                            class="submission-meta"
                            style="display: flex; gap: 16px; margin-top: 14px"
                        >
                            <Skeleton width="100px" height="14px" />
                            <Skeleton width="80px" height="14px" />
                            <Skeleton width="120px" height="14px" />
                        </div>
                        <Skeleton
                            width="100%"
                            height="180px"
                            class="preview-skel"
                            style="margin-top: 14px"
                        />
                        <div
                            class="submission-actions"
                            style="display: flex; gap: 10px; margin-top: 14px"
                        >
                            <Skeleton width="100px" height="36px" />
                            <Skeleton width="140px" height="36px" />
                        </div>
                    </article>
                </div>
            </template>

            <div v-else-if="hasScope() && filteredSubmissions.length === 0" class="empty-state">
                <div class="empty-icon">
                    <i class="pi pi-inbox"></i>
                </div>
                <h3>Sin resultados</h3>
                <p>No encontramos entregas de cuadernos con los filtros seleccionados.</p>
            </div>

            <div v-else-if="hasScope()" class="review-split">
                <div class="review-list-pane">
                    <div class="review-list">
                        <button
                            v-for="submission in tabFilteredSubmissions"
                            :key="submission.id"
                            type="button"
                            class="review-item"
                            :class="{ 'review-item--active': submission.id === current?.id }"
                            @click="selectSubmission(submission)"
                        >
                            <span class="review-item__avatar">{{
                                getInitial(submission.student_name)
                            }}</span>
                            <span class="review-item__body">
                                <strong>{{ submission.student_name || 'Estudiante' }}</strong>
                                <span class="review-item__meta">{{
                                    submission.notebook_title || 'Cuaderno'
                                }}</span>
                                <span class="review-item__when">
                                    <span
                                        class="review-tag"
                                        :class="
                                            submission.teacher_reviewed_at
                                                ? 'review-tag--teacher'
                                                : submission.ai_feedback ||
                                                    submission.ai_is_correct !== undefined
                                                  ? 'review-tag--ai'
                                                  : 'review-tag--pending'
                                        "
                                    >
                                        {{
                                            submission.teacher_reviewed_at
                                                ? 'Confirmada'
                                                : submission.ai_feedback ||
                                                    submission.ai_is_correct !== undefined
                                                  ? 'IA revisó'
                                                  : 'Sin revisar'
                                        }}
                                    </span>
                                    {{ formatDateTime(submission.created_at) }}
                                </span>
                            </span>
                        </button>
                    </div>

                    <div
                        v-if="
                            !filters.studentSearch.trim() &&
                            (submissionsPage > 1 || submissionsHasMore)
                        "
                        class="pagination-controls"
                    >
                        <button
                            class="btn btn-secondary"
                            :disabled="submissionsPage === 1"
                            @click="goToPrevPage"
                        >
                            <i class="pi pi-chevron-left"></i>
                        </button>
                        <span class="pagination-info">Página {{ submissionsPage }}</span>
                        <button
                            class="btn btn-secondary"
                            :disabled="!submissionsHasMore"
                            @click="goToNextPage"
                        >
                            <i class="pi pi-chevron-right"></i>
                        </button>
                    </div>
                </div>

                <article v-if="current" class="review-detail">
                    <button type="button" class="back-link" @click="backToList">
                        <i class="pi pi-arrow-left"></i> Todas las entregas
                    </button>

                    <header class="review-detail__head">
                        <h2>{{ current.notebook_title || 'Cuaderno' }}</h2>
                        <p>
                            {{ current.student_name }} · Página {{ current.page_number }} ·
                            entregado {{ formatDateTime(current.created_at) }}
                        </p>
                        <span class="review-detail__position">{{ currentPosition }}</span>
                    </header>

                    <div class="review-detail__columns">
                        <div
                            class="canvas-preview"
                            :class="{ 'canvas-preview--empty': !current.canvas_data }"
                        >
                            <img
                                v-if="current.canvas_data"
                                :src="current.canvas_data"
                                :alt="`Respuesta de ${current.student_name}`"
                                class="preview-image"
                                @click="openPreview(current)"
                            />
                            <span v-else class="canvas-preview__placeholder">
                                <i class="pi pi-image"></i> Página del alumno
                            </span>
                        </div>

                        <div class="review-detail__feedback">
                            <div v-if="current.ai_feedback" class="ai-feedback-box">
                                <div class="feedback-header">
                                    <i class="pi pi-sparkles"></i>
                                    <span>Devolución de la IA</span>
                                </div>
                                <p class="feedback-text">{{ current.ai_feedback }}</p>
                            </div>
                            <button
                                v-else-if="current.ai_is_correct === undefined"
                                type="button"
                                class="btn btn-sm btn-secondary"
                                :disabled="reviewingIds.has(current.id)"
                                @click="triggerAIReview(current.id)"
                            >
                                <i
                                    v-if="reviewingIds.has(current.id)"
                                    class="pi pi-spin pi-spinner"
                                ></i>
                                <i v-else class="pi pi-android"></i>
                                {{ reviewingIds.has(current.id) ? 'Evaluando…' : 'Evaluar con IA' }}
                            </button>

                            <label class="feedback-label">
                                <span>Tu devolución</span>
                                <textarea
                                    v-model="reviewForm.feedback"
                                    rows="3"
                                    placeholder="Agregá o corregí lo que dijo la IA…"
                                ></textarea>
                            </label>
                        </div>
                    </div>

                    <section class="review-detail__correction">
                        <h3>Es correcto?</h3>
                        <div class="verdict-buttons">
                            <button
                                type="button"
                                class="verdict-btn verdict-btn--ok"
                                :class="{ 'verdict-btn--picked': reviewForm.isCorrect === true }"
                                @click="reviewForm.isCorrect = true"
                            >
                                <i class="pi pi-check"></i> Correcto
                            </button>
                            <button
                                type="button"
                                class="verdict-btn verdict-btn--no"
                                :class="{ 'verdict-btn--picked': reviewForm.isCorrect === false }"
                                @click="reviewForm.isCorrect = false"
                            >
                                <i class="pi pi-times"></i> Incorrecto
                            </button>
                        </div>

                        <div class="review-detail__footer">
                            <button type="button" class="btn btn-ghost" @click="askToRedo">
                                <i class="pi pi-replay"></i> Pedir que lo rehaga
                            </button>
                            <button
                                type="button"
                                class="btn btn-primary"
                                :disabled="reviewForm.isCorrect === null || savingReview"
                                @click="confirmAndNext"
                            >
                                <span v-if="savingReview" class="spinner spinner-sm"></span>
                                <template v-else
                                    >Confirmar y seguir <i class="pi pi-arrow-right"></i
                                ></template>
                            </button>
                        </div>
                    </section>
                </article>
            </div>

            <UiModal :visible="Boolean(previewSubmission)" @close="previewSubmission = null">
                <template v-if="previewSubmission">
                    <div class="modal-box modal-box--large">
                        <div class="modal-head">
                            <h3 class="modal-title">
                                {{ previewSubmission.student_name }} - Pagina
                                {{ previewSubmission.page_number }}
                            </h3>
                            <button class="icon-btn" @click="previewSubmission = null">
                                <i class="pi pi-times"></i>
                            </button>
                        </div>
                        <div class="preview-content">
                            <img
                                :src="previewSubmission.canvas_data"
                                alt="Vista previa"
                                class="full-preview-image"
                            />
                        </div>
                    </div>
                </template>
            </UiModal>
        </div>
    </TeacherLayout>
</template>

<style scoped>
.review-dashboard {
    padding: 24px 28px 40px;
    max-width: 1280px;
}

.page-header {
    margin-bottom: 20px;
}

.filters-panel {
    padding: 14px 16px 16px;
    background: var(--surface-elevated);
    border-radius: var(--radius-xl);
    border: 1px solid var(--surface-elevated-strong);
    margin-bottom: 20px;
}
.filters-panel__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    color: var(--text-heading);
    font-size: var(--text-sm);
}
.filters-panel__head > div {
    display: flex;
    align-items: center;
    gap: 8px;
}
.filters-panel__head span {
    padding: 2px 7px;
    border-radius: var(--radius-pill);
    background: var(--fill-primary-soft);
    color: var(--practiq-violet-dark);
    font-size: var(--text-xs);
    font-weight: 800;
}
.filters-clear {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 5px 8px;
    border: 0;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--practiq-violet-dark);
    font: inherit;
    font-size: var(--text-xs);
    font-weight: 800;
    cursor: pointer;
}
.filters-clear:hover {
    background: var(--fill-primary-soft);
}
.filters-bar {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 180px;
}

.filter-group--search {
    flex: 1;
    min-width: 220px;
}

.filter-label {
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.filter-select,
.filter-input {
    padding: 10px 14px;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    font-size: var(--text-base);
    color: var(--text-primary);
    background: var(--surface-elevated-strong);
    outline: none;
    transition: border-color 0.15s;
}

.filter-select:focus,
.filter-input:focus {
    border-color: var(--practiq-violet);
}

.filter-select:disabled {
    cursor: not-allowed;
    opacity: 0.65;
}

.scope-hint {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    margin-bottom: 20px;
    border-radius: var(--radius-lg);
    background: var(--fill-primary-subtle);
    color: var(--text-secondary);
    font-size: var(--text-base);
    font-weight: 600;
}

.scope-hint i {
    color: var(--practiq-violet);
}

.submission-card--skeleton {
    pointer-events: none;
}
.preview-skel {
    border-radius: var(--radius-lg);
}
.mt-4 {
    margin-top: 4px;
}

.empty-state {
    padding: 64px 24px;
}

.empty-icon {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-xl);
    background: var(--fill-primary-subtle);
    display: grid;
    place-items: center;
    margin: 0 auto 20px;
    font-size: 28px;
    color: var(--practiq-violet);
}

.empty-state h3 {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.empty-state p {
    font-size: var(--text-md);
    color: var(--text-secondary);
}

.submissions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 20px;
}

.submission-card {
    background: var(--surface-elevated);
    border-radius: var(--radius-2xl);
    border: 1.5px solid var(--surface-elevated-strong);
    box-shadow: var(--shadow-card);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    transition: var(--transition);
}

.submission-card:hover {
    box-shadow: var(--shadow-card-lg);
}

.submission-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
}

.student-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.submission-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.canvas-preview {
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--surface-border);
    cursor: pointer;
    min-height: 220px;
    display: grid;
}

.canvas-preview--empty {
    place-items: center;
    cursor: default;
    background: var(--canvas);
    border-style: dashed;
    border-color: var(--brand-200);
    color: var(--text-secondary);
}

.canvas-preview__placeholder {
    display: grid;
    justify-items: center;
    gap: 6px;
    font-size: 12px;
}
.canvas-preview__placeholder i {
    font-size: 22px;
    color: var(--brand-300, var(--practiq-violet));
}

.preview-image {
    width: 100%;
    height: 100%;
    min-height: 220px;
    object-fit: contain;
    background: var(--surface-bg);
    display: block;
}

.ai-feedback-box,
.teacher-feedback-box {
    padding: 12px 14px;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
}

.ai-feedback-box {
    background: var(--surface-sunken);
    border: 1px solid var(--brand-200);
}

.teacher-feedback-box {
    background: var(--color-success-bg);
    border: 1px solid rgba(var(--color-success-rgb), 0.2);
}

.feedback-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    color: var(--practiq-violet-dark);
    margin-bottom: 6px;
}

.teacher-feedback-box .feedback-header {
    color: var(--color-success-dark);
}

.feedback-text {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.5;
}

.feedback-label {
    display: grid;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
}
.feedback-label textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    font-family: inherit;
    font-size: var(--text-sm);
    color: var(--text-primary);
    resize: vertical;
}

.submission-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: auto;
}

.btn-sm {
    padding: 8px 14px;
    font-size: var(--text-sm);
}

.modal-box--large {
    max-width: 800px;
    width: 90vw;
}

.preview-content {
    padding: 20px;
    background: var(--surface-bg);
    border-radius: var(--radius-md);
}

.full-preview-image {
    width: 100%;
    max-height: 70vh;
    object-fit: contain;
}

.page-subtitle {
    margin: 6px 0 0;
    color: var(--text-secondary);
    max-width: 60ch;
}

.toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 16px 0 18px;
}

.status-tabs {
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: var(--radius-md);
    background: var(--surface-sunken);
}

.status-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 34px;
    padding: 0 12px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font: 600 12.5px/1 var(--font-body);
    cursor: pointer;
}
.status-tab span {
    font-weight: 700;
    opacity: 0.75;
}
.status-tab--on {
    background: var(--surface-card);
    color: var(--text-heading);
    box-shadow: var(--shadow-xs, 0 1px 3px rgba(15, 23, 42, 0.06));
}

.more-filters-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 0 12px;
    border: 1px dashed var(--brand-200);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--practiq-violet-dark);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
}
.more-filters-toggle--on {
    background: var(--surface-sunken);
}
.more-filters-toggle span {
    padding: 1px 6px;
    border-radius: var(--radius-pill);
    background: var(--brand-100);
    font-size: 11px;
    font-weight: 800;
}

.review-split {
    display: grid;
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
    gap: 14px;
    align-items: start;
}

.review-list-pane {
    display: grid;
    min-width: 0;
    gap: 10px;
}

.review-list {
    display: grid;
    gap: 6px;
}

.review-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    background: var(--surface-card);
    cursor: pointer;
    text-align: left;
    font-family: var(--font-body);
    color: var(--text-primary);
}

.review-item--active {
    box-shadow: inset 2px 0 0 var(--practiq-violet);
    background: var(--surface-sunken);
}

.review-item__avatar {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border-radius: var(--radius-md);
    background: var(--surface-sunken);
    color: var(--practiq-violet-dark);
    font: 900 14px/1 var(--font-ui);
}

.review-item__body {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 3px;
}
.review-item__body strong {
    overflow: hidden;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-heading);
    text-overflow: ellipsis;
    white-space: nowrap;
}
.review-item__meta {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.review-item__when {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: var(--text-xs);
    color: var(--text-muted);
}

.review-tag {
    padding: 1px 7px;
    border-radius: 999px;
    font-weight: 700;
}
.review-tag--ai {
    background: var(--surface-sunken);
    color: var(--practiq-violet-dark);
}
.review-tag--pending {
    background: var(--color-warning-bg);
    color: var(--color-warning-dark);
}
.review-tag--teacher {
    background: var(--surface-subtle);
    color: var(--text-secondary);
}

.review-detail {
    display: grid;
    min-width: 0;
    gap: 16px;
    padding: 20px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    background: var(--surface-card);
}

.back-link {
    display: none;
    justify-self: start;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 0 10px;
    margin: -6px 0 -4px -8px;
    border: 0;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--practiq-violet-dark);
    font: 900 13px/1 var(--font-ui);
    cursor: pointer;
}

.review-detail__head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
}
.review-detail__head h2 {
    margin: 0;
    font: 900 19px/1.2 var(--font-ui);
    letter-spacing: -0.03em;
    color: var(--text-heading);
}
.review-detail__head p {
    margin: 3px 0 0;
    font-size: 12.5px;
    color: var(--text-secondary);
}
.review-detail__position {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-secondary);
}

.review-detail__columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
    gap: 12px;
}

.review-detail__feedback {
    display: grid;
    align-content: start;
    gap: 10px;
}

.review-detail__correction {
    display: grid;
    gap: 10px;
    padding-top: 14px;
    border-top: 1px solid var(--surface-border);
}
.review-detail__correction h3 {
    margin: 0;
    font: 900 11px/14px var(--font-ui);
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--text-muted);
}

.verdict-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.verdict-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 48px;
    border-radius: var(--radius-md);
    background: var(--surface-card);
    font: 900 14px/1 var(--font-ui);
    cursor: pointer;
    transition:
        background-color 0.15s,
        border-color 0.15s;
}
.verdict-btn--ok {
    border: 1px solid var(--color-success-bg);
    color: var(--color-success-dark);
}
.verdict-btn--ok.verdict-btn--picked {
    background: var(--color-success-bg);
    border-color: var(--color-success-dark);
}
.verdict-btn--no {
    border: 1px solid var(--color-error-bg);
    color: var(--color-error-dark);
}
.verdict-btn--no.verdict-btn--picked {
    background: var(--color-error-bg);
    border-color: var(--color-error-dark);
}

.review-detail__footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
}

.pagination-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 8px;
}

.pagination-info {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-secondary);
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

@media (max-width: 1024px) {
    .review-dashboard {
        padding: 20px 16px 40px;
    }

    .submissions-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 1023px) {
    .review-split {
        grid-template-columns: minmax(0, 1fr);
    }
    .review-list-pane {
        display: none;
    }
    .review-detail {
        display: none;
    }
    .review-dashboard:not(.detail-open) .review-list-pane {
        display: grid;
    }
    .review-dashboard.detail-open .review-detail {
        display: grid;
    }
    .review-dashboard.detail-open .back-link {
        display: inline-flex;
    }
    .review-dashboard.detail-open .page-header,
    .review-dashboard.detail-open .toolbar {
        display: none;
    }
}

@media (max-width: 768px) {
    .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
        padding: 20px;
    }

    .filters-bar {
        flex-direction: column;
        gap: 10px;
    }

    .filters-panel {
        padding: 12px;
    }

    .filter-group {
        width: 100%;
        min-width: 0;
    }

    .filter-select,
    .filter-input {
        width: 100%;
        min-height: 46px;
    }

    .submission-header {
        flex-direction: column;
    }

    .review-detail__footer {
        flex-direction: column;
        align-items: stretch;
    }
    .review-detail__footer .btn {
        width: 100%;
        justify-content: center;
        min-height: 46px;
    }
}
</style>
