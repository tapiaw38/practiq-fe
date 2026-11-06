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
    display: grid;
    gap: 12px;
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
    font: 900 17px/1.2 var(--font-ui);
    letter-spacing: -0.02em;
    color: var(--ink);
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
    border: 1px dashed var(--brand-200);
    border-radius: var(--radius-md);
    color: var(--ink-muted);
    text-align: center;
}
.items-list {
    display: grid;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
    overflow: hidden;
}
.items-list:empty {
    display: none;
}
.list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-top: 1px solid var(--line);
    background: var(--surface);
    color: inherit;
    text-decoration: none;
}
.list-item:first-child {
    border-top: 0;
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
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    border-radius: 10px;
    background: var(--surface-sunken);
    color: var(--brand-700);
    font: 900 13px/1 var(--font-ui);
}
.item-title {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--ink);
}
.item-subtitle {
    margin-top: 2px;
    font-size: 12px;
    color: var(--ink-muted);
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
