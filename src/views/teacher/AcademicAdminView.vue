<script setup lang="ts">
import UiModal from '@/components/ui/UiModal.vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import TeacherLayout from '@/layouts/TeacherLayout.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ConfirmModal from '@/components/ui/ConfirmModal.vue';
import { useConfirm } from '@/composables/useConfirm';
import { useCourse } from '@/composables/useCourse';
import { useGrade } from '@/composables/useGrade';
import { useSubject } from '@/composables/useSubject';
import type { AuthApiUser, Course, Grade, Subject } from '@/types';
import { useSchools } from '@/composables/useSchools';
import { useAuthAdmin } from '@/composables/useAuthAdmin';

const router = useRouter();
const { confirmState, showConfirm, onConfirm, onCancel } = useConfirm();
const { loadUsers } = useAuthAdmin();

function practiqUserId(user: AuthApiUser) {
    return user.username || user.id;
}
const {
    courses,
    studentsByCourseId,
    loadCourses,
    loadStudentsForCourse,
    createCourse: createCourseService,
    updateCourse: updateCourseService,
    deleteCourse: deleteCourseService,
} = useCourse();
const {
    grades,
    members: gradeMembers,
    loadGrades,
    createGrade: createGradeService,
    updateGrade: updateGradeService,
    deleteGrade: deleteGradeService,
    loadGradeMembers,
} = useGrade();
const {
    subjects,
    loadSubjects,
    createSubject: createSubjectService,
    updateSubject: updateSubjectService,
    deleteSubject: deleteSubjectService,
} = useSubject();

const loading = ref(false);
const { activeId } = useSchools();
const saving = ref(false);
const selectedGradeId = ref<string | null>(null);

const showGradeModal = ref(false);
const showCourseModal = ref(false);
const showSubjectCatalog = ref(false);

const editingGrade = ref<Grade | null>(null);
const editingCourse = ref<Course | null>(null);
const editingSubject = ref<{
    id: string;
    name: string;
    description: string;
} | null>(null);

const gradeForm = reactive({
    name: '',
    description: '',
    visualTheme: 'primary' as 'primary' | 'secondary',
});
const courseForm = reactive({
    subjectId: '',
    title: '',
    description: '',
    level: '',
});
const subjectForm = reactive({ name: '', description: '' });

const selectedGrade = computed(
    () => grades.value.find((g) => g.id === selectedGradeId.value) ?? null,
);
const selectedCourses = computed(() =>
    courses.value.filter((c) => c.grade_id === selectedGradeId.value),
);
const selectedGradeStudentCount = computed(() => {
    if (!selectedGradeId.value) return 0;
    const members = gradeMembers.value[selectedGradeId.value] || [];
    return members.filter((m) => m.profile_type === 'student').length;
});
const missingSubjects = computed(() => {
    const covered = new Set(selectedCourses.value.map((c) => c.subject_id));
    return subjects.value.filter((s) => !covered.has(s.id));
});

function courseStudentCount(courseId: string) {
    return studentsByCourseId.value[courseId]?.length;
}

function gradeCourses(gradeId: string) {
    return courses.value.filter((c) => c.grade_id === gradeId);
}

function subjectCourseCount(subjectId: string) {
    return courses.value.filter((c) => c.subject_id === subjectId).length;
}

function courseStatusLabel(status: Course['status']) {
    return status === 'published' ? 'Publicado' : status === 'archived' ? 'Archivado' : 'Borrador';
}

const teacherNameById = ref<Record<string, string>>({});

function teacherName(teacherId: string) {
    return teacherNameById.value[teacherId] || '';
}

onMounted(loadData);
watch(activeId, () => {
    selectedGradeId.value = null;
    loadData();
});
watch(
    selectedGradeId,
    (gradeId) => {
        if (gradeId && !gradeMembers.value[gradeId]) {
            loadGradeMembers(gradeId).catch(() => {});
        }
    },
    { immediate: true },
);
watch(
    selectedCourses,
    (courses) => {
        for (const course of courses) {
            if (!(course.id in studentsByCourseId.value)) {
                loadStudentsForCourse(course.id).catch(() => {});
            }
        }
    },
    { immediate: true },
);

async function loadData() {
    loading.value = true;
    try {
        const [, , , users] = await Promise.all([
            loadGrades(),
            loadSubjects(),
            loadCourses('teacher'),
            loadUsers({ limit: 1000, offset: 0 }).catch(() => []),
        ]);
        teacherNameById.value = Object.fromEntries(
            users.map((u) => [practiqUserId(u), `${u.first_name} ${u.last_name}`.trim()]),
        );
        if (!selectedGradeId.value && grades.value.length > 0) {
            selectedGradeId.value = grades.value[0].id;
        }
    } finally {
        loading.value = false;
    }
}

function openCreateGrade() {
    editingGrade.value = null;
    gradeForm.name = '';
    gradeForm.description = '';
    gradeForm.visualTheme = 'primary';
    showGradeModal.value = true;
}

