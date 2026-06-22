<script setup lang="ts">
  import { ref, watch, onMounted } from "vue";
  import type {
    DrawingCanvasProps,
    DrawingCanvasEmits,
  } from "./DrawingCanvas.types";

  const props = withDefaults(defineProps<DrawingCanvasProps>(), {
    modelValue: "",
    height: 240,
    tool: "pen",
    penSize: 3,
    penColor: "#1e293b",
  });

  const emit = defineEmits<DrawingCanvasEmits>();

  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const undoStack = ref<ImageData[]>([]);
  const isDrawing = ref(false);
  const lastPos = ref({ x: 0, y: 0 });

  function initCanvas() {
    const canvas = canvasRef.value;
    if (!canvas) return;

    requestAnimationFrame(() => {
      const w = canvas.offsetWidth || 600;
      const h = canvas.offsetHeight || props.height;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, w, h);
      undoStack.value = [];

      // Load existing image if any
      if (props.modelValue && props.modelValue.startsWith("data:image/")) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, w, h);
        img.src = props.modelValue;
      }
    });
  }

  function getPos(e: MouseEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function startDrawing(e: MouseEvent) {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    undoStack.value.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    isDrawing.value = true;
    const pos = getPos(e, canvas);
    lastPos.value = pos;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: MouseEvent) {
    if (!isDrawing.value) return;
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.globalCompositeOperation =
      props.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = props.penColor;
    ctx.lineWidth = props.tool === "eraser" ? props.penSize * 4 : props.penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(lastPos.value.x, lastPos.value.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.value = pos;
  }

  function stopDrawing() {
    if (!isDrawing.value) return;
    isDrawing.value = false;
    const canvas = canvasRef.value;
    if (!canvas) return;
    canvas.getContext("2d")!.beginPath();
    emit("update:modelValue", canvas.toDataURL("image/png"));
  }

  function startDrawingTouch(e: TouchEvent) {
    e.preventDefault();
    const t = e.touches[0];
    startDrawing({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
  }

  function drawTouch(e: TouchEvent) {
    e.preventDefault();
    const t = e.touches[0];
    draw({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
  }

  function stopDrawingTouch() {
    stopDrawing();
  }

  function undo() {
    const canvas = canvasRef.value;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas || undoStack.value.length === 0) return;
    ctx.putImageData(undoStack.value.pop()!, 0, 0);
    emit("update:modelValue", canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    undoStack.value = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    emit("update:modelValue", "");
  }

  watch(
    () => props.modelValue,
    (newVal, oldVal) => {
      const canvas = canvasRef.value;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;

      if (!newVal) {
        // Clear canvas if modelValue is empty
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        undoStack.value = [];
      } else if (newVal !== oldVal && newVal.startsWith("data:image/")) {
        // Load new image when modelValue changes
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          undoStack.value = [];
        };
        img.src = newVal;
      }
    },
  );

  onMounted(() => {
    initCanvas();
  });

  defineExpose({
    undo,
    clear,
  });
</script>

<template>
  <canvas
    ref="canvasRef"
    class="drawing-canvas"
    :style="{ height: `${height}px` }"
    @mousedown="startDrawing"
    @mousemove="draw"
    @mouseup="stopDrawing"
    @mouseleave="stopDrawing"
    @touchstart="startDrawingTouch"
    @touchmove="drawTouch"
    @touchend="stopDrawingTouch"
  ></canvas>
</template>

<style scoped>
  .drawing-canvas {
    width: 100%;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    display: block;
    touch-action: none;
    cursor: crosshair;
    box-shadow: var(--shadow-card);
    background-color: var(--surface-bg-soft);
    background-image:
      linear-gradient(
        90deg,
        transparent 56px,
        rgba(var(--color-error-rgb), 0.25) 56px,
        rgba(var(--color-error-rgb), 0.25) 57.5px,
        transparent 57.5px
      ),
      repeating-linear-gradient(
        transparent,
        transparent 31px,
        rgba(var(--practiq-violet-rgb), 0.1) 31px,
        rgba(var(--practiq-violet-rgb), 0.1) 32px
      );
    background-repeat: no-repeat, repeat;
  }
</style>
