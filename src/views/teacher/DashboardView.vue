<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import TeacherLayout from '@/layouts/TeacherLayout.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import UiModal from '@/components/ui/UiModal.vue';
import InviteStudentsModal from '@/components/teacher/students/InviteStudentsModal.vue';
import { useCourse } from '@/composables/useCourse';
import { useAssignment } from '@/composables/useAssignment';
import { useGrade } from '@/composables/useGrade';
import { useProfile } from '@/composables/useProfile';
import { useSubject } from '@/composables/useSubject';
import { usePendingReviews } from '@/composables/usePendingReviews';
import { useProgress } from '@/composables/useProgress';
import { formatDate } from '@/utils/formatters';
import { masteryTier } from '@/utils/mastery';
import type { AssignedUser, Grade } from '@/types';
import { useSchools } from '@/composables/useSchools';
import { practiqApi } from '@/api/request/server';
import { NotebookService } from '@/services/notebooks/notebookService';

const notebookService = new NotebookService(practiqApi);

const router = useRouter();
const authStore = useAuthStore();
const {
    courses,
    loading: loadingCourses,
    loadCourses,
    createCourse: createCourseService,
} = useCourse();
const { grades, loadGrades, loadGradesByUsers } = useGrade();
const { subjects, loadSubjects } = useSubject();
const { loadProfile } = useProfile();
const { loadMyStudents } = useAssignment();
const { count: pendingReviews, hasMore: pendingHasMore, load: loadPending } = usePendingReviews();
const { loadStudentProgress } = useProgress();
const assignedStudents = ref<AssignedUser[]>([]);
const studentGrades = ref<Record<string, Grade[]>>({});
const studentMastery = ref<Record<string, number | null>>({});
const notebooksPendingCount = ref(0);
const notebooksAiReviewedCount = ref(0);
const loading = ref(true);
const showCreateModal = ref(false);
const showInviteModal = ref(false);
const creating = ref(false);
const courseView = ref<'grid' | 'list'>(
    localStorage.getItem('practiq-teacher-course-view') === 'list' ? 'list' : 'grid',
);
const currentStudentPage = ref(1);
const studentsPerPage = 20;
const studentQuery = ref('');
const gradeFilter = ref('all');
const { activeId } = useSchools();

const newCourse = reactive({
    title: '',
    description: '',
    subject: '',
    grade_id: '',
    level: '',
});

const teacherName = computed(() => {
    const name = authStore.profile?.name || '';
    return name.split(' ')[0] || 'Docente';
});

const todayLabel = computed(() => {
    const label = formatDate(new Date().toISOString(), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).replace(',', '');
    return label.charAt(0).toUpperCase() + label.slice(1);
});

const pendingShown = computed(() => (pendingHasMore.value ? '99+' : pendingReviews.value));
const pendingTotal = computed(() => pendingReviews.value + notebooksPendingCount.value);
const introLine = computed(() =>
    pendingTotal.value > 0
        ? `${pendingTotal.value} ${pendingTotal.value === 1 ? 'respuesta espera' : 'respuestas esperan'} tu criterio. El resto ya lo corrigió la IA.`
        : 'Organizá tus cursos, alumnos y contenidos desde un solo lugar.',
);

const assignedStudentsByGrade = computed(() => {
    const buckets = new Map<
        string,
        { gradeKey: string; gradeName: string; students: AssignedUser[] }
    >();
    for (const student of assignedStudents.value) {
        const gradesForStudent = studentGrades.value[student.id] || [];
        if (!gradesForStudent.length) {
            if (!buckets.has('no-grade'))
                buckets.set('no-grade', {
                    gradeKey: 'no-grade',
                    gradeName: 'Sin grado',
                    students: [],
                });
            buckets.get('no-grade')!.students.push(student);
            continue;
        }
        for (const grade of gradesForStudent) {
            if (!buckets.has(grade.id))
                buckets.set(grade.id, {
                    gradeKey: grade.id,
                    gradeName: grade.name,
                    students: [],
                });
            buckets.get(grade.id)!.students.push(student);
        }
    }
    return Array.from(buckets.values());
});