function openEditGrade(grade: Grade) {
    editingGrade.value = grade;
    gradeForm.name = grade.name;
    gradeForm.description = grade.description || '';
    gradeForm.visualTheme = grade.visual_theme || 'primary';
    showGradeModal.value = true;
}

function closeGradeModal() {
    showGradeModal.value = false;
    editingGrade.value = null;
}

async function submitGrade() {
    saving.value = true;
    try {
        if (editingGrade.value) {
            await updateGradeService(editingGrade.value.id, {
                name: gradeForm.name,
                description: gradeForm.description,
                visual_theme: gradeForm.visualTheme,
            });
        } else {
            const grade = await createGradeService({
                name: gradeForm.name,
                description: gradeForm.description,
                visual_theme: gradeForm.visualTheme,
            });
            selectedGradeId.value = grade.id;
        }
        closeGradeModal();
        await loadData();
    } finally {
        saving.value = false;
    }
}

async function confirmDeleteGrade(id: string) {
    const ok = await showConfirm('¿Eliminar este grado?', {
        description: 'Los cursos asociados también se perderán.',
    });
    if (!ok) return;
    if (selectedGradeId.value === id) selectedGradeId.value = null;
    await deleteGradeService(id);
    await loadData();
    if (!selectedGradeId.value && grades.value.length > 0) {
        selectedGradeId.value = grades.value[0].id;
    }
}

function openCreateCourse(subjectId = '') {
    editingCourse.value = null;
    courseForm.subjectId = subjectId;
    courseForm.title = '';
    courseForm.description = '';
    courseForm.level = '';
    showCourseModal.value = true;
}

function openEditCourse(course: Course) {
    editingCourse.value = course;
    courseForm.subjectId = course.subject_id || '';
    courseForm.title = course.title;
    courseForm.description = course.description || '';
    courseForm.level = course.level || '';
    showCourseModal.value = true;
}

function closeCourseModal() {
    showCourseModal.value = false;
    editingCourse.value = null;
}

async function submitCourse() {
    if (!selectedGrade.value) return;
    saving.value = true;
    try {
        const subjectName = subjects.value.find((s) => s.id === courseForm.subjectId)?.name || '';
        if (editingCourse.value) {
            await updateCourseService(editingCourse.value.id, {
                title: courseForm.title,
                description: courseForm.description,
                grade_id: selectedGrade.value.id,
                subject_id: courseForm.subjectId,
                subject: subjectName,
                level: courseForm.level,
            });
        } else {
            await createCourseService({
                title: courseForm.title,
                description: courseForm.description,
                grade_id: selectedGrade.value.id,
                subject_id: courseForm.subjectId,
                subject: subjectName,
                level: courseForm.level,
            });
        }
        closeCourseModal();
    } finally {
        saving.value = false;
    }
}

async function confirmDeleteCourse(id: string) {
    const ok = await showConfirm('¿Eliminar este curso?');
    if (!ok) return;
    await deleteCourseService(id);
}

async function createSubject() {
    saving.value = true;
    try {
        await createSubjectService({
            name: subjectForm.name,
            description: subjectForm.description,
        });
        subjectForm.name = '';
        subjectForm.description = '';
        await loadData();
    } finally {
        saving.value = false;
    }
}

function startEditSubject(subject: Subject) {
    editingSubject.value = {
        id: subject.id,
        name: subject.name,
        description: subject.description || '',
    };
}

async function saveSubject() {
    if (!editingSubject.value) return;
    saving.value = true;
    try {
        await updateSubjectService(editingSubject.value.id, {
            name: editingSubject.value.name,
            description: editingSubject.value.description,
        });
        editingSubject.value = null;
        await loadData();
    } finally {
        saving.value = false;
    }
}

async function confirmDeleteSubject(id: string) {
    const ok = await showConfirm('¿Eliminar esta materia?', {
        description: 'Los cursos asociados a esta materia también se perderán.',
    });
    if (!ok) return;
    await deleteSubjectService(id);
    await loadData();
}
</script>

