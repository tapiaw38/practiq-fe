<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { renderEquation, renderInlineEquation } from '@/composables/useContentRenderer';
import FileViewer from '@/components/ui/FileViewer.vue';
import type { Exercise } from '@/types';
import { splitStatement, deserializeAnswer } from '@/utils/fillBlanks';
import type { ExercisesListEmits, ExercisesListProps } from './ExercisesList.types';

const props = defineProps<ExercisesListProps>();
const emit = defineEmits<ExercisesListEmits>();

const levelGroups = computed(() => {
    const byLevel = new Map<number, Exercise[]>();
    for (const exercise of props.exercises) {
        const level = exercise.difficulty ?? 0;
        const items = byLevel.get(level) ?? [];
        items.push(exercise);
        byLevel.set(level, items);
    }
    return [...byLevel.entries()]
        .sort(([a], [b]) => a - b)
        .map(([level, items]) => ({ level, items }));
});

const collapsedLevels = ref<Set<number>>(new Set());

watch(
    levelGroups,
    (groups) => {
        const levels = new Set(groups.map((group) => group.level));
        const next = new Set([...collapsedLevels.value].filter((level) => levels.has(level)));
        if (!collapsedLevels.value.size && groups.length > 1) {
            for (const group of groups) next.add(group.level);
        }
        collapsedLevels.value = next;
    },
    { immediate: true },
);

function toggleLevel(level: number) {
    const next = new Set(collapsedLevels.value);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    collapsedLevels.value = next;
}

const allCollapsed = computed(
    () => levelGroups.value.length > 0 && collapsedLevels.value.size === levelGroups.value.length,
);

function toggleAll() {
    collapsedLevels.value = allCollapsed.value
        ? new Set()
        : new Set(levelGroups.value.map((group) => group.level));
}

function fillBlanksAnswerText(correctAnswer?: string): string {
    const placements = deserializeAnswer(correctAnswer);
    const entries = Object.entries(placements).sort(([a], [b]) => Number(a) - Number(b));
    if (!entries.length) return 'N/A';
    return entries.map(([, answer]) => answer).join(', ');
}

const preview = ref<{ url: string; title: string } | null>(null);

function openPreview(exercise: Exercise) {
    preview.value = {
        url: exercise.media_view_url ?? '',
        title: exercise.question || 'Material del enunciado',
    };
}

const diffColor = (difficulty: number) => {
    if (difficulty <= 3) return 'var(--color-success-bg)';
    if (difficulty <= 6) return 'var(--color-warning-bg)';
    return 'var(--color-error-bg)';
};
</script>

