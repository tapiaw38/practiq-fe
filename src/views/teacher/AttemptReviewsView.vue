<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from '@/composables/useToast';
import { usePendingReviews } from '@/composables/usePendingReviews';
import TeacherLayout from '@/layouts/TeacherLayout.vue';
import FileViewer from '@/components/ui/FileViewer.vue';
import { practiqApi } from '@/api/request/server';
import { fileKind } from '@/utils/fileKind';
import { AttemptReviewService } from '@/services/attemptReviews/attemptReviewService';
import type { AttemptReview } from '@/types';

const service = new AttemptReviewService(practiqApi);
const toast = useToast();
const { count: pendingCount, hasMore: pendingHasMore, load: loadPendingCount } = usePendingReviews();

const reviews = ref<AttemptReview[]>([]);
const loading = ref(true);
const hasMore = ref(false);
const page = ref(1);
const PAGE_SIZE = 20;

const filters = reactive({
    courseId: '',
    studentId: '',
    reviewed: '',
});
const activeFilterCount = computed(
    () => [filters.courseId, filters.studentId, filters.reviewed].filter(Boolean).length,
);
const saving = ref<string | null>(null);
const feedback = ref<Record<string, string>>({});

onMounted(() => {
    load();
    loadPendingCount();
});

async function load(target = page.value) {
    loading.value = true;
    try {
        const result = await service.list({
            ...filters,
            limit: PAGE_SIZE,
            offset: (target - 1) * PAGE_SIZE,
        });
        reviews.value = result.data;
        hasMore.value = result.has_more;

        page.value = target;
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las entregas',
            life: 3000,
        });
    } finally {
        loading.value = false;
    }
}

async function review(item: AttemptReview, isCorrect: boolean) {
    if (saving.value) return;
    saving.value = item.attempt_id;
    try {
        const feedbackWasEdited = Object.prototype.hasOwnProperty.call(
            feedback.value,
            item.attempt_id,
        );

        const feedbackValue = feedbackWasEdited
            ? feedback.value[item.attempt_id].trim()
            : (item.teacher_feedback ?? '');
        await service.review(item.attempt_id, {
            is_correct: isCorrect,
            feedback: feedbackValue,
        });
        toast.add({
            severity: 'success',
            summary: 'Corregida',
            detail: isCorrect ? 'Marcada como correcta' : 'Marcada como incorrecta',
            life: 2500,
        });
        delete feedback.value[item.attempt_id];
        await load();
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar la corrección',
            life: 3000,
        });
    } finally {
        saving.value = null;
    }
}

function applyFilters() {
    load(1);
}

const statusTabs = computed(() => [
    {
        key: 'unreviewed',
        label: 'Sin corregir',
        count: pendingCount.value > 0 ? (pendingHasMore.value ? '99+' : String(pendingCount.value)) : '',
    },
    { key: 'reviewed', label: 'Corregidas', count: '' },
    { key: '', label: 'Todas', count: '' },
]);
function selectTab(key: string) {
    if (filters.reviewed === key) return;
    filters.reviewed = key;
    applyFilters();
}

const selectedId = ref<string | null>(null);
const detailOpen = ref(false);
const pendingVerdict = ref<Record<string, boolean>>({});

const current = computed<AttemptReview | null>(
    () => reviews.value.find((r) => r.attempt_id === selectedId.value) ?? reviews.value[0] ?? null,
);
const currentPosition = computed(() => {
    const idx = reviews.value.findIndex((r) => r.attempt_id === current.value?.attempt_id);
    return idx === -1 ? '' : `${idx + 1} de ${reviews.value.length}`;
});

function selectReview(item: AttemptReview) {
    selectedId.value = item.attempt_id;
    detailOpen.value = true;
}
function backToList() {
    detailOpen.value = false;
}
function pickVerdict(item: AttemptReview, isCorrect: boolean) {
    pendingVerdict.value[item.attempt_id] = isCorrect;
}

