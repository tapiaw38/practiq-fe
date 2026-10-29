<script setup lang="ts">
import { ref } from 'vue';
import type {
    CourseLevelsPanelEmits,
    CourseLevelsPanelProps,
    TeacherLevelItem,
} from './CourseLevelsPanel.types';

const props = defineProps<CourseLevelsPanelProps>();
const emit = defineEmits<CourseLevelsPanelEmits>();
const addMenuLevel = ref<number | null>(null);

const countItems = (value: unknown) => (Array.isArray(value) ? value.length : Number(value || 0));

function plural(count: number, one: string, many: string) {
    return `${count} ${count === 1 ? one : many}`;
}

function levelTitle(lv: TeacherLevelItem) {
    const withTopic = [...lv.practices, ...(lv.levelTest ? [lv.levelTest] : []), ...lv.notebooks]
        .map((item) => ('topic_title' in item ? item.topic_title : ''))
        .find(Boolean);
    return withTopic || `Nivel ${lv.level}`;
}

function levelMeta(lv: TeacherLevelItem) {
    const total = lv.practices.length + (lv.levelTest ? 1 : 0) + lv.notebooks.length;
    if (!total) return 'Sin actividades todavía';
    return [
        plural(lv.practices.length, 'práctica', 'prácticas'),
        lv.levelTest ? '1 prueba' : 'sin prueba',
        plural(lv.notebooks.length, 'cuaderno', 'cuadernos'),
    ].join(' · ');
}

function toggleAddMenu(level: number) {
    addMenuLevel.value = addMenuLevel.value === level ? null : level;
}

function add(kind: 'practice' | 'test' | 'notebook', lv: TeacherLevelItem) {
    addMenuLevel.value = null;
    if (kind === 'practice') emit('createPractice', lv.level);
    else if (kind === 'notebook') emit('createNotebook', lv.level);
    else if (lv.levelTest) emit('openSheet', lv.levelTest.id);
    else emit('createLevelTest', lv.level);
}

const nextLevel = () => (props.levels.at(-1)?.level ?? 0) + 1;
</script>

<template>
    <div class="levels">
        <p class="levels__intro">
            Cada nivel tiene práctica, una prueba para avanzar y, si querés, un cuaderno. El alumno
            ve actividad cuando hay algo asignado al nivel.
        </p>

        <section v-for="lv in levels" :key="lv.level" class="level-card">
            <div class="level-card__head">
                <span class="level-card__num">{{ lv.level }}</span>
                <div class="level-card__text">
                    <h3>{{ levelTitle(lv) }}</h3>
                    <p>{{ levelMeta(lv) }}</p>
                </div>
                <div class="level-card__add">
                    <button
                        type="button"
                        class="level-add-btn"
                        aria-haspopup="menu"
                        :aria-expanded="addMenuLevel === lv.level"
                        @click="toggleAddMenu(lv.level)"
                    >
                        <i class="pi pi-plus" aria-hidden="true"></i> Agregar
                    </button>
                    <template v-if="addMenuLevel === lv.level">
                        <div class="level-add-backdrop" @click="addMenuLevel = null"></div>
                        <div class="level-add-menu" role="menu">
                            <button type="button" role="menuitem" @click="add('practice', lv)">
                                <i class="pi pi-copy" aria-hidden="true"></i> Hoja de práctica
                            </button>
                            <button type="button" role="menuitem" @click="add('test', lv)">
                                <i class="pi pi-verified" aria-hidden="true"></i>
                                {{ lv.levelTest ? 'Editar prueba de nivel' : 'Prueba de nivel' }}
                            </button>
                            <button type="button" role="menuitem" @click="add('notebook', lv)">
                                <i class="pi pi-book" aria-hidden="true"></i> Cuaderno
                            </button>
                        </div>
                    </template>
                </div>
            </div>

            <div
                v-if="lv.practices.length || lv.levelTest || lv.notebooks.length"
                class="level-acts"
            >
                <button
                    v-for="sheet in lv.practices"
                    :key="sheet.id"
                    type="button"
                    class="level-act"
                    @click="emit('openSheet', sheet.id)"
                >
                    <i class="pi pi-copy" aria-hidden="true"></i>
                    <span>
                        <strong>{{ sheet.title || 'Hoja de práctica' }}</strong>
                        <small>{{
                            plural(countItems(sheet.exercises), 'ejercicio', 'ejercicios')
                        }}</small>
                    </span>
                </button>
                <button
                    v-if="lv.levelTest"
                    type="button"
                    class="level-act"
                    @click="emit('openSheet', lv.levelTest.id)"
                >
                    <i class="pi pi-verified" aria-hidden="true"></i>
                    <span>
                        <strong>Prueba de nivel</strong>
                        <small>{{
                            plural(countItems(lv.levelTest.exercises), 'pregunta', 'preguntas')
                        }}</small>
                    </span>
                </button>
                <div v-for="nb in lv.notebooks" :key="nb.id" class="level-act level-act--group">
                    <button
                        type="button"
                        class="level-act__main"
                        @click="emit('openNotebook', nb.id)"
                    >
                        <i class="pi pi-book" aria-hidden="true"></i>
                        <span>
                            <strong>{{ nb.title || 'Cuaderno' }}</strong>
                            <small>{{ plural(countItems(nb.pages), 'página', 'páginas') }}</small>
                        </span>
                    </button>
                    <button
                        type="button"
                        class="level-act__icon"
                        title="Editar cuaderno"
                        aria-label="Editar cuaderno"
                        @click="emit('editNotebook', nb)"
                    >
                        <i class="pi pi-pencil" aria-hidden="true"></i>
                    </button>
                    <button
                        type="button"
                        class="level-act__icon level-act__icon--danger"
                        title="Eliminar cuaderno"
                        aria-label="Eliminar cuaderno"
                        @click="emit('deleteNotebook', nb.id)"
                    >
                        <i class="pi pi-trash" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        </section>

        <button type="button" class="level-create" @click="emit('createNextLevel')">
            <i class="pi pi-plus" aria-hidden="true"></i> Crear nivel {{ nextLevel() }}
        </button>
    </div>