<template>
    <TeacherLayout>
        <div class="ac-root anim-stagger">
            <header class="page-header ac-page-header">
                <div class="page-header__left">
                    <p class="page-kicker">Gestión de escuela · Académico</p>
                    <h1 class="page-title">Grados y cursos</h1>
                    <p class="page-subtitle">
                        Un curso une un grado, una materia y su contenido propio.
                    </p>
                </div>
                <div class="page-header__right">
                    <button class="catalog-button" @click="showSubjectCatalog = true">
                        <i class="pi pi-book"></i>
                        Catálogo de materias
                        <span class="catalog-button__badge">{{ subjects.length }}</span>
                    </button>
                </div>
            </header>

            <div v-if="loading" class="ac-layout ac-layout--skeleton">
                <aside class="grade-sidebar">
                    <div class="sidebar-header">
                        <Skeleton width="60px" height="14px" />
                        <Skeleton width="70px" height="32px" rounded />
                    </div>
                    <div class="grade-nav">
                        <div
                            v-for="i in 4"
                            :key="i"
                            class="grade-nav-item grade-nav-item--skeleton"
                        >
                            <Skeleton width="75%" height="16px" />
                        </div>
                    </div>
                </aside>
                <main class="ac-main">
                    <div class="main-header">
                        <div style="display: flex; flex-direction: column; gap: 8px">
                            <Skeleton width="100px" height="14px" />
                            <Skeleton width="180px" height="28px" />
                        </div>
                    </div>
                    <div class="courses-grid">
                        <div v-for="i in 3" :key="i" class="course-tile course-tile--skeleton">
                            <div
                                class="course-tile__top"
                                style="
                                    display: flex;
                                    align-items: center;
                                    justify-content: space-between;
                                "
                            >
                                <Skeleton width="70px" height="20px" rounded />
                                <Skeleton width="24px" height="24px" variant="circle" />
                            </div>
                            <Skeleton width="85%" height="18px" style="margin: 12px 0 8px" />
                            <Skeleton width="100%" height="14px" />
                            <Skeleton width="65%" height="14px" style="margin-top: 4px" />
                        </div>
                    </div>
                </main>
            </div>

            <div v-else-if="grades.length === 0" class="onboarding">
                <div class="onboarding__card">
                    <div class="onboarding__icon">
                        <i class="pi pi-graduation-cap"></i>
                    </div>
                    <h2>Configurá tu estructura académica</h2>
                    <p>Seguí estos pasos para tener todo listo.</p>
                    <ol class="steps-list">
                        <li class="step-item">
                            <span class="step-num">1</span>
                            <div>
                                <strong>Crear un grado</strong>
                                <span>Ej: "1er grado". Cada grado agrupa sus propios cursos.</span>
                            </div>
                        </li>
                        <li class="step-item">
                            <span class="step-num">2</span>
                            <div>
                                <strong>Armar el catálogo de materias</strong>
                                <span
                                    >Ej: "Matemática". Son globales y se reutilizan en cualquier
                                    grado.</span
                                >
                            </div>
                        </li>
                        <li class="step-item">
                            <span class="step-num">3</span>
                            <div>
                                <strong>Crear cursos dentro del grado</strong>
                                <span>Un curso une un grado + una materia + contenido propio.</span>
                            </div>
                        </li>
                    </ol>
                    <div class="onboarding__actions">
                        <button class="btn-primary-lg" @click="openCreateGrade">
                            <i class="pi pi-plus"></i> Crear primer grado
                        </button>
                        <button class="btn-ghost" @click="showSubjectCatalog = true">
                            <i class="pi pi-book"></i> Catálogo de materias
                        </button>
                    </div>
                </div>
            </div>

            <div v-else class="ac-layout">
                <aside class="grade-sidebar">
                    <div class="sidebar-header">
                        <span class="sidebar-label">Grados</span>
                        <button class="sidebar-add-btn" type="button" @click="openCreateGrade">
                            <i class="pi pi-plus"></i>
                            Nuevo
                        </button>
                    </div>
                    <nav class="grade-nav">
                        <button
                            v-for="grade in grades"
                            :key="grade.id"
                            class="grade-nav-item"
                            :class="{
                                'grade-nav-item--active': selectedGradeId === grade.id,
                            }"
                            @click="selectedGradeId = grade.id"
                        >
                            <span class="grade-nav-item__name">{{ grade.name }}</span>
                            <span class="grade-nav-item__count">{{
                                gradeCourses(grade.id).length
                            }}</span>
                        </button>
                    </nav>
                </aside>

                <main class="grade-content">
                    <div v-if="!selectedGrade" class="select-hint">
                        <i class="pi pi-arrow-left"></i>
                        <span>Seleccioná un grado</span>
                    </div>

                    <template v-else>
                        <div class="grade-header">
                            <div>
                                <h2 class="grade-header__name">{{ selectedGrade.name }}</h2>
                                <p class="grade-header__desc">
                                    {{ selectedCourses.length }}
                                    {{ selectedCourses.length === 1 ? 'curso' : 'cursos' }}
                                    · {{ selectedGradeStudentCount }}
                                    {{ selectedGradeStudentCount === 1 ? 'alumno' : 'alumnos' }}
                                    <template v-if="selectedGrade.description">
                                        · {{ selectedGrade.description }}
                                    </template>
                                </p>
                            </div>
                            <div class="grade-header__actions">
                                <button
                                    class="icon-btn"
                                    title="Editar grado"
                                    @click="openEditGrade(selectedGrade)"
                                >
                                    <i class="pi pi-pencil"></i>
                                </button>
                                <button class="btn-add-course" @click="openCreateCourse()">
                                    <i class="pi pi-plus"></i> Nuevo curso
                                </button>
                                <button
                                    class="icon-btn icon-btn--danger"
                                    title="Eliminar grado"
                                    @click="confirmDeleteGrade(selectedGrade.id)"
                                >
                                    <i class="pi pi-trash"></i>
                                </button>
                            </div>
                        </div>

                        <div class="courses-area">
                            <div v-if="selectedCourses.length === 0" class="courses-empty">
                                <div class="courses-empty__icon">
                                    <i class="pi pi-book"></i>
                                </div>
                                <p>Este grado aún no tiene cursos.</p>
                                <p class="courses-empty__sub">
                                    Creá uno eligiendo una materia del catálogo.
                                </p>
                                <button class="btn-add-course" @click="openCreateCourse()">
                                    <i class="pi pi-plus"></i> Crear primer curso
                                </button>
                            </div>

                            <div v-else class="courses-grid">
                                <article
                                    v-for="course in selectedCourses"
                                    :key="course.id"
                                    class="academic-course-card"
                                >
                                    <div class="academic-course-card__top">
                                        <span class="subject-pill">{{
                                            course.subject || 'Sin materia'
                                        }}</span>
                                        <div class="academic-course-card__top-right">
                                            <span
                                                class="status-text"
                                                :class="`status-text--${course.status}`"
                                                >{{ courseStatusLabel(course.status) }}</span
                                            >
                                            <div class="academic-course-card__actions">
                                                <button
                                                    class="card-action-btn"
                                                    title="Editar"
                                                    @click.stop="openEditCourse(course)"
                                                >
                                                    <i class="pi pi-pencil"></i>
                                                </button>
                                                <button
                                                    class="card-action-btn card-action-btn--danger"
                                                    title="Eliminar"
                                                    @click.stop="confirmDeleteCourse(course.id)"
                                                >
                                                    <i class="pi pi-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <RouterLink
                                        class="academic-course-card__open"
                                        :to="`/teacher/courses/${course.id}`"
                                    >
                                        <div class="academic-course-card__body">
                                            <h4 class="academic-course-card__title">
                                                {{ course.title }}
                                            </h4>
                                        </div>
                                        <div class="academic-course-card__footer">
                                            <span
                                                v-if="teacherName(course.teacher_id)"
                                                class="academic-course-card__teacher"
                                                >{{ teacherName(course.teacher_id) }}</span
                                            >
                                            <span
                                                v-if="courseStudentCount(course.id) !== undefined"
                                                class="academic-course-card__students"
                                            >
                                                {{ courseStudentCount(course.id) }}
                                                {{
                                                    courseStudentCount(course.id) === 1
                                                        ? 'alumno'
                                                        : 'alumnos'
                                                }}
                                            </span>
                                        </div>
                                    </RouterLink>
                                </article>
                                <button
                                    v-for="subject in missingSubjects"
                                    :key="subject.id"
                                    type="button"
                                    class="missing-subject-card"
                                    @click="openCreateCourse(subject.id)"
                                >
                                    <span class="missing-subject-card__name">{{
                                        subject.name
                                    }}</span>
                                    <span class="missing-subject-card__hint"
                                        >Sin curso en este grado · Crear</span
                                    >
                                </button>
                            </div>
                        </div>
                    </template>
                </main>
            </div>

            <UiModal :visible="Boolean(showGradeModal)" @close="closeGradeModal">
                <template v-if="showGradeModal">
                    <div class="modal-card">
                        <div class="modal-head">
                            <h3>{{ editingGrade ? 'Editar grado' : 'Nuevo grado' }}</h3>
                            <button class="modal-close" @click="closeGradeModal">×</button>
                        </div>
                        <form @submit.prevent="submitGrade" class="modal-body">
                            <div class="form-group">
                                <label class="form-label">Nombre</label>
                                <input
                                    v-model="gradeForm.name"
                                    class="form-input"
                                    placeholder="Ej: 1er grado"
                                    required
                                />
                            </div>
                            <div class="form-group">
                                <label class="form-label"
                                    >Descripción <span class="optional">(opcional)</span></label
                                >
                                <textarea
                                    v-model="gradeForm.description"
                                    class="form-textarea"
                                    rows="2"
                                    placeholder="Descripción breve"
                                ></textarea>
                            </div>
                            <div class="modal-actions">
                                <button
                                    type="button"
                                    class="btn-secondary"
                                    @click="closeGradeModal"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" class="btn-primary" :disabled="saving">
                                    {{ editingGrade ? 'Guardar cambios' : 'Crear grado' }}
                                </button>
                            </div>
                        </form>
                    </div>
                </template>
            </UiModal>

            <UiModal :visible="Boolean(showCourseModal)" @close="closeCourseModal">
                <template v-if="showCourseModal">
                    <div class="modal-card modal-card--wide">
                        <div class="modal-head">
                            <div>
                                <h3>{{ editingCourse ? 'Editar curso' : 'Nuevo curso' }}</h3>
                                <p class="modal-subtitle">
                                    en <strong>{{ selectedGrade?.name }}</strong>
                                </p>
                            </div>
                            <button class="modal-close" @click="closeCourseModal">×</button>
                        </div>

                        <div v-if="subjects.length === 0" class="modal-body">
                            <div class="notice notice--warning">
                                <i class="pi pi-info-circle"></i>
                                <div>
                                    <strong>El catálogo de materias está vacío.</strong>
                                    <p>Agregá materias primero y luego volvé a crear el curso.</p>
                                    <button
                                        class="btn-primary notice-action"
                                        @click="
                                            closeCourseModal();
                                            showSubjectCatalog = true;
                                        "
                                    >
                                        <i class="pi pi-book"></i> Ir al catálogo
                                    </button>
                                </div>
                            </div>
                        </div>

                        <form v-else @submit.prevent="submitCourse" class="modal-body">
                            <div class="form-group">
                                <label class="form-label">Materia</label>
                                <select v-model="courseForm.subjectId" class="form-select" required>
                                    <option value="">Seleccioná una materia</option>
                                    <option v-for="s in subjects" :key="s.id" :value="s.id">
                                        {{ s.name }}
                                    </option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Título del curso</label>
                                <input
                                    v-model="courseForm.title"
                                    class="form-input"
                                    placeholder="Ej: Matemática — Primer grado"
                                    required
                                />
                            </div>
                            <div class="form-group">
                                <label class="form-label"
                                    >Descripción <span class="optional">(opcional)</span></label
                                >
                                <textarea
                                    v-model="courseForm.description"
                                    class="form-textarea"
                                    rows="2"
                                ></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label"
                                    >Nivel académico <span class="optional">(opcional)</span></label
                                >
                                <input
                                    v-model="courseForm.level"
                                    class="form-input"
                                    placeholder="Primaria, Secundaria..."
                                />
                            </div>
                            <div class="modal-actions">
                                <button
                                    type="button"
                                    class="btn-secondary"
                                    @click="closeCourseModal"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" class="btn-primary" :disabled="saving">
                                    {{ editingCourse ? 'Guardar cambios' : 'Crear curso' }}
                                </button>
                            </div>
                        </form>
                    </div>
                </template>
            </UiModal>

            <UiModal :visible="Boolean(showSubjectCatalog)" @close="showSubjectCatalog = false">
                <template v-if="showSubjectCatalog">
                    <div class="modal-card modal-card--wide">
                        <div class="modal-head">
                            <div>
                                <h3>Catálogo de materias</h3>
                                <p class="modal-subtitle">
                                    Materias globales disponibles para todos los grados.
                                </p>
                            </div>
                            <button class="modal-close" @click="showSubjectCatalog = false">
                                ×
                            </button>
                        </div>
                        <div class="modal-body">
                            <form class="subject-create-row" @submit.prevent="createSubject">
                                <input
                                    v-model="subjectForm.name"
                                    class="form-input"
                                    placeholder="Nombre de la materia"
                                    required
                                />
                                <input
                                    v-model="subjectForm.description"
                                    class="form-input"
                                    placeholder="Descripción (opcional)"
                                />
                                <button class="btn-primary" type="submit" :disabled="saving">
                                    <i class="pi pi-plus"></i> Agregar
                                </button>
                            </form>

                            <div v-if="subjects.length === 0" class="subjects-empty">
                                Aún no hay materias. Creá la primera arriba.
                            </div>
                            <ul v-else class="subject-list">
                                <li
                                    v-for="subject in subjects"
                                    :key="subject.id"
                                    class="subject-list-item"
                                >
                                    <template v-if="editingSubject?.id === subject.id">
                                        <input
                                            v-model="editingSubject.name"
                                            class="form-input form-input--sm"
                                        />
                                        <input
                                            v-model="editingSubject.description"
                                            class="form-input form-input--sm"
                                            placeholder="Descripción"
                                        />
                                        <div class="edit-actions">
                                            <button
                                                class="btn-primary btn-sm"
                                                @click="saveSubject"
                                                :disabled="saving"
                                            >
                                                Guardar
                                            </button>
                                            <button
                                                class="btn-ghost btn-sm"
                                                @click="editingSubject = null"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </template>
                                    <template v-else>
                                        <div class="subject-list-item__info">
                                            <strong>{{ subject.name }}</strong>
                                            <span v-if="subject.description">{{
                                                subject.description
                                            }}</span>
                                        </div>
                                        <span class="subject-usage-badge">
                                            {{ subjectCourseCount(subject.id) }}
                                            {{
                                                subjectCourseCount(subject.id) === 1
                                                    ? 'curso'
                                                    : 'cursos'
                                            }}
                                        </span>
                                        <div class="subject-list-item__actions">
                                            <button
                                                class="icon-btn icon-btn--sm"
                                                @click="startEditSubject(subject)"
                                            >
                                                <i class="pi pi-pencil"></i>
                                            </button>
                                            <button
                                                class="icon-btn icon-btn--sm icon-btn--danger"
                                                @click="confirmDeleteSubject(subject.id)"
                                            >
                                                <i class="pi pi-trash"></i>
                                            </button>
                                        </div>
                                    </template>
                                </li>
                            </ul>
                        </div>
                    </div>
                </template>
            </UiModal>
        </div>

        <ConfirmModal v-bind="confirmState" @confirm="onConfirm" @cancel="onCancel" />
    </TeacherLayout>