async function saveAndNext(item: AttemptReview) {
    const idx = reviews.value.findIndex((r) => r.attempt_id === item.attempt_id);
    const verdict = pendingVerdict.value[item.attempt_id];
    if (verdict !== undefined) {
        await review(item, verdict);
        loadPendingCount();
    }
    delete pendingVerdict.value[item.attempt_id];
    await nextTick();
    if (!reviews.value.length) {
        selectedId.value = null;
        detailOpen.value = false;
        return;
    }
    selectedId.value = reviews.value[Math.min(idx, reviews.value.length - 1)].attempt_id;
}

function clearFilters() {
    filters.courseId = '';
    filters.studentId = '';
    filters.reviewed = '';
    load(1);
}

const courses = ref<{ id: string; title: string }[]>([]);
const students = ref<{ id: string; name: string }[]>([]);

watch(reviews, (rows) => {
    const byCourse = new Map<string, string>();
    const byStudent = new Map<string, string>();
    for (const row of rows) {
        if (row.course_id) byCourse.set(row.course_id, row.course_title || row.course_id);
        if (row.student_id) byStudent.set(row.student_id, row.student_name || row.student_id);
    }
    if (!filters.courseId) courses.value = [...byCourse].map(([id, title]) => ({ id, title }));
    if (!filters.studentId) students.value = [...byStudent].map(([id, name]) => ({ id, name }));

    if (!rows.find((r) => r.attempt_id === selectedId.value)) {
        selectedId.value = rows[0]?.attempt_id ?? null;
    }
});

function formatDate(value: string) {
    return new Date(value).toLocaleString('es-AR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

function isUnreadable(item: AttemptReview) {
    return (item.answer_text || '').trim().toUpperCase() === 'UNREADABLE';
}

function answerText(item: AttemptReview) {
    if (isUnreadable(item)) return 'No se pudo leer lo que escribió.';
    return (item.answer_text || '').trim();
}

function fileLabel(item: AttemptReview) {
    return item.attachment_name || 'archivo adjunto';
}

const viewing = ref<AttemptReview | null>(null);

const preview = ref<{ url: string; title: string } | null>(null);
const loadingStatement = ref<string | null>(null);

function openPreview(url: string, title: string) {
    preview.value = { url, title };
}

async function openStatementImage(item: AttemptReview) {
    if (loadingStatement.value) return;
    loadingStatement.value = item.attempt_id;
    try {
        const { data } = await service.statementImage(item.attempt_id);
        if (!data.image) {
            toast.add({
                severity: 'info',
                summary: 'Sin consigna',
                detail: 'Este ejercicio no tiene una consigna escrita a mano.',
                life: 3000,
            });
            return;
        }
        openPreview(data.image, 'Consigna del docente');
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la consigna',
            life: 3000,
        });
    } finally {
        loadingStatement.value = null;
    }
}
</script>