<template>
    <div class="tab-content">
        <div class="section-header">
            <div class="flex gap-3 items-center">
                <h2>Ejercicios</h2>
                <select
                    :value="selectedTopicId"
                    class="form-select topic-select"
                    @change="
                        emit('update:selectedTopicId', ($event.target as HTMLSelectElement).value)
                    "
                >
                    <option value="">Seleccionar tema</option>
                    <option v-for="topic in topics" :key="topic.id" :value="topic.id">
                        {{ topic.title }}
                    </option>
                </select>
            </div>
            <div class="flex gap-2 toolbar-actions">
                <button
                    class="btn btn-secondary btn-sm"
                    title="Exportar los ejercicios de este tema a un archivo JSON"
                    aria-label="Exportar"
                    :disabled="!selectedTopicId || exercises.length === 0"
                    @click="emit('export-json')"
                >
                    <i class="pi pi-download"></i> <span class="btn-label">Exportar</span>
                </button>
                <button
                    class="btn btn-secondary btn-sm"
                    title="Importar ejercicios desde un archivo JSON"
                    aria-label="Importar"
                    :disabled="!selectedTopicId"
                    @click="emit('import-json')"
                >
                    <i class="pi pi-upload"></i> <span class="btn-label">Importar</span>
                </button>
                <button
                    class="btn btn-secondary btn-sm"
                    title="Crear con IA"
                    aria-label="Crear con IA"
                    :disabled="!selectedTopicId"
                    @click="emit('create-ai')"
                >
                    <i class="pi pi-sparkles"></i> <span class="btn-label">Crear con IA</span>
                </button>
                <button
                    class="btn btn-primary btn-sm"
                    title="Nuevo Ejercicio"
                    aria-label="Nuevo Ejercicio"
                    :disabled="!selectedTopicId"
                    @click="emit('create')"
                >
                    <i class="pi pi-plus"></i> <span class="btn-label">Nuevo Ejercicio</span>
                </button>
            </div>
        </div>
        <div v-if="!selectedTopicId" class="empty-inline">
            Selecciona un tema para ver sus ejercicios.
        </div>
        <div v-else-if="exercises.length === 0" class="empty-inline">
            No hay ejercicios en este tema.
        </div>
        <template v-else>
            <div v-if="levelGroups.length > 1" class="levels-toolbar">
                <button type="button" class="btn btn-ghost btn-sm" @click="toggleAll">
                    <i
                        class="pi"
                        :class="allCollapsed ? 'pi-angle-double-down' : 'pi-angle-double-up'"
                    ></i>
                    {{ allCollapsed ? 'Expandir todo' : 'Contraer todo' }}
                </button>
            </div>

            <section v-for="group in levelGroups" :key="group.level" class="level-group">
                <button type="button" class="level-head" @click="toggleLevel(group.level)">
                    <span class="difficulty-badge" :style="{ background: diffColor(group.level) }">
                        {{ group.level }}
                    </span>
                    <span class="level-title">Nivel {{ group.level }}</span>
                    <span class="level-count">
                        {{ group.items.length }}
                        {{ group.items.length === 1 ? 'ejercicio' : 'ejercicios' }}
                    </span>
                    <i
                        class="pi"
                        :class="
                            collapsedLevels.has(group.level) ? 'pi-chevron-down' : 'pi-chevron-up'
                        "
                    ></i>
                </button>

                <div v-if="!collapsedLevels.has(group.level)" class="items-list">
                    <div v-for="exercise in group.items" :key="exercise.id" class="list-item">
                        <div class="item-info">
                            <div>
                                <div
                                    v-if="exercise.type === 'equation'"
                                    class="item-title item-title--math"
                                    v-html="renderEquation(exercise.question)"
                                ></div>
                                <div
                                    v-else-if="exercise.type === 'fill_blanks'"
                                    class="item-title item-title--truncate"
                                >
                                    <template
                                        v-for="(segment, index) in splitStatement(
                                            exercise.question,
                                        )"
                                        :key="index"
                                    >
                                        <span v-if="segment.kind === 'text'">{{
                                            segment.value
                                        }}</span>
                                        <span v-else class="blank-slot">___</span>
                                    </template>
                                </div>
                                <div v-else class="item-title item-title--truncate">
                                    {{ exercise.question }}
                                </div>
                                <div class="item-subtitle item-subtitle--truncate">
                                    {{ exercise.type }}
                                    <template v-if="exercise.type === 'equation'">
                                        · Respuesta:
                                        <span
                                            class="answer-math"
                                            v-html="
                                                renderInlineEquation(
                                                    exercise.correct_answer || 'N/A',
                                                )
                                            "
                                        ></span>
                                    </template>
                                    <template v-else-if="exercise.type === 'fill_blanks'"
                                        >· Respuesta:
                                        {{
                                            fillBlanksAnswerText(exercise.correct_answer)
                                        }}</template
                                    >
                                    <template v-else
                                        >· Respuesta:
                                        {{ exercise.correct_answer || 'N/A' }}</template
                                    >
                                </div>
                            </div>
                        </div>
                        <div class="item-actions">
                            <button
                                v-if="exercise.media_view_url"
                                class="btn btn-ghost btn-sm"
                                title="Ver material del enunciado"
                                aria-label="Ver material del enunciado"
                                @click="openPreview(exercise)"
                            >
                                <i class="pi pi-play-circle"></i>
                            </button>
                            <button class="btn btn-ghost btn-sm" @click="emit('edit', exercise)">
                                <i class="pi pi-pencil"></i>
                            </button>
                            <button
                                class="btn btn-ghost btn-sm"
                                @click="emit('delete', exercise.id)"
                            >
                                <i class="pi pi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </template>

        <FileViewer
            :show="!!preview"
            :url="preview?.url"
            :title="preview?.title"
            @close="preview = null"
        />
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
.section-header,
.item-info,
.item-actions {
    display: flex;
    align-items: center;
}
.blank-slot {
    display: inline-block;
    min-width: 44px;
    padding: 0 4px;
    margin: 0 2px;
    border-bottom: 2px solid var(--practiq-violet, #6d28d9);
    color: var(--practiq-violet, #6d28d9);
    font-weight: 700;
    text-align: center;
}
.section-header {
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
.topic-select {
    min-width: 220px;
}
.empty-inline {
    padding: 18px;
    border: 1px dashed var(--surface-border);
    border-radius: var(--radius-lg);
    color: var(--text-secondary);
    text-align: center;
}
.levels-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 6px;
}

.level-group {
    margin-bottom: 10px;
}

.level-head {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    background: var(--surface-sunken);
    cursor: pointer;
    color: inherit;
    text-align: left;
    min-height: 44px;
}

.level-title {
    font-weight: 700;
    font-size: 14px;
}

.level-count {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-secondary);
}

.level-group .items-list {
    margin-top: 8px;
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
    transition: var(--transition-fast);
}
.list-item:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
}
.item-info {
    gap: 12px;
    min-width: 0;
}
.item-title {
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.3;
}
.item-title--math {
    display: block;
    max-width: min(100%, 720px);
    overflow-x: auto;
    padding: 8px 10px;
    border-radius: var(--radius-md);
    background: var(--surface-subtle);
    border-left: 3px solid var(--practiq-violet);
}
.item-title--math :deep(p) {
    margin: 0;
}
.item-title--math :deep(.katex-display) {
    margin: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 2px 0;
    text-align: left;
}
.item-title--math :deep(.katex) {
    font-size: 1.08em;
}
.item-title--truncate,
.item-subtitle--truncate {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
}
.item-title--truncate {
    -webkit-line-clamp: 3;
}
.item-subtitle--truncate {
    -webkit-line-clamp: 2;
}
.item-subtitle {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    margin-top: 3px;
}
.answer-math {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    overflow-x: auto;
    vertical-align: middle;
}
.answer-math :deep(.katex) {
    font-size: 1em;
}
.difficulty-badge {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    display: grid;
    place-items: center;
    font-weight: 800;
    color: var(--text-primary);
    flex: 0 0 auto;
}
.item-actions {
    gap: 8px;
    flex: 0 0 auto;
}
@media (max-width: 760px) {
    .section-header,
    .list-item {
        flex-direction: column;
        align-items: stretch;
    }
    .section-header .flex.gap-3 {
        flex-wrap: wrap;
    }
    .topic-select {
        min-width: 0;
        flex: 1 1 auto;
    }
    .toolbar-actions {
        flex-wrap: nowrap;
    }
    .toolbar-actions .btn {
        flex: 1 1 0;
        padding: 8px 0;
    }
    .toolbar-actions .btn-label {
        display: none;
    }
    .item-actions {
        justify-content: flex-end;
    }
}
</style>