const filteredStudents = computed(() => {
    const query = studentQuery.value.trim().toLowerCase();
    const inGrade =
        gradeFilter.value === 'all'
            ? null
            : assignedStudentsByGrade.value.find((g) => g.gradeKey === gradeFilter.value);
    const allowed = inGrade ? new Set(inGrade.students.map((s) => s.id)) : null;
    const matches = assignedStudents.value.filter((student) => {
        if (allowed && !allowed.has(student.id)) return false;
        if (!query) return true;
        return (
            student.name.toLowerCase().includes(query) ||
            student.email.toLowerCase().includes(query)
        );
    });
    // Los que menos dominan aparecen primero; sin datos de progreso van al final.
    return [...matches].sort((a, b) => {
        const ma = studentMastery.value[a.id];
        const mb = studentMastery.value[b.id];
        if (ma == null && mb == null) return 0;
        if (ma == null) return 1;
        if (mb == null) return -1;
        return ma - mb;
    });
});

function masteryColor(score: number | null) {
    if (score == null) return 'var(--ink-muted)';
    const tier = masteryTier(score);
    if (tier === 'mastered') return 'var(--success)';
    if (tier === 'progress') return 'var(--warning)';
    return 'var(--danger)';
}

const paginatedStudents = computed(() => {
    const start = (currentStudentPage.value - 1) * studentsPerPage;
    return filteredStudents.value.slice(start, start + studentsPerPage);
});

const totalStudentPages = computed(() =>
    Math.max(1, Math.ceil(filteredStudents.value.length / studentsPerPage)),
);

watch([studentQuery, gradeFilter], () => {
    currentStudentPage.value = 1;
});

onMounted(async () => {
    if (!authStore.profile) {
        try {
            const profile = await loadProfile();
            authStore.setProfile(profile);
        } catch {}
    }
    await loadCoursesData();
    await loadCatalogs();
    await loadAssignedStudents();
    await Promise.all([loadPending(), loadNotebooksPending()]);
});
watch(activeId, async () => {
    gradeFilter.value = 'all';
    await Promise.all([
        loadCoursesData(),
        loadCatalogs(),
        loadAssignedStudents(),
        loadPending(),
        loadNotebooksPending(),
    ]);
});

async function loadNotebooksPending() {
    try {
        const { data } = await notebookService.getSubmissions({ reviewed: false, limit: 200 });
        notebooksPendingCount.value = data.length;
        notebooksAiReviewedCount.value = data.filter((s) => s.ai_reviewed_at).length;
    } catch (err) {
        console.error(err);
        notebooksPendingCount.value = 0;
        notebooksAiReviewedCount.value = 0;
    }
}

async function loadCoursesData() {
    loading.value = true;
    try {
        await loadCourses('teacher');
    } catch (err) {
        console.error(err);
    } finally {
        loading.value = false;
    }
}

async function createCourse() {
    creating.value = true;
    try {
        const selectedSubject = subjects.value.find((item) => item.id === newCourse.subject);
        await createCourseService({
            title: newCourse.title,
            description: newCourse.description,
            subject_id: newCourse.subject,
            subject: selectedSubject?.name || '',
            grade_id: newCourse.grade_id,
            level: newCourse.level,
        });
        showCreateModal.value = false;
        newCourse.title = '';
        newCourse.description = '';
        newCourse.subject = '';
        newCourse.grade_id = '';
        newCourse.level = '';
    } catch (err) {
        console.error(err);
    } finally {
        creating.value = false;
    }
}

function setCourseView(view: 'grid' | 'list') {
    courseView.value = view;
    localStorage.setItem('practiq-teacher-course-view', view);
}
function studentProgressRoute(student: AssignedUser) {
    return {
        path: `/teacher/students/${student.id}/progress`,
        query: {
            name: encodeURIComponent(student.name),
            email: encodeURIComponent(student.email),
        },
    };
}

function nextStudentPage() {
    if (currentStudentPage.value < totalStudentPages.value) {
        currentStudentPage.value++;
    }
}

function prevStudentPage() {
    if (currentStudentPage.value > 1) {
        currentStudentPage.value--;
    }
}