<template>
    <TeacherLayout>
        <div class="reviews-page anim-stagger" :class="{ 'detail-open': detailOpen }">
            <div class="page-header">
                <div>
                    <div class="page-kicker">Revisar</div>
                    <h1 class="page-title">Pruebas de nivel</h1>
                    <p class="page-subtitle">
                        Solo lo que la IA no pudo resolver. El alumno no pasa de nivel hasta que lo
                        corrijas; podés cambiar la nota después.
                    </p>
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
                        :class="{ 'status-tab--on': filters.reviewed === tab.key }"
                        @click="selectTab(tab.key)"
                    >
                        {{ tab.label }} <span v-if="tab.count">{{ tab.count }}</span>
                    </button>
                </div>
                <select
                    aria-label="Curso"
                    v-model="filters.courseId"
                    class="filter-select"
                    @change="applyFilters"
                >
                    <option value="">Todos los cursos</option>
                    <option v-for="course in courses" :key="course.id" :value="course.id">
                        {{ course.title }}
                    </option>
                </select>
                <select
                    aria-label="Estudiante"
                    v-model="filters.studentId"
                    class="filter-select"
                    @change="applyFilters"
                >
                    <option value="">Todos los alumnos</option>
                    <option v-for="student in students" :key="student.id" :value="student.id">
                        {{ student.name }}
                    </option>
                </select>
                <button
                    v-if="activeFilterCount"
                    class="filters-clear"
                    type="button"
                    @click="clearFilters"
                >
                    <i class="pi pi-filter-slash"></i> Limpiar
                </button>
            </div>

            <p v-if="loading" class="muted">Cargando…</p>
            <div v-else-if="!reviews.length" class="empty-state">
                <div class="empty-icon"><i class="pi pi-inbox"></i></div>
                <h3>Sin resultados</h3>
                <p>No encontramos pruebas de nivel con los filtros seleccionados.</p>
            </div>

            <div v-else class="review-split">
                <div class="review-list-pane">
                    <div role="list" class="review-list">
                        <button
                            v-for="item in reviews"
                            :key="item.attempt_id"
                            type="button"
                            role="listitem"
                            class="review-item"
                            :class="{ 'review-item--active': item.attempt_id === current?.attempt_id }"
                            @click="selectReview(item)"
                        >
                            <span class="review-item__row">
                                <strong>{{ item.student_name || item.student_id }}</strong>
                                <span
                                    class="review-tag"
                                    :class="{
                                        'review-tag--ok': item.teacher_reviewed_at
                                            ? item.teacher_is_correct
                                            : item.ai_is_correct === true,
                                        'review-tag--no':
                                            (item.teacher_reviewed_at && !item.teacher_is_correct) ||
                                            (!item.teacher_reviewed_at && item.ai_is_correct === false),
                                        'review-tag--pending':
                                            !item.teacher_reviewed_at && item.ai_is_correct === undefined,
                                    }"
                                >
                                    {{
                                        item.teacher_reviewed_at
                                            ? item.teacher_is_correct
                                                ? 'Corregida'
                                                : 'Corregida'
                                            : item.ai_is_correct === undefined
                                              ? 'Sin corregir'
                                              : item.ai_is_correct
                                                ? 'IA: correcta'
                                                : 'IA: incorrecta'
                                    }}
                                </span>
                            </span>
                            <span class="review-item__meta">
                                {{ item.course_title }}
                                <template v-if="item.practice_sheet_title"
                                    >· {{ item.practice_sheet_title }}</template
                                >
                            </span>
                            <span class="review-item__when">{{ formatDate(item.created_at) }}</span>
                        </button>
                    </div>

                    <div v-if="page > 1 || hasMore" class="pagination-controls">
                        <button
                            class="btn btn-secondary"
                            :disabled="page === 1"
                            @click="load(page - 1)"
                        >
                            <i class="pi pi-chevron-left"></i>
                        </button>
                        <span class="pagination-info">Página {{ page }}</span>
                        <button class="btn btn-secondary" :disabled="!hasMore" @click="load(page + 1)">
                            <i class="pi pi-chevron-right"></i>
                        </button>
                    </div>
                </div>

                <article v-if="current" class="review-detail">
                    <button type="button" class="back-link" @click="backToList">
                        <i class="pi pi-arrow-left"></i> Todas las pruebas
                    </button>

                    <header class="review-detail__head">
                        <span class="review-detail__avatar">{{
                            (current.student_name || current.student_id || '?')[0]
                        }}</span>
                        <div class="review-detail__title">
                            <h2>{{ current.student_name || current.student_id }}</h2>
                            <p>
                                {{ current.course_title
                                }}<template v-if="current.practice_sheet_title">
                                    · {{ current.practice_sheet_title }}</template
                                >
                                · {{ formatDate(current.created_at) }}
                            </p>
                        </div>
                        <span class="review-detail__position">{{ currentPosition }}</span>
                    </header>

                    <section class="review-detail__section">
                        <h3>Consigna</h3>
                        <p class="review-question">{{ current.question }}</p>
                    </section>

                    <section class="review-detail__section">
                        <h3>Respuesta del alumno</h3>
                        <div class="review-thumbs">
                            <button
                                v-if="current.has_teacher_image"
                                type="button"
                                class="review-thumb review-thumb--action"
                                :disabled="loadingStatement === current.attempt_id"
                                @click="openStatementImage(current)"
                            >
                                <i
                                    :class="
                                        loadingStatement === current.attempt_id
                                            ? 'pi pi-spin pi-spinner'
                                            : 'pi pi-pencil'
                                    "
                                ></i>
                                <span>Consigna</span>
                            </button>

                            <button
                                v-if="current.statement_media_view_url"
                                type="button"
                                class="review-thumb"
                                @click="
                                    openPreview(
                                        current.statement_media_view_url,
                                        'Material del enunciado',
                                    )
                                "
                            >
                                <img
                                    v-if="fileKind(current.statement_media_view_url) === 'image'"
                                    :src="current.statement_media_view_url"
                                    alt=""
                                />
                                <i v-else class="pi pi-file thumb-icon"></i>
                                <span>Enunciado</span>
                            </button>

                            <button
                                v-if="current.image_view_url"
                                type="button"
                                class="review-thumb"
                                @click="openPreview(current.image_view_url, 'Respuesta del alumno')"
                            >
                                <img :src="current.image_view_url" alt="" />
                                <span>Respuesta</span>
                            </button>

                            <button
                                v-if="current.attachment_url"
                                type="button"
                                class="review-thumb review-thumb--action"
                                @click="viewing = current"
                            >
                                <i class="pi pi-paperclip"></i>
                                <span>{{ fileLabel(current) }}</span>
                            </button>
                        </div>

                        <p
                            v-if="answerText(current)"
                            class="review-answer-text"
                            :class="{ 'review-answer-text--none': isUnreadable(current) }"
                        >
                            {{ answerText(current) }}
                        </p>

                        <details
                            v-if="current.ai_feedback || current.ai_is_correct !== undefined"
                            class="review-ai"
                        >
                            <summary class="review-ai-head">
                                <i class="pi pi-sparkles"></i>
                                <span>Lectura de la IA</span>
                            </summary>
                            <p v-if="current.ai_feedback" class="review-ai-text">
                                {{ current.ai_feedback }}
                            </p>
                            <small class="review-ai-note">
                                Si no coincidís, tu corrección reemplaza esta nota.
                            </small>
                        </details>

                        <p v-if="current.teacher_feedback" class="review-teacher-feedback">
                            {{ current.teacher_feedback }}
                        </p>
                    </section>

                    <section class="review-detail__correction">
                        <h3>Tu corrección</h3>
                        <div class="verdict-buttons">
                            <button
                                type="button"
                                class="verdict-btn verdict-btn--ok"
                                :class="{
                                    'verdict-btn--picked':
                                        (pendingVerdict[current.attempt_id] ?? current.teacher_is_correct) ===
                                        true,
                                }"
                                @click="pickVerdict(current, true)"
                            >
                                <i class="pi pi-check"></i> Correcta
                            </button>
                            <button
                                type="button"
                                class="verdict-btn verdict-btn--no"
                                :class="{
                                    'verdict-btn--picked':
                                        (pendingVerdict[current.attempt_id] ?? current.teacher_is_correct) ===
                                        false,
                                }"
                                @click="pickVerdict(current, false)"
                            >
                                <i class="pi pi-times"></i> Incorrecta
                            </button>
                        </div>
                        <textarea
                            v-model="feedback[current.attempt_id]"
                            class="review-feedback"
                            rows="2"
                            placeholder="Comentario para el alumno (opcional)"
                        ></textarea>
                        <div class="review-detail__footer">
                            <span class="review-detail__hint">
                                Si la marcás correcta, {{
                                    (current.student_name || '').split(' ')[0] || 'el alumno'
                                }} pasa al nivel siguiente.
                            </span>
                            <button
                                type="button"
                                class="btn btn-primary"
                                :disabled="saving === current.attempt_id"
                                @click="saveAndNext(current)"
                            >
                                Guardar y seguir <i class="pi pi-arrow-right"></i>
                            </button>
                        </div>
                    </section>
                </article>
            </div>
        </div>

        <FileViewer
            :show="!!preview"
            :url="preview?.url || ''"
            :title="preview?.title || 'Imagen'"
            content-type="image/png"
            @close="preview = null"
        />

        <FileViewer
            :show="!!viewing"
            :url="viewing?.attachment_view_url || viewing?.attachment_url || ''"
            :title="viewing ? fileLabel(viewing) : 'Entrega'"
            :content-type="viewing?.attachment_content_type || ''"
            @close="viewing = null"
        />
    </TeacherLayout>
