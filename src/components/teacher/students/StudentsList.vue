<script setup lang="ts">
  import type { StudentsListProps } from "./StudentsList.types";

  defineProps<StudentsListProps>();
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
    </div>
    <div v-if="students.length === 0" class="empty-inline">
      No hay alumnos asociados a este curso.
    </div>
    <div class="items-list">
      <div v-for="student in students" :key="student.id" class="list-item">
        <div class="item-info">
          <div class="student-avatar">{{ student.name[0] }}</div>
          <div>
            <div class="item-title">{{ student.name }}</div>
            <div class="item-subtitle">{{ student.email }}</div>
          </div>
        </div>
      </div>
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
    justify-content: space-between;
    gap: 14px;
    padding: 14px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    background: var(--surface-card);
  }
  .item-info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
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
    .tab-content { padding: 14px; }
    .section-copy { line-height: 1.45; }
    .list-item { padding: 12px; }
    .item-info > div:last-child { min-width: 0; }
    .item-title, .item-subtitle { overflow-wrap: anywhere; }
  }
</style>