async function loadCatalogs() {
    try {
        await Promise.all([loadGrades(), loadSubjects()]);
    } catch (err) {
        console.error(err);
    }
}

async function loadAssignedStudents() {
    try {
        assignedStudents.value = await loadMyStudents();

        try {
            studentGrades.value = await loadGradesByUsers(
                assignedStudents.value.map((student) => student.id),
            );
        } catch (err) {
            console.error(err);
            studentGrades.value = {};
        }

        await loadStudentsMastery();
    } catch (err) {
        console.error(err);
        assignedStudents.value = [];
        studentGrades.value = {};
    }
}

async function loadStudentsMastery() {
    const entries = await Promise.all(
        assignedStudents.value.map(async (student) => {
            try {
                const topics = await loadStudentProgress(student.id);
                const scores = (topics || []).map((t) => t.mastery_score);
                const avg = scores.length
                    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
                    : null;
                return [student.id, avg] as const;
            } catch {
                return [student.id, null] as const;
            }
        }),
    );
    studentMastery.value = Object.fromEntries(entries);
}

function goToPendingReviews() {
    router.push('/teacher/attempt-reviews?reviewed=unreviewed');
}

function goToNotebookReviews() {
    router.push('/teacher/notebook-reviews');
}

function subjectColor(subject?: string) {
    const s = (subject || '').toLowerCase();
    if (s.includes('matem')) return 'var(--brand-500)';
    if (s.includes('lectura') || s.includes('lengu')) return 'var(--info-solid)';
    if (s.includes('ingl')) return 'var(--success-solid)';
    if (s.includes('ciencia')) return 'var(--warning-solid)';
    if (s.includes('histor') || s.includes('social')) return 'var(--danger-solid)';
    return 'var(--ink-muted)';
}

const statusLabel: Record<string, string> = {
    draft: 'Borrador',
    archived: 'Archivado',
};
</script>