</template>

<style scoped>
.reviews-page {
    padding: 24px 28px 40px;
    max-width: 1120px;
}

.page-header {
    align-items: flex-start;
    gap: 20px;
}

.page-title {
    margin: 2px 0 0;
}

.page-subtitle {
    margin: 8px 0 0;
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

.review-split {
    display: grid;
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
    gap: 14px;
    align-items: start;
}

.review-list-pane {
    display: grid;
    gap: 10px;
}

.review-list {
    display: grid;
    gap: 6px;
}

.review-item {
    display: grid;
    gap: 6px;
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
    border-color: var(--practiq-violet-200, var(--surface-border));
    box-shadow: inset 2px 0 0 var(--practiq-violet);
    background: var(--surface-sunken);
}

.review-item__row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.review-item__row strong {
    flex: 1;
    min-width: 0;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-heading);
    overflow: hidden;
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
    font-size: var(--text-xs);
    color: var(--text-muted);
}

.review-tag {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: var(--text-xs);
    font-weight: 700;
    white-space: nowrap;
}

.review-tag--ok {
    background: var(--color-success-bg);
    color: var(--color-success-dark);
}

.review-tag--no {
    background: var(--color-error-bg);
    color: var(--color-error-dark);
}

.review-tag--pending {
    background: var(--color-warning-bg);
    color: var(--color-warning-dark);
}