</template>

<style scoped>
.ac-root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding: 24px 28px 40px;
    background: transparent;
    gap: 18px;
}

.catalog-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
    color: var(--brand-700);
    font: 900 13.5px/1 var(--font-ui);
    cursor: pointer;
    transition: background-color 0.15s;
}
.catalog-button:hover {
    background: var(--surface-sunken);
}
.catalog-button__badge {
    min-width: 20px;
    height: 20px;
    padding: 1px 8px;
    border-radius: var(--radius-pill);
    background: var(--surface-sunken);
    color: inherit;
    font-size: 11.5px;
    font-weight: 800;
    display: grid;
    place-items: center;
}

.ac-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--text-muted);
    font-size: var(--text-md);
}

.onboarding {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
}

.onboarding__card {
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-2xl);
    padding: 24px 28px;
    max-width: 500px;
    width: 100%;
    box-shadow: var(--shadow-soft);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
}

.onboarding__icon {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-2xl);
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
    font-size: 28px;
    display: grid;
    place-items: center;
}

.onboarding__card h2 {
    font-size: 17px;
    font-weight: 800;
    color: var(--text-heading);
    margin: 0;
}

.onboarding__card > p {
    font-size: var(--text-md);
    color: var(--text-secondary);
    margin: 0;
}