<template>
    <TeacherLayout>
        <div class="dashboard anim-stagger">
            <header class="page-header">
                <div class="page-header__left">
                    <div class="page-kicker">{{ todayLabel }}</div>
                    <div class="page-heading-row">
                        <h1 class="page-title">Hola, <span class="text-accent">{{ teacherName }}</span></h1>
                    </div>
                    <p class="page-intro">{{ introLine }}</p>
                </div>
                <div class="page-header__right">
                    <button class="btn btn-secondary" type="button" @click="showInviteModal = true">
                        <i class="pi pi-user-plus"></i>
                        Invitar alumnos
                    </button>
                    <button class="btn btn-primary" type="button" @click="showCreateModal = true">
                        <i class="pi pi-plus"></i>
                        Nuevo curso
                    </button>
                </div>
            </header>

            <section
                v-if="!loading && (pendingReviews > 0 || notebooksPendingCount > 0)"
                class="review-panel"
                aria-labelledby="review-title"
            >
                <div class="review-panel__head">
                    <h2 id="review-title" class="review-panel__title">Para revisar</h2>
                    <span class="review-panel__hint">Más antiguas primero</span>
                </div>
                <div class="review-grid">
                    <article v-if="pendingReviews > 0" class="review-card">
                        <div class="review-card__row">
                            <span class="review-card__icon review-card__icon--warning"
                                ><i class="pi pi-paperclip"></i
                            ></span>
                            <div class="review-card__body">
                                <div class="review-card__count">
                                    <strong>{{ pendingShown }}</strong>
                                    <span>pruebas de nivel</span>
                                </div>
                                <p>Están esperando tu corrección para que el alumno avance.</p>
                            </div>
                        </div>
                        <button class="btn btn-primary" type="button" @click="goToPendingReviews">
                            Empezar a corregir <i class="pi pi-arrow-right"></i>
                        </button>
                    </article>
                    <article v-if="notebooksPendingCount > 0" class="review-card">
                        <div class="review-card__row">
                            <span class="review-card__icon review-card__icon--brand"
                                ><i class="pi pi-book"></i
                            ></span>
                            <div class="review-card__body">
                                <div class="review-card__count">
                                    <strong>{{ notebooksPendingCount }}</strong>
                                    <span>cuadernos entregados</span>
                                </div>
                                <p>
                                    La IA ya dejó devolución en {{ notebooksAiReviewedCount }}.
                                    Falta tu visto bueno.
                                </p>
                            </div>
                        </div>
                        <button
                            class="btn btn-secondary"
                            type="button"
                            @click="goToNotebookReviews"
                        >
                            Revisar entregas
                        </button>
                    </article>
                </div>
            </section>

            <template v-if="loading">
                <p class="sr-only" role="status" aria-live="polite">Cargando tu panel…</p>
                <section class="content-section" aria-hidden="true">
                    <div class="section-header">
                        <Skeleton width="140px" height="24px" />
                    </div>
                    <div class="grid-cards">
                        <div v-for="i in 3" :key="i" class="course-card">
                            <Skeleton variant="badge" width="90px" />
                            <Skeleton width="80%" height="18px" />
                            <Skeleton width="95%" height="14px" />
                            <Skeleton width="100px" height="12px" style="margin-top: 12px" />
                        </div>
                    </div>
                </section>
            </template>

            <template v-else>
                <section class="content-section">
                    <div class="section-header">
                        <div>
                            <div class="section-title-row">
                                <h2 class="section-title">Mis cursos</h2>
                                <span class="section-count">{{ courses.length }}</span>
                            </div>
                            <p class="section-subtitle">
                                Accedé a los contenidos y ejercicios de cada curso.
                            </p>
                        </div>
                        <div class="toolbar">
                            <div class="segmented" role="group" aria-label="Vista de cursos">
                                <button
                                    type="button"
                                    :class="{ 'is-active': courseView === 'grid' }"
                                    :aria-pressed="courseView === 'grid'"
                                    aria-label="Vista de tarjetas"
                                    @click="setCourseView('grid')"
                                >
                                    <i class="pi pi-th-large"></i>
                                </button>
                                <button
                                    type="button"
                                    :class="{ 'is-active': courseView === 'list' }"
                                    :aria-pressed="courseView === 'list'"
                                    aria-label="Vista de lista"
                                    @click="setCourseView('list')"
                                >
                                    <i class="pi pi-list"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div v-if="courses.length === 0" class="empty-state">
                        <div class="empty-state__icon"><i class="pi pi-book"></i></div>
                        <h3>Sin cursos aún</h3>
                        <p>Creá tu primer curso para agregar temas, ejercicios y cuadernos.</p>
                        <button
                            class="btn btn-primary"
                            type="button"
                            @click="showCreateModal = true"
                        >
                            <i class="pi pi-plus"></i> Crear primer curso
                        </button>
                    </div>

                    <div v-else-if="courseView === 'grid'" class="grid-cards">
                        <RouterLink
                            v-for="course in courses"
                            :key="course.id"
                            class="course-card"
                            :to="`/teacher/courses/${course.id}`"
                        >
                            <div class="course-card__top">
                                <span
                                    class="badge subject-badge"
                                    :style="{ '--subject': subjectColor(course.subject) }"
                                >
                                    {{ course.subject || 'General' }}
                                </span>
                                <span v-if="course.grade_name" class="badge">{{
                                    course.grade_name
                                }}</span>
                                <span v-if="course.level" class="badge">{{ course.level }}</span>
                                <span v-if="statusLabel[course.status]" class="badge badge-warning">
                                    {{ statusLabel[course.status] }}
                                </span>
                            </div>
                            <h3 class="course-title">{{ course.title }}</h3>
                            <p class="course-desc">{{ course.description || 'Sin descripción' }}</p>
                            <div class="course-card__footer">
                                <span class="course-date">
                                    <i class="pi pi-calendar"></i>
                                    {{ formatDate(course.created_at) }}
                                </span>
                                <span class="course-cta"
                                    >Ver curso <i class="pi pi-arrow-right"></i
                                ></span>
                            </div>
                        </RouterLink>
                    </div>

                    <div v-else class="row-list">
                        <RouterLink
                            v-for="course in courses"
                            :key="course.id"
                            class="row-item course-row"
                            :to="`/teacher/courses/${course.id}`"
                        >
                            <span class="course-row__main">
                                <span class="row-item__name">{{ course.title }}</span>
                                <span class="course-row__badges">
                                    <span
                                        class="badge subject-badge"
                                        :style="{ '--subject': subjectColor(course.subject) }"
                                    >
                                        {{ course.subject || 'General' }}
                                    </span>
                                    <span v-if="course.grade_name" class="badge">{{
                                        course.grade_name
                                    }}</span>
                                    <span v-if="course.level" class="badge">{{
                                        course.level
                                    }}</span>
                                    <span
                                        v-if="statusLabel[course.status]"
                                        class="badge badge-warning"
                                    >
                                        {{ statusLabel[course.status] }}
                                    </span>
                                </span>
                            </span>
                            <span class="row-item__meta course-row__desc">
                                {{ course.description || 'Sin descripción' }}
                            </span>
                            <span class="row-item__meta course-row__date">{{
                                formatDate(course.created_at)
                            }}</span>
                            <span class="row-item__go"><i class="pi pi-angle-right"></i></span>
                        </RouterLink>
                    </div>
                </section>

                <section v-if="assignedStudents.length" class="content-section">
                    <div class="section-header">
                        <div>
                            <div class="section-title-row">
                                <h2 class="section-title">Alumnos</h2>
                                <span class="section-count">{{ assignedStudents.length }}</span>
                            </div>
                            <p class="section-subtitle">Los que menos dominan aparecen primero.</p>
                        </div>
                        <label class="search">
                            <span class="sr-only">Buscar alumno</span>
                            <i class="pi pi-search" aria-hidden="true"></i>
                            <input
                                v-model="studentQuery"
                                class="input"
                                type="search"
                                placeholder="Buscar alumno"
                            />
                        </label>
                    </div>

                    <div
                        v-if="assignedStudentsByGrade.length > 1"
                        class="chips"
                        role="group"
                        aria-label="Filtrar por grado"
                    >
                        <button
                            type="button"
                            class="chip"
                            :class="{ 'is-active': gradeFilter === 'all' }"
                            :aria-pressed="gradeFilter === 'all'"
                            @click="gradeFilter = 'all'"
                        >
                            Todos <span>{{ assignedStudents.length }}</span>
                        </button>
                        <button
                            v-for="group in assignedStudentsByGrade"
                            :key="group.gradeKey"
                            type="button"
                            class="chip"
                            :class="{ 'is-active': gradeFilter === group.gradeKey }"
                            :aria-pressed="gradeFilter === group.gradeKey"
                            @click="gradeFilter = group.gradeKey"
                        >
                            {{ group.gradeName }} <span>{{ group.students.length }}</span>
                        </button>
                    </div>

                    <div v-if="filteredStudents.length" class="row-list student-list">
                        <RouterLink
                            v-for="student in paginatedStudents"
                            :key="student.id"
                            class="row-item student-row"
                            :to="studentProgressRoute(student)"
                        >
                            <span class="avatar">{{ student.name.charAt(0).toUpperCase() }}</span>
                            <span class="student-row__text">
                                <span class="row-item__name">{{ student.name }}</span>
                                <small class="student-row__sub">
                                    {{ (studentGrades[student.id] || [])[0]?.name || 'Sin grado' }}
                                    · {{ student.email }}
                                </small>
                            </span>
                            <span class="student-row__mastery">
                                <span
                                    v-if="studentMastery[student.id] != null"
                                    class="student-row__pct"
                                    :style="{ color: masteryColor(studentMastery[student.id]) }"
                                    >{{ studentMastery[student.id] }}%</span
                                >
                                <span v-else class="student-row__pct student-row__pct--muted"
                                    >Sin datos</span
                                >
                                <span class="student-row__bar">
                                    <span
                                        class="student-row__bar-fill"
                                        :style="{
                                            width: (studentMastery[student.id] ?? 0) + '%',
                                            background: masteryColor(studentMastery[student.id]),
                                        }"
                                    ></span>
                                </span>
                            </span>
                            <span class="row-item__go"><i class="pi pi-angle-right"></i></span>
                        </RouterLink>
                    </div>
                    <div v-else class="empty-state">
                        <div class="empty-state__icon"><i class="pi pi-search"></i></div>
                        <h3>Ningún alumno coincide</h3>
                        <p>Probá con otro nombre o quitá el filtro de grado.</p>
                        <button
                            class="btn btn-secondary"
                            type="button"
                            @click="
                                studentQuery = '';
                                gradeFilter = 'all';
                            "
                        >
                            Quitar filtros
                        </button>
                    </div>

                    <div v-if="filteredStudents.length > studentsPerPage" class="pagination">
                        <button
                            class="btn btn-secondary btn-sm"
                            type="button"
                            :disabled="currentStudentPage === 1"
                            @click="prevStudentPage"
                        >
                            <i class="pi pi-chevron-left"></i>
                            Anterior
                        </button>
                        <span class="pagination__info" role="status" aria-live="polite">
                            Página {{ currentStudentPage }} de {{ totalStudentPages }} ·
                            {{ filteredStudents.length }} estudiantes
                        </span>
                        <button
                            class="btn btn-secondary btn-sm"
                            type="button"
                            :disabled="currentStudentPage === totalStudentPages"
                            @click="nextStudentPage"
                        >
                            Siguiente
                            <i class="pi pi-chevron-right"></i>
                        </button>
                    </div>
                </section>

                <section v-else class="content-section">
                    <div class="empty-state">
                        <div class="empty-state__icon"><i class="pi pi-users"></i></div>
                        <h3>Todavía no tenés alumnos</h3>
                        <p>
                            Generá tu código de invitación y compartilo con la clase: cada alumno
                            que lo ingrese queda vinculado con vos.
                        </p>
                        <button
                            class="btn btn-primary"
                            type="button"
                            @click="showInviteModal = true"
                        >
                            <i class="pi pi-user-plus"></i>
                            Invitar alumnos
                        </button>
                    </div>
                </section>
            </template>
        </div>

        <UiModal :visible="showCreateModal" label="Nuevo curso" @close="showCreateModal = false">
            <div class="modal-box">
                <div class="modal-head">
                    <h3 class="modal-title">Nuevo curso</h3>
                    <button
                        class="icon-btn"
                        type="button"
                        aria-label="Cerrar"
                        @click="showCreateModal = false"
                    >
                        <i class="pi pi-times"></i>
                    </button>
                </div>

                <div
                    v-if="grades.length === 0 || subjects.length === 0"
                    class="notice notice--warning"
                >
                    <i class="pi pi-info-circle"></i>
                    <span class="notice__text">
                        Antes de crear un curso necesitás tener
                        <template v-if="grades.length === 0 && subjects.length === 0"
                            >grados y materias</template
                        >
                        <template v-else-if="grades.length === 0">grados</template>
                        <template v-else>materias</template>
                        configurados.
                        <router-link
                            to="/teacher/admin/academic"
                            @click="showCreateModal = false"
                            class="setup-link"
                        >
                            Ir a académico →
                        </router-link>
                    </span>
                </div>

                <form @submit.prevent="createCourse">
                    <div class="form-group">
                        <label class="form-label">Título *</label>
                        <input
                            v-model="newCourse.title"
                            class="form-input"
                            placeholder="Matemática 7.º grado"
                            required
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descripción</label>
                        <textarea
                            v-model="newCourse.description"
                            class="form-textarea"
                            placeholder="Describí el curso…"
                            rows="3"
                        ></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Materia</label>
                            <select v-model="newCourse.subject" class="form-select">
                                <option value="">Seleccionar</option>
                                <option
                                    v-for="subject in subjects"
                                    :key="subject.id"
                                    :value="subject.id"
                                >
                                    {{ subject.name }}
                                </option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Grado</label>
                            <select v-model="newCourse.grade_id" class="form-select">
                                <option value="">Seleccionar</option>
                                <option v-for="grade in grades" :key="grade.id" :value="grade.id">
                                    {{ grade.name }}
                                </option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nivel académico</label>
                        <input
                            v-model="newCourse.level"
                            class="form-input"
                            placeholder="Primaria, Secundaria…"
                        />
                    </div>
                    <div class="modal-actions">
                        <button
                            type="button"
                            class="btn btn-secondary"
                            @click="showCreateModal = false"
                        >
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary" :disabled="creating">
                            <span v-if="creating" class="spinner spinner-sm"></span>
                            <template v-else><i class="pi pi-check"></i></template>
                            Crear curso
                        </button>
                    </div>
                </form>
            </div>
        </UiModal>

        <InviteStudentsModal v-if="showInviteModal" @close="showInviteModal = false" />
    </TeacherLayout>
