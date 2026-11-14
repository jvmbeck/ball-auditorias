<template>
  <q-page class="flex flex-center">
    <div class="text-center q-pa-md">
      <q-icon name="sym_o_lock" size="64px" color="negative" />

      <h5>Access unavailable</h5>

      <p>Your account does not have a valid access profile. Please contact an administrator.</p>

      <q-btn color="primary" label="Sign out" @click="handleLogout" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useAuthStore } from 'src/stores/auth.store';

const authStore = useAuthStore();

async function handleLogout() {
  await authStore.logoutUser();
}
</script>