.steps-list {
    list-style: none;
    margin: 0;
    padding: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    text-align: left;
}

.step-item {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 9px 12px;
    background: var(--surface-bg);
    border: 1px solid rgba(var(--surface-border-rgb), 0.14);
    border-radius: var(--radius-lg);
}

.step-num {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--practiq-violet);
    color: var(--color-on-primary);
    font-weight: 800;
    font-size: var(--text-sm);
    display: grid;
    place-items: center;
    flex-shrink: 0;
}

.step-item div {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-top: 4px;
}

.step-item strong {
    font-size: var(--text-base);
    color: var(--text-heading);
}

.step-item span {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.5;
}

.onboarding__actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
}

.ac-layout {
    flex: 1;
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    align-items: start;
    min-height: 0;
    gap: 16px;
}

.grade-sidebar {
    display: grid;
    gap: 8px;
    min-width: 0;
}

.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.sidebar-label {
    font: 900 10.5px/1 var(--font-ui);
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--line-control);
}

.grade-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-x: auto;
}
.grade-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 0 0 auto;
    width: 100%;
    min-height: 42px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface);
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.15s;
}
.grade-nav-item:hover {
    background: var(--canvas);
}
.grade-nav-item--active,
.grade-nav-item--active:hover {
    background: var(--surface-sunken);
}
.grade-nav-item--active .grade-nav-item__name {
    color: var(--brand-700);
}