</template>

<style scoped>
.skeleton-stack {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.review-panel {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-5);
    border: 1px solid var(--brand-200);
    border-radius: var(--radius-lg);
    background: var(--surface-sunken);
}
.review-panel__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
}
.review-panel__title {
    margin: 0;
    font: 900 13px/18px var(--font-ui);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--brand-700);
}
.review-panel__hint {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-muted);
}
.review-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
    gap: var(--space-3);
}
.review-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
}
.review-card__row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
}
.review-card__icon {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    border-radius: var(--radius-md);
}
.review-card__icon--warning {
    background: var(--warning-soft);
    color: var(--warning);
}
.review-card__icon--brand {
    background: var(--brand-50);
    color: var(--brand-700);
}
.review-card__body {
    flex: 1;
    min-width: 0;
}
.review-card__count {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    flex-wrap: wrap;
}
.review-card__count strong {
    font: 900 26px/1 var(--font-ui);
    letter-spacing: -0.03em;
    color: var(--ink);
}
.review-card__count span {
    font: 900 15.5px/1 var(--font-ui);
    color: var(--ink);
}
.review-card__body p {
    margin: 5px 0 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--ink-muted);
}
.review-card .btn {
    align-self: stretch;
    justify-content: center;
}

.student-row {
    grid-template-columns: 40px minmax(0, 1fr) 100px 20px;
}
.student-row__text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.student-row__sub {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: var(--ink-muted);
}
.student-row__mastery {
    display: grid;
    justify-items: end;
    gap: 4px;
}
.student-row__pct {
    font-size: 12px;
    font-weight: 700;
}
.student-row__pct--muted {
    color: var(--ink-muted);
    font-weight: 600;
}
.student-row__bar {
    width: 84px;
    height: 5px;
    border-radius: var(--radius-pill);
    background: var(--brand-100);
    overflow: hidden;
}
.student-row__bar-fill {
    display: block;
    height: 5px;
    border-radius: var(--radius-pill);
}

