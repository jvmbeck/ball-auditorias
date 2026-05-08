<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>
          <q-btn
            flat
            no-caps
            dense
            to="/"
            class="title-btn q-mt-md"
            aria-label="Ir para a página inicial"
          >
            Ball Auditorias
          </q-btn>
        </q-toolbar-title>

        <user-avatar v-if="authstore.profile" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import UserAvatar from 'src/components/UserAvatar.vue';
import { useAuthStore } from 'src/stores/auth.store';

const authstore = useAuthStore();
</script>

<style scoped>
.title-btn {
  color: inherit;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  border-radius: 10px;
  padding: 4px 10px;
  transition:
    background-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.title-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  transform: translateY(-1px);
}

.title-btn:focus-visible {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.45);
}
</style>