.grade-nav-item__name {
    flex: 1;
    min-width: 0;
    font: 600 13px/1.3 var(--font-body);
    color: var(--ink-soft);
    overflow: hidden;
    text-overflow: ellipsis;
}

.grade-nav-item__count {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--line-control);
    flex-shrink: 0;
}

.sidebar-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 32px;
    padding: 0 10px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--brand-700);
    font: 900 12px/1 var(--font-ui);
    cursor: pointer;
    transition: background-color 0.15s;
}
.sidebar-add-btn i {
    font-size: 10px;
}
.sidebar-add-btn:hover {
    background: var(--surface-sunken);
}

.grade-content {
    min-width: 0;
    display: grid;
    gap: 12px;
}

.select-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 32px 0;
    color: var(--ink-muted);
    font-size: var(--text-md);
}

.grade-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line);
}

.grade-header__name {
    margin: 0;
    font: 900 21px/1.2 var(--font-ui);
    letter-spacing: -0.03em;
    color: var(--ink);
}

.grade-header__desc {
    margin: 3px 0 0;
    font-size: 12.5px;
    color: var(--ink-muted);
}

.grade-header__actions {
    display: flex;
    gap: 6px;
}
.grade-header__actions .icon-btn {
    width: 40px;
    height: 40px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface);
    color: var(--ink-muted);
    font-size: 12px;
}

.courses-area {
    display: grid;
    gap: 12px;
}

.courses-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 32px 20px;
    background: var(--surface-glass);
    border: 1.5px dashed rgba(var(--surface-border-rgb), 0.3);
    border-radius: var(--radius-2xl);
    text-align: center;
}
.courses-empty__icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-xl);
    background: var(--fill-primary-subtle);
    color: var(--practiq-violet);
    font-size: 22px;
    display: grid;
    place-items: center;
    margin: 0 auto;
}
.courses-empty p {
    font-size: var(--text-md);
    color: var(--text-secondary);
    margin: 0;
    font-weight: 600;
}
.courses-empty__sub {
    font-size: var(--text-base);
    color: var(--text-muted) !important;
    font-weight: 400 !important;
}

