<template>
  <component :is="wrapper ? 'div' : 'span'" :class="wrapperClasses" :style="wrapperStyle">
    <!-- Single skeleton element -->
    <div
      v-if="!rows && !grid"
      class="skeleton"
      :class="skeletonClasses"
      :style="skeletonStyle"
    ></div>

    <!-- Multiple rows -->
    <template v-else-if="rows">
      <div
        v-for="i in rows"
        :key="i"
        class="skeleton"
        :class="skeletonClasses"
        :style="{ ...skeletonStyle, width: randomWidth(i) }"
      ></div>
    </template>

    <!-- Grid layout -->
    <template v-else-if="grid">
      <div
        v-for="i in grid"
        :key="i"
        class="skeleton skeleton--card"
        :style="{ height: gridHeight }"
      >
        <slot :index="i"></slot>
      </div>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  // Dimensions
  width?: string
  height?: string
  size?: string // shorthand for width=height (squares/circles)

  // Shape variants
  variant?: 'text' | 'rect' | 'circle' | 'card' | 'avatar' | 'button' | 'badge'
  rounded?: boolean | string // true = full, or specific radius

  // Layout
  rows?: number // multiple lines
  rowGap?: string
  grid?: number // grid of cards
  gridCols?: string
  gridHeight?: string

  // Animation
  animate?: boolean

  // Wrapper
  wrapper?: boolean
  wrapperClass?: string
  flex?: boolean
  gap?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: undefined,
  height: undefined,
  size: undefined,
  variant: 'rect',
  rounded: false,
  rows: undefined,
  rowGap: '8px',
  grid: undefined,
  gridCols: 'repeat(auto-fill, minmax(200px, 1fr))',
  gridHeight: '120px',
  animate: true,
  wrapper: false,
  wrapperClass: '',
  flex: false,
  gap: '12px'
})

const skeletonClasses = computed(() => [
  `skeleton--${props.variant}`,
  {
    'skeleton--circle': props.variant === 'circle' || props.variant === 'avatar',
    'skeleton--rounded': props.rounded === true,
    'skeleton--no-animate': !props.animate
  }
])

const skeletonStyle = computed(() => {
  const style: Record<string, string> = {}

  if (props.size) {
    style.width = props.size
    style.height = props.size
  } else {
    if (props.width) style.width = props.width
    style.height = props.height || defaultHeight(props.variant)
  }

  if (typeof props.rounded === 'string') {
    style.borderRadius = props.rounded
  }

  return style
})

const wrapperClasses = computed(() => [
  'skeleton-wrapper',
  props.wrapperClass,
  {
    'skeleton-wrapper--flex': props.flex,
    'skeleton-wrapper--grid': !!props.grid,
    'skeleton-wrapper--rows': !!props.rows
  }
])

const wrapperStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.flex || props.rows) style.gap = props.gap || props.rowGap
  if (props.grid) {
    style.display = 'grid'
    style.gridTemplateColumns = props.gridCols
    style.gap = props.gap
  }
  return style
})

function defaultHeight(variant: string): string {
  switch (variant) {
    case 'text': return '1em'
    case 'avatar': return '40px'
    case 'circle': return '40px'
    case 'card': return '120px'
    case 'button': return '38px'
    case 'badge': return '24px'
    default: return '20px'
  }
}

function randomWidth(index: number): string {
  if (props.width) return props.width
  // Vary width for text rows to look natural
  const widths = ['100%', '92%', '85%', '78%', '95%', '88%']
  return widths[(index - 1) % widths.length]
}
</script>

<style scoped>
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(var(--surface-border-rgb, 200, 200, 200), 0.12) 0%,
    rgba(var(--surface-border-rgb, 200, 200, 200), 0.24) 50%,
    rgba(var(--surface-border-rgb, 200, 200, 200), 0.12) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm, 4px);
}

.skeleton--text {
  border-radius: var(--radius-xs, 2px);
  height: 1em;
}

.skeleton--card {
  border-radius: var(--radius-xl, 16px);
  min-height: 80px;
}

.skeleton--avatar,
.skeleton--circle {
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton--button {
  border-radius: var(--radius-md, 8px);
  width: 100px;
}

.skeleton--badge {
  border-radius: var(--radius-pill, 999px);
  width: 60px;
}

.skeleton--rounded {
  border-radius: var(--radius-pill, 999px);
}

.skeleton--no-animate {
  animation: none;
}

/* Wrapper styles */
.skeleton-wrapper--flex {
  display: flex;
  align-items: center;
}

.skeleton-wrapper--rows {
  display: flex;
  flex-direction: column;
}

.skeleton-wrapper--grid {
  display: grid;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
