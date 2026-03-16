<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title> Quasar App </q-toolbar-title>

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