.courses-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr));
    gap: 10px;
}

.academic-course-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
        transform 0.18s ease,
        box-shadow 0.18s ease;
}
.academic-course-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 26px rgba(57, 49, 104, 0.1);
}

.academic-course-card__open {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 10px;
    color: inherit;
    text-decoration: none;
}

.academic-course-card__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
}

.subject-pill {
    padding: 3px 9px;
    border-radius: var(--radius-xs);
    background: var(--surface-sunken);
    color: var(--brand-700);
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
}

.academic-course-card__top-right {
    display: flex;
    align-items: center;
    gap: 6px;
}

.status-text {
    font-size: 11px;
    font-weight: 700;
    color: var(--success);
    white-space: nowrap;
}
.status-text--draft {
    color: var(--warning);
}
.status-text--archived {
    color: var(--text-muted);
}

.academic-course-card__actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s;
}
.academic-course-card:hover .academic-course-card__actions {
    opacity: 1;
}

.card-action-btn {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-xs);
    border: none;
    background: var(--surface-sunken);
    color: var(--text-secondary);
    cursor: pointer;
    display: grid;
    place-items: center;
    font-size: var(--text-xs);
    transition: all 0.12s;
}
.card-action-btn:hover {
    background: var(--surface-card);
}
.card-action-btn--danger:hover {
    color: var(--color-error);
}

.academic-course-card__body {
    flex: 1;
}

.academic-course-card__title {
    margin: 0;
    font: 900 15.5px/1.3 var(--font-ui);
    letter-spacing: -0.02em;
    color: var(--ink);
}

.academic-course-card__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--line);
}
.academic-course-card__teacher {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: var(--ink-muted);
}
.academic-course-card__students {
    flex: 0 0 auto;
    font-size: 12px;
    color: var(--ink-muted);
}

.missing-subject-card {
    display: grid;
    place-items: center;
    gap: 4px;
    min-height: 120px;
    padding: 14px;
    border: 1px dashed var(--brand-200);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--brand-700);
    font: inherit;
    cursor: pointer;
    text-align: center;
    transition: background-color 0.15s;
}
.missing-subject-card:hover {
    background: var(--surface-sunken);
}
.missing-subject-card__name {
    font: 900 13.5px/1.3 var(--font-ui);
}
.missing-subject-card__hint {
    font-size: var(--text-xs);
    color: var(--text-muted);
}

.btn-add-course {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 0 14px;
    border: none;
    border-radius: 10px;
    background: var(--brand-500);
    color: var(--on-brand);
    font: 900 13px/1 var(--font-ui);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: opacity 0.15s;
}
.btn-add-course:hover {
    opacity: 0.88;
}

.btn-primary-lg {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border: none;
    border-radius: var(--radius-lg);
    background: var(--practiq-violet);
    color: var(--color-on-primary);
    font-weight: 700;
    font-size: var(--text-md);
    cursor: pointer;
    transition: opacity 0.15s;
}
.btn-primary-lg:hover {
    opacity: 0.88;
}

.btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 20px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--practiq-violet);
    color: var(--color-on-primary);
    font-weight: 700;
    font-size: var(--text-md);
    cursor: pointer;
    transition: opacity 0.15s;
}
.btn-primary:disabled {
    opacity: 0.5;
}
.btn-primary:hover:not(:disabled) {
    opacity: 0.88;
}

.btn-sm {
    font-size: var(--text-base);
    padding: 7px 14px;
    border-radius: var(--radius-md);
}

.btn-secondary {
    padding: 10px 20px;
    border: 1.5px solid rgba(var(--surface-border-rgb), 0.28);
    border-radius: var(--radius-md);
    background: var(--surface-card);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: var(--text-md);
    cursor: pointer;
    transition: border-color 0.12s;
}
.btn-secondary:hover {
    border-color: var(--text-muted);
}

.btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 20px;
    border: 1.5px solid rgba(var(--surface-border-rgb), 0.28);
    border-radius: var(--radius-md);
    background: var(--surface-card);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: var(--text-md);
    cursor: pointer;
    transition: all 0.12s;
}
.btn-ghost:hover {
    border-color: var(--practiq-violet);
    color: var(--practiq-violet);
}

.btn-ghost.btn-sm {
    font-size: var(--text-base);
    padding: 7px 14px;
    border-radius: var(--radius-md);
}

.icon-btn {
    width: 33px;
    height: 33px;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--surface-border-rgb), 0.18);
    background: var(--surface-card);
    color: var(--text-secondary);
    cursor: pointer;
    display: grid;
    place-items: center;
    font-size: var(--text-base);
    transition: all 0.12s;
}
.icon-btn:hover {
    border-color: var(--practiq-violet-light);
    color: var(--practiq-violet);
}
.icon-btn--danger:hover {
    border-color: rgba(var(--color-error-rgb), 0.35);
    color: var(--color-error);
    background: var(--color-error-bg);
}
.icon-btn--sm {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    font-size: var(--text-xs);
}

