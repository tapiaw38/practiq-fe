<script setup lang="ts">
  import { onMounted, ref } from "vue";
  import StudentLayout from "@/layouts/StudentLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import UserAvatar from "@/components/ui/UserAvatar.vue";
  import { practiqApi } from "@/api/request/server";
  import { ProfileService } from "@/services/profile/profileService";
  import { useAuthStore } from "@/stores/authStore";
  import { randomSeeds } from "@/utils/avatar";
  import type { UserProfile } from "@/types";

  const OPTIONS = 12;

  const service = new ProfileService(practiqApi);
  const authStore = useAuthStore();
  const profile = ref<UserProfile | null>(null);
  const loading = ref(true);
  const loadError = ref(false);
  const saving = ref(false);
  const saveError = ref(false);
  const saved = ref(false);
  const options = ref<string[]>([]);
  const picked = ref("");

  /** Keeps the current avatar in the grid so it is never the odd one out. */
  function shuffle(keep = picked.value) {
    const fresh = randomSeeds(OPTIONS);
    options.value = keep ? [keep, ...fresh.slice(0, OPTIONS - 1)] : fresh;
  }

  async function save(seed: string) {
    picked.value = seed;
    saving.value = true;
    saveError.value = false;
    saved.value = false;
    try {
      const { data } = await service.updateAvatar({ avatar_seed: seed });
      profile.value = data;
      // The layout reads the avatar from the store, so refresh it here or the
      // header keeps the old one until the next full load.
      authStore.setProfile(data);
      saved.value = true;
    } catch {
      // Put the grid back on whatever the server still holds, so the picture
      // on screen never disagrees with the one that was stored.
      picked.value = profile.value?.avatar_seed || "";
      saveError.value = true;
    } finally {
      saving.value = false;
    }
  }

  onMounted(async () => {
    try {
      const { data } = await service.get();
      profile.value = data;
      picked.value = data.avatar_seed || "";
      shuffle();
    } catch {
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  });
</script>

<template>
  <StudentLayout>
    <div class="profile-shell">
      <header class="profile-header">
        <template v-if="loading">
          <Skeleton width="72px" height="72px" />
          <Skeleton width="160px" height="22px" />
        </template>
        <template v-else-if="profile">
          <UserAvatar :seed="picked" :size="72" :label="profile.name" />
          <div>
            <h1>{{ profile.name }}</h1>
            <p>{{ profile.email }}</p>
          </div>
        </template>
      </header>

      <div v-if="loadError" class="profile-empty">
        <i class="pi pi-exclamation-circle"></i>
        No pudimos cargar tu perfil. Probá de nuevo en un momento.
      </div>

      <section v-else-if="!loading" class="profile-card">
        <div class="profile-card__top">
          <h2>Elegí tu avatar</h2>
          <button type="button" class="shuffle-btn" :disabled="saving" @click="shuffle()">
            <i class="pi pi-refresh"></i> Mezclar
          </button>
        </div>

        <div class="avatar-grid" role="radiogroup" aria-label="Opciones de avatar">
          <button
            v-for="seed in options"
            :key="seed"
            type="button"
            role="radio"
            class="avatar-option"
            :class="{ 'avatar-option--picked': picked === seed }"
            :aria-checked="picked === seed"
            :aria-label="`Avatar ${seed}`"
            :disabled="saving"
            @click="save(seed)"
          >
            <UserAvatar :seed="seed" :size="64" />
          </button>
        </div>

        <p v-if="saving" class="profile-note">Guardando…</p>
        <p v-else-if="saveError" class="profile-note profile-note--error">
          No pudimos guardar el avatar. Probá de nuevo.
        </p>
        <p v-else-if="saved" class="profile-note profile-note--ok">
          <i class="pi pi-check-circle"></i> Avatar guardado.
        </p>
      </section>
    </div>
  </StudentLayout>
</template>

<style scoped>
  .profile-shell { max-width: 900px; margin: 0 auto; padding: 24px 20px 72px; display: grid; gap: 18px; }
  .profile-header { display:flex; align-items:center; gap:16px; padding:22px 26px; border:1px solid rgba(var(--practiq-violet-rgb),.12); border-radius:var(--radius-2xl); background:var(--elevation-tint-bg); box-shadow:var(--shadow-card); }
  h1, h2, p { margin:0; }
  h1 { color:var(--text-heading); font-size:1.4rem; line-height:1.2; }
  h2 { color:var(--text-heading); font-size:17px; }
  .profile-header p { margin-top:4px; color:var(--text-secondary); font-size:var(--text-sm); overflow-wrap:anywhere; }
  .profile-card { padding:24px; border-radius:var(--radius-2xl); background:var(--elevation-tint-bg); border:1px solid var(--surface-glass-border); box-shadow:var(--shadow-card); display:grid; gap:16px; }
  .profile-card__top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .shuffle-btn { display:inline-flex; align-items:center; gap:7px; padding:8px 14px; border:1px solid var(--surface-glass-border); border-radius:var(--radius-pill); background:var(--surface-card); color:var(--practiq-violet-dark); font:inherit; font-size:var(--text-sm); font-weight:700; cursor:pointer; transition:var(--transition-fast); }
  .shuffle-btn:hover:not(:disabled) { border-color:var(--practiq-violet); }
  .shuffle-btn:disabled { opacity:.55; cursor:default; }
  .avatar-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(84px, 1fr)); gap:10px; }
  .avatar-option { display:grid; place-items:center; padding:8px; border:2px solid transparent; border-radius:var(--radius-xl); background:var(--surface-subtle); cursor:pointer; transition:var(--transition-fast); }
  .avatar-option:hover:not(:disabled) { background:var(--fill-primary-soft); }
  .avatar-option--picked { border-color:var(--practiq-violet); background:var(--fill-primary-soft); }
  .avatar-option:disabled { cursor:default; }
  .profile-note { color:var(--text-muted); font-size:var(--text-sm); display:flex; align-items:center; gap:7px; }
  .profile-note--ok { color:var(--color-success); }
  .profile-note--error { color:var(--color-error); }
  .profile-empty { min-height:160px; display:grid; place-items:center; align-content:center; gap:10px; padding:24px; text-align:center; border-radius:var(--radius-2xl); background:var(--elevation-tint-bg); color:var(--text-secondary); box-shadow:var(--elevation-tint-shadow); }
  .profile-empty i { color:var(--practiq-violet); font-size:1.5rem; }

  @media (max-width: 600px) {
    .profile-shell { padding:16px 12px 92px; gap:14px; }
    .profile-header { padding:18px; }
    .profile-card { padding:20px; }
    .avatar-grid { grid-template-columns:repeat(auto-fill, minmax(72px, 1fr)); }
  }
</style>
