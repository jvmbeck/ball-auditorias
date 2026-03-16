<template>
  <div class="avatar-section">
    <q-btn round color="white" class="q-ml-md q-mt-md" dense>
      <q-avatar size="60px" color="primary">
        <div class="full-center avatar-initials">
          {{
            (authStore.profile?.name || '')
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
          }}
        </div>
      </q-avatar>

      <q-menu>
        <q-card class="q-pt-md" style="min-width: 220px">
          <div class="q-pl-md row items-center q-mb-md">
            <div class="q-ml-md">
              <div class="text-subtitle1">{{ authStore.profile?.name }}</div>
            </div>
          </div>
          <q-separator />
          <q-list>
            <q-item clickable v-close-popup disabled>
              <q-item-section avatar>
                <q-icon name="settings" />
              </q-item-section>
              <q-item-section>Configurações</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="logout">
              <q-item-section avatar>
                <q-icon name="logout" />
              </q-item-section>
              <q-item-section>Sair</q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </q-menu>
    </q-btn>
    <div>
      <div class="avatar-title text-h6">{{ authStore.profile?.name }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from 'src/stores/auth.store';
const authStore = useAuthStore();

async function logout() {
  try {
    await authStore.logoutUser();
    window.location.reload();
  } catch (error) {
    console.error(error);
  }
}
</script>

<style scoped>
.avatar-section {
  display: flex;
  align-items: baseline;
  justify-content: space-evenly;
  padding: 16px;
}

.avatar-title {
  margin-top: 8px;
  font-weight: bold;
  text-align: center;
}
</style>