.review-detail {
    display: grid;
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
    gap: 12px;
}

.review-detail__avatar {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    border-radius: var(--radius-lg);
    background: var(--surface-sunken);
    color: var(--practiq-violet-dark);
    font: 900 16px/1 var(--font-ui);
}

.review-detail__title {
    flex: 1;
    min-width: 180px;
}

.review-detail__title h2 {
    margin: 0;
    font: 900 19px/1.2 var(--font-ui);
    letter-spacing: -0.03em;
    color: var(--text-heading);
}

.review-detail__title p {
    margin: 3px 0 0;
    font-size: 12.5px;
    color: var(--text-secondary);
}

.review-detail__position {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-secondary);
}

.review-detail__section {
    display: grid;
    gap: 8px;
}

.review-detail__section h3 {
    margin: 0;
    font: 900 11px/14px var(--font-ui);
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--text-muted);
}

.review-question {
    margin: 0;
    padding: 12px 14px;
    border-radius: var(--radius-md);
    background: var(--canvas);
    border: 1px solid var(--surface-border);
    font-size: 14px;
    line-height: 1.55;
    color: var(--text-heading);
    font-weight: 600;
}

.review-statement-media {
    margin: 12px 0;
    padding: 12px;
    border-radius: var(--radius-md);
    background: var(--surface-bg-soft);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 700;
}

.review-statement-media :deep(.exercise-media) {
    margin-bottom: 0;
}

.review-ai {
    margin: 12px 0 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
}

.review-ai-head {
    display: flex;
    align-items: center;
    gap: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--practiq-violet);
}

.review-ai-text {
    margin: 6px 0 0;
    font-size: var(--text-sm);
    color: var(--text-primary);
}

