<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h5">Administração</div>
            <div class="text-subtitle2 text-grey-7 q-mt-xs">
              Análises serão consolidadas em breve.
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card bordered>
          <q-card-section>
            <div class="text-subtitle1">Análises 5S</div>
            <div class="text-body2 text-grey-7 q-mt-xs">
              Acesse as análises de 5S para obter insights sobre a organização e eficiência do
              ambiente de trabalho.
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn label="Abrir Análises" color="primary" :to="{ name: 'analytics' }" />
          </q-card-actions>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card bordered>
          <q-card-section>
            <div class="text-subtitle1">Página do Auditor 5S</div>
            <div class="text-body2 text-grey-7 q-mt-xs">
              Usuários administradores ainda podem acessar a página do auditor 5S.
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              label="Ir para a Página do Auditor 5S"
              outline
              color="primary"
              :to="{ name: 'auditor-home' }"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>
    <div>
      <section class="q-mt-lg">
        <div class="daily5s-grid">
          <Daily5sRatedProcessesCard />
        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import Daily5sRatedProcessesCard from 'src/components/daily5s/audit/Daily5sRatedProcessesCard.vue';
</script>

<style scoped>
.daily5s-grid {
  display: flex;
  gap: 2rem;
}
</style>
