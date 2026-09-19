<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from "vue";
  import type { CourseLevelsResponse, LevelSheetSummary } from "@/types";
  import type {
    StudentLevelsListEmits,
    StudentLevelsListProps,
  } from "./StudentLevelsList.types";

  type LevelData = CourseLevelsResponse["levels"][number];
  type LevelNotebook = LevelData["notebooks"][number];

  interface PathNode {
    key: string;
    kind: "topic" | "practice" | "notebook" | "test";
    title: string;
    meta?: string;
    tone: number;
    offset: number;
    start?: boolean;
    id?: string;
    sheet?: LevelSheetSummary;
  }

  const props = defineProps<StudentLevelsListProps>();
  const emit = defineEmits<StudentLevelsListEmits>();
  const now = ref(Date.now());
  let clockTimer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    clockTimer = setInterval(() => {
      now.value = Date.now();
    }, 30_000);
  });

  onUnmounted(() => {
    if (clockTimer) clearInterval(clockTimer);
  });

  // The server rejects an out-of-window attempt too; this only keeps the UI
  // honest. Mirrors sheetWindowState on the backend.
  const isScheduled = (sheet?: LevelSheetSummary | null) =>
    !!sheet?.scheduled_at && new Date(sheet.scheduled_at).getTime() > now.value;

  const isExpired = (sheet?: LevelSheetSummary | null) =>
    !!sheet?.available_until && new Date(sheet.available_until).getTime() < now.value;

  const isClosed = (sheet?: LevelSheetSummary | null) =>
    isScheduled(sheet) || isExpired(sheet) || !!sheet?.submitted;

  const levelTestState = (sheet?: LevelSheetSummary | null) =>
    sheet?.submitted
      ? sheet.pending_review
        ? "pending"
        : "submitted"
      : isExpired(sheet)
        ? "expired"
        : isScheduled(sheet)
          ? "scheduled"
          : "available";

  const formatSchedule = (value: string) =>
    new Date(value).toLocaleString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

  const TONES = 6;

  // A topic keeps one colour for the whole course, so the student recognises
  // "Simplificación" by its colour on level 1 and on level 4. Assigned by first
  // appearance rather than by topic_order: order is per course and would give
  // two different topics the same tone whenever a level skips one.
  const toneByTopic = computed(() => {
    const tones = new Map<string, number>();
    for (const level of props.data.levels) {
      const tagged = [
        ...(level.practices ?? []),
        ...(level.notebooks ?? []),
      ].filter((item) => item.topic_id);
      for (const item of tagged) {
        if (!tones.has(item.topic_id!)) {
          tones.set(item.topic_id!, (tones.size % TONES) + 1);
        }
      }
    }
    return tones;
  });

  const toneFor = (topicId: string) => toneByTopic.value.get(topicId) ?? 0;

  // Older sheets can predate `topic_id`. Keep them visible in a neutral group
  // while every current practice is unmistakably under its topic.
  const practicesByTopic = (practices: LevelSheetSummary[] = []) => {
    const groups = new Map<string, { id: string; title: string; order: number; sheets: LevelSheetSummary[] }>();
    for (const sheet of practices) {
      const key = sheet.topic_id || "untagged";
      const group = groups.get(key) ?? {
        id: key,
        title: sheet.topic_title || "Prácticas generales",
        order: sheet.topic_title ? (sheet.topic_order ?? 0) : Number.MAX_SAFE_INTEGER,
        sheets: [],
      };
      group.sheets.push(sheet);
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  };

  const notebooksByTopic = (notebooks: LevelNotebook[] = []) => {
    const groups = new Map<string, { id: string; title: string; order: number; notebooks: LevelNotebook[] }>();
    for (const notebook of notebooks) {
      const key = notebook.topic_id || "untagged";
      const group = groups.get(key) ?? {
        id: key,
        title: notebook.topic_title || "Cuadernos generales",
        order: notebook.topic_title ? (notebook.topic_order ?? 0) : Number.MAX_SAFE_INTEGER,
        notebooks: [],
      };
      group.notebooks.push(notebook);
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  };

  // Sideways offsets in px. The path reads as a route rather than a list
  // because consecutive stops do not share a vertical axis. It alternates sides
  // every other stop: a level with three practices would otherwise only ever
  // use the opening of a longer wave and drift to one side.
  const WAVE = [0, 44, 0, -44];

  const pathNodes = (level: LevelData): PathNode[] => {
    const nodes: PathNode[] = [];
    let step = 0;
    const offset = () => WAVE[step++ % WAVE.length];

    for (const group of practicesByTopic(level.practices)) {
      const tone = toneFor(group.id);
      nodes.push({ key: `topic-p-${group.id}`, kind: "topic", title: group.title, tone, offset: 0 });
      for (const sheet of group.sheets) {
        nodes.push({
          key: sheet.id,
          kind: "practice",
          id: sheet.id,
          title: sheet.title,
          meta: `${sheet.exercises} ejercicios`,
          tone,
          offset: offset(),
        });
      }
    }

    for (const group of notebooksByTopic(level.notebooks)) {
      const tone = toneFor(group.id);
      nodes.push({ key: `topic-n-${group.id}`, kind: "topic", title: group.title, tone, offset: 0 });
      for (const notebook of group.notebooks) {
        nodes.push({
          key: notebook.id,
          kind: "notebook",
          id: notebook.id,
          title: notebook.title,
          meta: `${notebook.pages} páginas`,
          tone,
          offset: offset(),
        });
      }
    }

    if (level.level_test) {
      nodes.push({
        key: `test-${level.level_test.id}`,
        kind: "test",
        title: level.level_test.title,
        tone: 0,
        offset: 0,
        sheet: level.level_test,
      });
    }

    // The path cannot know which practices are done — nothing gates on them, so
    // the backend never computes it. "Empezar" therefore marks the entrance to
    // the level the student is on, which is what the old "Aquí estás" said.
    if (level.level === props.data.current_level) {
      const first = nodes.find((node) => node.kind !== "topic");
      if (first) first.start = true;
    }

    return nodes;
  };

  const levelState = (level: LevelData) =>
    !level.unlocked
      ? "locked"
      : level.level === props.data.current_level
        ? "current"
        : "done";
</script>

<template>
  <div class="levels-path">
    <section
      v-for="level in data.levels"
      :key="level.level"
      class="unit"
      :class="`unit--${levelState(level)}`"
    >
      <header class="unit-banner">
        <div class="unit-banner-text">
          <span class="unit-kicker">Nivel {{ level.level }}</span>
          <span class="unit-state">
            <template v-if="!level.unlocked">Bloqueado</template>
            <template v-else-if="level.level === data.current_level">Estás acá</template>
            <template v-else>Completado</template>
          </span>
        </div>
        <i
          class="pi unit-banner-icon"
          :class="
            !level.unlocked
              ? 'pi-lock'
              : level.level === data.current_level
                ? 'pi-map-marker'
                : 'pi-check-circle'
          "
        ></i>
      </header>

      <div v-if="level.unlocked" class="unit-path">
        <template v-for="node in pathNodes(level)" :key="node.key">
          <div
            v-if="node.kind === 'topic'"
            class="path-topic"
            :class="`tone-${node.tone}`"
          >
            <span>{{ node.title }}</span>
          </div>

          <div
            v-else-if="node.kind === 'test'"
            class="path-slot"
            :class="`test-slot--${levelTestState(node.sheet)}`"
          >
            <span v-if="node.start" class="path-bubble">Empezar</span>
            <button
              class="path-node path-node--test"
              :class="`path-node--test-${levelTestState(node.sheet)}`"
              :disabled="isClosed(node.sheet)"
              @click="emit('openLevelTest', node.sheet!)"
            >
              <i
                class="pi"
                :class="{
                  'pi-trophy': levelTestState(node.sheet) === 'available',
                  'pi-clock': levelTestState(node.sheet) === 'pending',
                  'pi-check': levelTestState(node.sheet) === 'submitted',
                  'pi-ban': levelTestState(node.sheet) === 'expired',
                  'pi-lock': levelTestState(node.sheet) === 'scheduled',
                }"
              ></i>
            </button>
            <span class="path-label path-label--test">{{ node.title }}</span>
            <span class="path-meta">
              <template v-if="node.sheet!.submitted">
                {{ node.sheet!.pending_review ? "En revisión" : "Prueba realizada" }}
                <template v-if="node.sheet!.score !== undefined">
                  · {{ node.sheet!.score }}%
                </template>
              </template>
              <template v-else-if="isExpired(node.sheet)">Plazo vencido</template>
              <template v-else-if="isScheduled(node.sheet)">
                {{ formatSchedule(node.sheet!.scheduled_at!) }}
              </template>
              <template v-else>
                {{ node.sheet!.exercises }} preguntas · 75% para avanzar
              </template>
            </span>
          </div>

          <div
            v-else
            class="path-slot"
            :style="{ transform: `translateX(${node.offset}px)` }"
          >
            <span v-if="node.start" class="path-bubble">Empezar</span>
            <button
              class="path-node"
              :class="[`tone-${node.tone}`, `path-node--${node.kind}`]"
              @click="
                node.kind === 'practice'
                  ? emit('openPractice', node.id!)
                  : emit('openNotebook', node.id!)
              "
            >
              <i
                class="pi"
                :class="node.kind === 'practice' ? 'pi-pencil' : 'pi-book'"
              ></i>
            </button>
            <span class="path-label">{{ node.title }}</span>
            <span class="path-meta">{{ node.meta }}</span>
          </div>
        </template>
      </div>

      <p v-else class="unit-locked">
        <i class="pi pi-lock"></i>
        Completá el nivel {{ level.level - 1 }} para desbloquear
      </p>
    </section>
  </div>
</template>

<style scoped>
  .levels-path {
    --tone-0: var(--practiq-violet);
    --tone-1: #7c3aed;
    --tone-2: #0ea5e9;
    --tone-3: #10b981;
    --tone-4: #f59e0b;
    --tone-5: #ec4899;
    --tone-6: #6366f1;
    display: grid;
    gap: 22px;
  }
  .unit {
    display: grid;
    gap: 18px;
  }
  .unit-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px;
    border-radius: var(--radius-2xl);
    background: var(--practiq-violet);
    color: #fff;
    box-shadow: var(--elevation-tint-shadow);
  }
  .unit--done .unit-banner {
    background: var(--color-success-dark);
  }
  .unit--locked .unit-banner {
    background: var(--surface-hover);
    color: var(--text-secondary);
    box-shadow: none;
  }
  .unit-banner-text {
    display: grid;
    gap: 2px;
  }
  .unit-kicker {
    font-size: var(--text-lg);
    font-weight: 900;
  }
  .unit-state {
    font-size: var(--text-xs);
    font-weight: 800;
    text-transform: uppercase;
    opacity: 0.85;
  }
  .unit-banner-icon {
    font-size: 1.35rem;
  }
  .unit-path {
    display: grid;
    justify-items: center;
    gap: 20px;
    padding: 4px 0 8px;
  }
  .path-topic {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    color: var(--tone);
    font-size: var(--text-xs);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .path-topic::before,
  .path-topic::after {
    content: "";
    flex: 1;
    height: 2px;
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--tone) 28%, transparent);
  }
  .path-slot {
    display: grid;
    justify-items: center;
    gap: 6px;
    max-width: 190px;
  }
  .path-bubble {
    padding: 5px 12px;
    border-radius: var(--radius-pill);
    background: var(--surface-card);
    box-shadow: var(--elevation-tint-shadow);
    color: var(--practiq-violet);
    font-size: var(--text-xs);
    font-weight: 900;
    text-transform: uppercase;
    animation: bubble-nudge 1.6s ease-in-out infinite;
  }
  @keyframes bubble-nudge {
    50% {
      transform: translateY(-4px);
    }
  }
  /* The raised edge is what makes a circle read as pressable. It sits under the
     node, so the press animation moves the node down onto it. */
  .path-node {
    width: 66px;
    height: 66px;
    border: none;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--tone);
    color: #fff;
    font-size: 1.5rem;
    cursor: pointer;
    box-shadow: 0 5px 0 color-mix(in srgb, var(--tone) 62%, #000);
    transition: var(--transition-fast);
  }
  .path-node:hover {
    filter: brightness(1.06);
  }
  .path-node:active {
    transform: translateY(4px);
    box-shadow: 0 1px 0 color-mix(in srgb, var(--tone) 62%, #000);
  }
  .path-node--test {
    width: 78px;
    height: 78px;
    font-size: 1.8rem;
    background: var(--tone-4);
    box-shadow: 0 6px 0 color-mix(in srgb, var(--tone-4) 62%, #000);
  }
  .test-slot--available .path-node--test {
    animation: test-ready 2.4s ease-in-out infinite;
  }
  @keyframes test-ready {
    50% {
      box-shadow:
        0 6px 0 color-mix(in srgb, var(--tone-4) 62%, #000),
        0 0 0 10px rgba(var(--color-warning-rgb), 0.22);
    }
  }
  .path-node--test-submitted {
    background: var(--color-success-dark);
    box-shadow: 0 6px 0 color-mix(in srgb, var(--color-success-dark) 62%, #000);
  }
  .path-node--test-pending,
  .path-node--test-expired,
  .path-node--test-scheduled {
    background: var(--text-secondary);
    box-shadow: 0 6px 0 color-mix(in srgb, var(--text-secondary) 62%, #000);
  }
  .path-node:disabled {
    cursor: not-allowed;
  }
  .path-node:disabled:hover {
    filter: none;
  }
  .path-node:disabled:active {
    transform: none;
  }
  .path-label {
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-weight: 800;
    text-align: center;
    line-height: 1.25;
  }
  .path-label--test {
    color: var(--color-warning-dark);
  }
  .path-meta {
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: 700;
    text-align: center;
  }
  .unit-locked {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }
  .tone-0 {
    --tone: var(--tone-0);
  }
  .tone-1 {
    --tone: var(--tone-1);
  }
  .tone-2 {
    --tone: var(--tone-2);
  }
  .tone-3 {
    --tone: var(--tone-3);
  }
  .tone-4 {
    --tone: var(--tone-4);
  }
  .tone-5 {
    --tone: var(--tone-5);
  }
  .tone-6 {
    --tone: var(--tone-6);
  }
  @media (max-width: 420px) {
    .path-slot {
      max-width: 150px;
    }
    .path-node {
      width: 60px;
      height: 60px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .path-bubble,
    .test-slot--available .path-node--test {
      animation: none;
    }
  }
</style>