.review-ai-note {
    display: block;
    margin-top: 6px;
    color: var(--text-secondary);
    font-size: var(--text-xs);
}

.review-teacher-feedback {
    margin: 10px 0 0;
    font-size: var(--text-sm);
    color: var(--text-secondary);
}

.review-feedback {
    width: 100%;
    margin-top: 6px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--surface-elevated-strong);
    background: var(--surface-ground, #fff);
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-family: inherit;
    resize: vertical;
}

.review-detail__correction {
    gap: 10px;
    padding-top: 14px;
    border-top: 1px solid var(--surface-border);
}

.review-detail__correction h3 {
    margin: 0;
    font: 900 15px/1.2 var(--font-ui);
    letter-spacing: -0.02em;
    color: var(--text-heading);
    text-transform: none;
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
    min-height: 52px;
    border-radius: var(--radius-md);
    background: var(--surface-card);
    font: 900 14.5px/1 var(--font-ui);
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
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.review-detail__hint {
    font-size: var(--text-sm);
    color: var(--text-secondary);
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

.filter-select {
    min-height: 40px;
    padding: 0 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--surface-border);
    font: inherit;
    font-size: 13px;
    color: var(--text-primary);
    background: var(--surface-card);
    outline: none;
    transition: border-color 0.15s;
}

.filter-select:focus {
    border-color: var(--practiq-violet);
}

.pagination-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 8px;
}

.pagination-info {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 700;
}

.review-ai > summary {
    cursor: pointer;
    list-style: none;
}

.review-ai > summary::-webkit-details-marker {
    display: none;
}

.review-ai > summary::after {
    content: '\e902';
    font-family: 'primeicons';
    margin-left: auto;
    font-size: 11px;
    transition: transform 0.2s;
}

.review-ai[open] > summary::after {
    transform: rotate(180deg);
}

.review-thumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
}

.review-thumb {
    display: grid;
    gap: 4px;
    justify-items: center;
    width: 96px;
    padding: 8px;
    border-radius: 12px;
    border: 1px solid var(--surface-elevated-strong);
    background: var(--surface-elevated);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: 700;
    cursor: pointer;
    transition: var(--transition-fast);
}

.review-thumb:hover:not(:disabled) {
    border-color: var(--practiq-violet);
    color: var(--practiq-violet);
}

.review-thumb:disabled {
    opacity: 0.6;
    cursor: progress;
}

.review-thumb img {
    width: 100%;
    height: 56px;

    object-fit: contain;
    border-radius: 8px;
    background: var(--surface-card);
}

.review-thumb--action {
    place-content: center;
    min-height: 84px;
    font-size: 18px;
}

.review-thumb span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-xs);
}

.review-answer-text {
    margin: 8px 0 0;
    color: var(--text-primary);
    white-space: pre-wrap;
}

.review-answer-text--none {
    color: var(--text-secondary);
    font-style: italic;
}

.muted {
    color: var(--text-secondary);
}

@media (max-width: 860px) {
    .review-split {
        grid-template-columns: minmax(0, 1fr);
    }

    .review-list-pane {
        display: none;
    }
    .review-detail {
        display: none;
    }

    .reviews-page:not(.detail-open) .review-list-pane {
        display: grid;
    }
    .reviews-page.detail-open .review-detail {
        display: grid;
    }
    .reviews-page.detail-open .back-link {
        display: inline-flex;
    }
    .reviews-page.detail-open .page-header,
    .reviews-page.detail-open .toolbar {
        display: none;
    }
}

@media (max-width: 640px) {
    .reviews-page {
        padding: 16px 14px 32px;
    }

    .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }

    .review-question {
        overflow-wrap: anywhere;
    }

    .review-thumbs {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
    }

    .review-thumb {
        width: auto;
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

    .pagination-controls {
        flex-wrap: wrap;
    }
}
.thumb-icon {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    color: var(--text-secondary);
    font-size: 20px;
}
</style>
