<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Student } from '@/types';
import type { StudentsListEmits, StudentsListProps } from './StudentsList.types';

const props = defineProps<StudentsListProps>();
const emit = defineEmits<StudentsListEmits>();

const query = ref('');

const filteredStudents = computed(() => {
    const q = query.value.trim().toLowerCase();
    if (!q) return props.students;
    return props.students.filter(
        (student) =>
            student.name.toLowerCase().includes(q) || student.email.toLowerCase().includes(q),
    );
});

function studentProgressRoute(student: Student) {
    return {
        path: `/teacher/students/${student.id}/progress`,
        query: {
            name: encodeURIComponent(student.name),
            email: encodeURIComponent(student.email),
        },
    };
}
</script>

<template>
    <div class="tab-content">
        <div class="section-header">
            <div>
                <h2>Alumnos del curso</h2>
                <p class="section-copy">
                    Se listan los alumnos del grado asociado al curso y también cualquier
                    inscripción manual adicional.
                </p>
            </div>
            <button class="btn btn-secondary" type="button" @click="emit('invite')">
                <i class="pi pi-user-plus"></i>
                Invitar
            </button>
        </div>

        <label v-if="students.length" class="search">
            <span class="sr-only">Buscar alumno</span>
            <i class="pi pi-search" aria-hidden="true"></i>
            <input v-model="query" class="input" type="search" placeholder="Buscar alumno" />
        </label>

        <div v-if="students.length === 0" class="empty-inline">
            No hay alumnos asociados a este curso.
        </div>
        <div v-else-if="filteredStudents.length === 0" class="empty-inline">
            Ningún alumno coincide con la búsqueda.
        </div>
        <div v-else class="items-list">
            <RouterLink
                v-for="student in filteredStudents"
                :key="student.id"
                class="list-item"
                :to="studentProgressRoute(student)"
            >
                <div class="item-info">
                    <div class="student-avatar">{{ student.name[0] }}</div>
                    <div>
                        <div class="item-title">{{ student.name }}</div>
                        <div class="item-subtitle">{{ student.email }}</div>
                    </div>
                </div>
                <i class="pi pi-angle-right item-go"></i>
            </RouterLink>
        </div>
    </div>
</template>

<style scoped>
.tab-content {
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-card);
    padding: 20px;
}
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 16px;
}
.section-header h2 {
    margin: 0;
    color: var(--text-heading);
    font-size: 1.25rem;
    font-weight: 800;
}
.section-copy {
    margin: 6px 0 0;
    color: var(--text-secondary);
    font-size: var(--text-sm);
}
.search {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 12px;
    margin-bottom: 14px;
    max-width: 280px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    background: var(--surface-card);
}
.search i {
    font-size: var(--text-sm);
    color: var(--text-secondary);
}
.search .input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: var(--text-sm);
    color: var(--text-primary);
}
.empty-inline {
    padding: 18px;
    border: 1px dashed var(--surface-border);
    border-radius: var(--radius-lg);
    color: var(--text-secondary);
    text-align: center;
}
.items-list {
    display: grid;
    gap: 10px;
}
.list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 14px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    background: var(--surface-card);
    text-decoration: none;
    color: inherit;
    transition: background 0.18s ease;
}
.list-item:hover {
    background: var(--surface-sunken);
}
.item-info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}
.item-go {
    flex: 0 0 auto;
    color: var(--text-secondary);
    font-size: var(--text-sm);
}
.student-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
    font-weight: 800;
}
.item-title {
    font-weight: 800;
    color: var(--text-primary);
}
.item-subtitle {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    margin-top: 3px;
}

@media (max-width: 600px) {
    .tab-content {
        padding: 14px;
    }
    .section-copy {
        line-height: 1.45;
    }
    .list-item {
        padding: 12px;
    }
    .item-info > div:last-child {
        min-width: 0;
    }
    .item-title,
    .item-subtitle {
        overflow-wrap: anywhere;
    }
}
</style>