.modal-card {
    background: var(--surface-card);
    border-radius: var(--radius-2xl);
    width: min(500px, 100%);

    max-height: calc(100dvh - 48px);
    overflow-y: auto;
    box-shadow: var(--shadow-panel);
}
.modal-card--wide {
    width: min(600px, 100%);
}

.modal-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px 12px;
    border-bottom: 1px solid var(--surface-border);
}

.modal-head h3 {
    font-size: 17px;
    font-weight: 800;
    color: var(--text-heading);
    margin: 0 0 3px;
}

.modal-subtitle {
    font-size: var(--text-base);
    color: var(--text-secondary);
    margin: 0;
}

.modal-close {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    border: none;
    background: var(--surface-hover);
    color: var(--text-secondary);
    font-size: 17px;
    cursor: pointer;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    line-height: 1;
}
.modal-close:hover {
    background: var(--surface-border);
}

.modal-body {
    padding: 14px 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding-top: 4px;
}

.notice {
    display: flex;
    gap: 12px;
    padding: 16px;
    border-radius: var(--radius-lg);
    font-size: var(--text-base);
}
.notice--warning {
    background: var(--color-warning-bg);
    border: 1px solid rgba(var(--color-warning-rgb), 0.25);
}
.notice--warning .pi {
    color: var(--color-warning-dark);
    font-size: 17px;
    flex-shrink: 0;
    margin-top: 2px;
}
.notice--warning strong {
    display: block;
    color: var(--color-warning-dark);
    font-size: var(--text-md);
    margin-bottom: 4px;
}
.notice--warning p {
    color: var(--color-warning-dark);
    margin: 0;
}
.notice-action {
    margin-top: 10px;
}

.subject-create-row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 10px;
    align-items: end;
}

.subjects-empty {
    text-align: center;
    color: var(--text-muted);
    padding: 20px;
    font-size: var(--text-md);
}

.subject-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.subject-list-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 13px;
    background: var(--surface-subtle);
    border: 1px solid rgba(var(--surface-border-rgb), 0.14);
    border-radius: var(--radius-md);
}

.subject-list-item__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.subject-list-item__info strong {
    font-size: var(--text-md);
    color: var(--text-heading);
}
.subject-list-item__info span {
    font-size: var(--text-sm);
    color: var(--text-secondary);
}

.subject-usage-badge {
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--text-muted);
    background: var(--surface-hover);
    border-radius: var(--radius-pill);
    padding: 2px 9px;
    white-space: nowrap;
    flex-shrink: 0;
}

.subject-list-item__actions {
    display: flex;
    gap: 5px;
    flex-shrink: 0;
}

.edit-actions {
    display: flex;
    gap: 7px;
    align-items: center;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.form-label {
    font-size: var(--text-base);
    font-weight: 700;
    color: var(--text-secondary);
}

.optional {
    font-weight: 400;
    color: var(--text-muted);
}

.form-input,
.form-textarea,
.form-select {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 13px;
    border: 1.5px solid rgba(var(--surface-border-rgb), 0.28);
    border-radius: var(--radius-md);
    background: var(--surface-subtle);
    font: inherit;
    font-size: var(--text-md);
    color: var(--text-heading);
    outline: none;
    transition:
        border-color 0.15s,
        background 0.15s;
}
.form-input:focus,
.form-textarea:focus,
.form-select:focus {
    border-color: var(--practiq-violet);
    background: var(--surface-card);
    box-shadow: var(--focus-ring-primary);
}
.form-input--sm {
    padding: 7px 11px;
    font-size: var(--text-base);
    border-radius: var(--radius-md);
}
.form-textarea {
    min-height: 78px;
    resize: vertical;
}

@media (max-width: 1023px) {
    .ac-root {
        display: block;
        width: 100%;
        min-width: 0;
        padding: 16px 14px 32px;
    }
    .ac-layout {
        width: 100%;
        min-width: 0;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto 1fr;
    }
    .grade-sidebar,
    .grade-content {
        width: 100%;
        min-width: 0;
        border-right: none;
    }
    .grade-nav {
        flex-direction: row;
        overflow-y: hidden;
    }
    .grade-nav-item {
        width: auto;
    }
    .subject-create-row {
        grid-template-columns: 1fr;
    }

    .icon-btn,
    .icon-btn--sm,
    .card-action-btn,
    .modal-close {
        width: 44px;
        height: 44px;
    }

    .modal-close {
        background: transparent;
        font-size: 22px;
    }
}

@media (max-width: 1023px) {
    .modal-card,
    .modal-card--wide {
        width: 100%;
        max-width: 100%;
        max-height: 95dvh;
    }

    .modal-actions {
        flex-direction: column-reverse;

        margin-top: 4px;
    }
    .modal-actions > * {
        width: 100%;
    }
}
</style>
