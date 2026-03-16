<template>
  <q-page class="flex flex-center">
    <q-card style="width: 350px">
      <q-card-section>
        <div class="text-h6">Login</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="handleLogin">
          <q-input
            v-model="email"
            label="Email"
            type="email"
            outlined
            lazy-rules
            :rules="[(val) => !!val || 'Email is required']"
          />

          <q-input
            v-model="password"
            label="Password"
            type="password"
            outlined
            class="q-mt-md"
            :rules="[(val) => !!val || 'Password is required']"
          />

          <div v-if="errorMessage" class="text-negative q-mt-md">
            {{ errorMessage }}
          </div>

          <q-btn
            label="Login"
            type="submit"
            color="primary"
            class="full-width q-mt-lg"
            :loading="loading"
          />
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref<string | null>(null);

async function handleLogin() {
  loading.value = true;
  errorMessage.value = null;

  try {
    await authStore.loginUser(email.value, password.value);
    // Auth state listener in store will update automatically
    void router.push('/');
  } finally {
    loading.value = false;
  }
}
</script>
