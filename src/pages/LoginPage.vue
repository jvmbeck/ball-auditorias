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
            :disable="loading || resolvingAccess"
            lazy-rules
            :rules="[
              (val) => !!val || 'Email é obrigatório',
              (val) => /.+@.+\..+/.test(val) || 'Email deve ser válido',
            ]"
          />

          <q-input
            v-model="password"
            label="Senha"
            type="password"
            outlined
            :disable="loading || resolvingAccess"
            class="q-mt-md"
            :rules="[(val) => !!val || 'Senha é obrigatória']"
          />

          <div v-if="resolvingAccess" class="text-grey-7 q-mt-md">
            Validando permissões e redirecionando...
          </div>

          <div v-if="errorMessage" class="text-negative q-mt-md">
            {{ errorMessage }}
          </div>

          <q-btn
            :label="resolvingAccess ? 'Redirecionando...' : 'Login'"
            type="submit"
            color="primary"
            class="full-width q-mt-lg"
            :loading="loading || resolvingAccess"
            :disable="loading || resolvingAccess"
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
const resolvingAccess = ref(false);
const errorMessage = ref<string | null>(null);

async function handleLogin() {
  loading.value = true;
  resolvingAccess.value = false;
  errorMessage.value = null;

  try {
    // This now waits for Firebase's listener and profile resolution.
    await authStore.loginUser(email.value, password.value);

    resolvingAccess.value = true;

    if (authStore.role === 'admin') {
      await router.push('/admin');
    } else if (authStore.role === 'operator') {
      await router.push('/auditor');
    } else {
      errorMessage.value = 'Seu usuário não possui um perfil de acesso válido.';
    }
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Falha ao fazer login.';
  } finally {
    loading.value = false;
    resolvingAccess.value = false;
  }
}
</script>