@media (max-width: 1023px) {
    .student-row {
        grid-template-columns: 40px minmax(0, 1fr) 20px;
    }
    .student-row__mastery {
        display: none;
    }
}

.chips {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
}
.chips::-webkit-scrollbar {
    display: none;
}
.chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    flex: 0 0 auto;
    min-height: 32px;
    padding: 0 var(--space-3);
    border: 1px solid var(--line-control);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--ink-soft);
    font: 700 13px/1 var(--font-ui);
    cursor: pointer;
}
.chip span {
    color: var(--ink-muted);
    font-weight: 800;
}
.chip:hover {
    background: var(--surface-sunken);
}
.chip.is-active {
    background: var(--brand-50);
    border-color: var(--brand-600);
    color: var(--brand-800);
}
.chip.is-active span {
    color: var(--brand-800);
}

.course-row {
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.6fr) 110px 20px;
}
.course-row__main {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
}
.course-row__badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
}

.pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    margin-top: var(--space-4);
}
.pagination__info {
    color: var(--ink-soft);
    font: 400 13px/20px var(--font-body);
    text-align: center;
}
.setup-link {
    color: var(--brand-600);
    font-weight: 700;
    text-decoration: underline;
}

@media (max-width: 1023px) {
    .course-row {
        grid-template-columns: minmax(0, 1fr) 20px;
    }
    .course-row__desc,
    .course-row__date {
        display: none;
    }
    .course-row .row-item__go {
        grid-column: 2;
        grid-row: 1;
    }
    .pagination {
        flex-direction: column;
        align-items: stretch;
    }
    .pagination .btn {
        width: 100%;
    }
}
</style>