</template>

<style scoped>
.levels {
    display: grid;
    gap: 12px;
}
.levels__intro {
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
    color: var(--ink-muted);
}
.level-card {
    display: grid;
    gap: 10px;
    padding: 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
}
.level-card__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
}
.level-card__num {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border-radius: 10px;
    background: var(--deep-800);
    color: var(--on-brand);
    font: 900 15px/1 var(--font-ui);
}
.level-card__text {
    flex: 1;
    min-width: 160px;
}
.level-card__text h3 {
    margin: 0;
    font: 900 16px/1.3 var(--font-ui);
    letter-spacing: -0.02em;
    color: var(--ink);
}
.level-card__text p {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--ink-muted);
}
.level-card__add {
    position: relative;
}
.level-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface);
    color: var(--brand-700);
    font: 900 12.5px/1 var(--font-ui);
    cursor: pointer;
}
.level-add-btn i {
    font-size: 11px;
}
.level-add-btn:hover {
    background: var(--surface-sunken);
}
.level-add-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9;
}
.level-add-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 10;
    display: grid;
    min-width: 220px;
    padding: 6px;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
    box-shadow: var(--shadow-card-lg);
}
.level-add-menu button {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 40px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--ink);
    font: 600 13px/1 var(--font-body);
    text-align: left;
    cursor: pointer;
}
.level-add-menu button:hover {
    background: var(--surface-sunken);
}
.level-add-menu i {
    font-size: 13px;
    color: var(--brand-700);
}
.level-acts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
    gap: 8px;
}
.level-act {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--canvas);
    text-align: left;
    font-family: var(--font-body);
    cursor: pointer;
}
.level-act:hover {
    border-color: var(--brand-200);
    background: var(--surface-sunken);
}
.level-act i {
    font-size: 14px;
    color: var(--brand-700);
}
.level-act span {
    flex: 1;
    min-width: 0;
}
.level-act strong {
    display: block;
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    text-overflow: ellipsis;
    white-space: nowrap;
}
.level-act small {
    display: block;
    font-size: 11.5px;
    color: var(--ink-muted);
}
.level-act--group {
    padding: 0;
    gap: 0;
}
.level-act__main {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 10px 4px 10px 12px;
    border: 0;
    background: transparent;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
}
.level-act__icon {
    display: grid;
    place-items: center;
    width: 32px;
    align-self: stretch;
    flex: 0 0 32px;
    border: 0;
    background: transparent;
    color: var(--ink-muted);
    cursor: pointer;
}
.level-act__icon:last-child {
    margin-right: 6px;
}
.level-act__icon i {
    font-size: 12.5px;
    color: inherit;
}
.level-act__icon:hover {
    color: var(--brand-700);
}
.level-act__icon--danger:hover {
    color: var(--danger);
}
.level-create {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 52px;
    border: 1px dashed var(--brand-200);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--brand-700);
    font: 900 14px/1 var(--font-ui);
    cursor: pointer;
}
.level-create i {
    font-size: 12px;
}
.level-create:hover {
    background: var(--surface-sunken);
}
@media (max-width: 600px) {
    .level-add-menu {
        right: auto;
        left: 0;
    }
}
</style>
