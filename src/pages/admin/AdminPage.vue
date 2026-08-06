<template>
  <q-page padding class="admin-page">
    <div class="page-content">
      <!-- Compact page header -->
      <header class="page-header">
        <div>
          <div class="page-eyebrow">Painel administrativo</div>
          <h1 class="page-title">Administração</h1>
          <p class="page-description">
            Acompanhe a auditoria de hoje e acesse os principais recursos do sistema.
          </p>
        </div>

        <div class="page-header__icon">
          <q-icon name="admin_panel_settings" size="32px" color="primary" />
        </div>
      </header>
      <section class="page-section">
        <div class="section-heading">
          <div>
            <div class="section-title">Acesso rápido</div>
            <div class="section-description">
              Abra uma área para consultar informações ou gerenciar o processo.
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="navigation-grid">
          <RouterLink
            :to="{ name: 'action-plans' }"
            class="navigation-card-link"
            aria-label="Abrir planos de ação"
          >
            <q-card class="navigation-card navigation-card--primary" flat bordered>
              <q-card-section class="navigation-card__content">
                <div class="navigation-card__icon navigation-card__icon--action">
                  <q-icon name="assignment_turned_in" size="24px" />
                </div>

                <div class="navigation-card__main">
                  <div class="navigation-card__heading">
                    <div class="navigation-card__title">Planos de Ação</div>

                    <q-chip
                      dense
                      outline
                      color="positive"
                      icon="auto_awesome"
                      label="Novo"
                      class="q-ma-none"
                    />
                  </div>

                  <div class="navigation-card__description">
                    Acompanhe planos em aberto, responsáveis e o andamento de cada etapa.
                  </div>
                </div>

                <q-icon
                  name="arrow_forward"
                  size="22px"
                  color="primary"
                  class="navigation-card__arrow"
                />
              </q-card-section>
            </q-card>
          </RouterLink>

          <RouterLink
            :to="{ name: 'analytics' }"
            class="navigation-card-link"
            aria-label="Abrir análises 5S"
          >
            <q-card class="navigation-card" flat bordered>
              <q-card-section class="navigation-card__content">
                <div class="navigation-card__icon navigation-card__icon--analytics">
                  <q-icon name="analytics" size="24px" />
                </div>

                <div class="navigation-card__main">
                  <div class="navigation-card__title">Análises 5S</div>

                  <div class="navigation-card__description">
                    Consulte tendências, resultados mensais e indicadores dos processos.
                  </div>
                </div>

                <q-icon
                  name="arrow_forward"
                  size="22px"
                  color="primary"
                  class="navigation-card__arrow"
                />
              </q-card-section>
            </q-card>
          </RouterLink>

          <RouterLink
            :to="{ name: 'auditor-home' }"
            class="navigation-card-link"
            aria-label="Ir para a página do auditor"
          >
            <q-card class="navigation-card" flat bordered>
              <q-card-section class="navigation-card__content">
                <div class="navigation-card__icon navigation-card__icon--audit">
                  <q-icon name="fact_check" size="24px" />
                </div>

                <div class="navigation-card__main">
                  <div class="navigation-card__title">Página do Auditor</div>

                  <div class="navigation-card__description">
                    Acesse a interface operacional usada para registrar a auditoria diária.
                  </div>
                </div>

                <q-icon
                  name="arrow_forward"
                  size="22px"
                  color="primary"
                  class="navigation-card__arrow"
                />
              </q-card-section>
            </q-card>
          </RouterLink>
        </div>
      </section>

      <!-- KPIs -->
      <section class="page-section page-section--kpis">
        <div class="section-heading">
          <div>
            <div class="section-eyebrow">Visão operacional</div>
            <div class="section-title">Resumo de hoje</div>
            <div class="section-description">
              Indicadores atualizados com base na auditoria diária.
            </div>
          </div>

          <q-chip dense outline color="primary" icon="today" label="Hoje" class="q-ma-none" />
        </div>

        <div class="kpi-grid">
          <Daily5sRatedProcessesCard />
          <DailyKPICard />
        </div>
      </section>
    </div>
    <div class="text-body1 text-weight-light text-center q-mt-xl text-grey-9">
      Sistema de Auditoria 5S • v1.0.2 • Desenvolvido por João Vitor Madrid Beck
    </div>
  </q-page>
</template>

<script setup lang="ts">
import Daily5sRatedProcessesCard from 'src/components/daily5s/audit/Daily5sRatedProcessesCard.vue';
import DailyKPICard from 'src/components/daily5s/analytics/DailyKPICard.vue';
</script>

<style scoped>
.admin-page {
  min-height: 100%;
  background:
    radial-gradient(circle at top right, rgba(25, 118, 210, 0.07), transparent 28rem),
    linear-gradient(180deg, #f7f9fc 0%, #f3f5f8 100%);
}

.page-content {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

/* Header */

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(31, 41, 55, 0.09);
  border-radius: 16px;
  box-shadow: 0 7px 24px rgba(31, 41, 55, 0.045);
}

.page-eyebrow,
.section-eyebrow {
  color: var(--q-primary);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-title {
  margin: 2px 0 0;
  color: #1f2937;
  font-size: clamp(1.45rem, 2.5vw, 1.8rem);
  font-weight: 700;
  line-height: 1.2;
}

.page-description {
  margin: 5px 0 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
}

.page-header__icon {
  display: grid;
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  place-items: center;
  background: rgba(25, 118, 210, 0.08);
  border-radius: 14px;
}

/* Shared sections */

.page-section {
  margin-top: 28px;
}

.page-section--kpis {
  margin-top: 24px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 13px;
}

.section-title {
  margin-top: 2px;
  color: #1f2937;
  font-size: 1.05rem;
  font-weight: 700;
}

.section-description {
  margin-top: 3px;
  color: #7b8492;
  font-size: 0.84rem;
}

/* KPIs */

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: 430px;
  gap: 18px;
  align-items: stretch;
}

.kpi-grid > * {
  min-width: 0;
  min-height: 0;
  height: 100%;
}

/*
  This gives the KPI components a slightly stronger presence,
  provided their root element is a q-card.
*/
.kpi-grid :deep(.q-card) {
  height: 100%;
  border-radius: 16px;
  border-color: rgba(31, 41, 55, 0.1);
  box-shadow: 0 9px 26px rgba(31, 41, 55, 0.065);
}

/* Navigation cards */

.navigation-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.navigation-card {
  height: 100%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(31, 41, 55, 0.09);
  border-radius: 15px;
  box-shadow: 0 5px 18px rgba(31, 41, 55, 0.035);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.navigation-card--primary {
  border-color: rgba(46, 125, 50, 0.2);
}

.navigation-card__content {
  display: flex;
  align-items: center;
  gap: 15px;
  min-height: 132px;
  padding: 18px;
}

.navigation-card__icon {
  display: grid;
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 13px;
}

.navigation-card__icon--action {
  color: #2e7d32;
  background: rgba(46, 125, 50, 0.1);
}

.navigation-card__icon--analytics {
  color: #1565c0;
  background: rgba(21, 101, 192, 0.1);
}

.navigation-card__icon--audit {
  color: #6a1b9a;
  background: rgba(106, 27, 154, 0.1);
}

.navigation-card__main {
  flex: 1;
  min-width: 0;
}

.navigation-card__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.navigation-card__title {
  color: #242b36;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.3;
}

.navigation-card__description {
  margin-top: 6px;
  color: #6b7280;
  font-size: 0.82rem;
  line-height: 1.5;
}

.navigation-card-link {
  display: block;
  height: 100%;
  color: inherit;
  text-decoration: none;
  border-radius: 15px;
}

.navigation-card-link:focus-visible {
  outline: 3px solid rgba(25, 118, 210, 0.28);
  outline-offset: 3px;
}

.navigation-card {
  height: 100%;
  cursor: pointer;
}

.navigation-card__arrow {
  flex: 0 0 auto;
  transition: transform 180ms ease;
}

.navigation-card-link:hover .navigation-card {
  transform: translateY(-2px);
  border-color: rgba(25, 118, 210, 0.28);
  box-shadow: 0 10px 24px rgba(31, 41, 55, 0.075);
}

.navigation-card-link:hover .navigation-card__arrow {
  transform: translateX(4px);
}

.navigation-card-link:active .navigation-card {
  transform: translateY(0);
}

/* Responsive */

@media (max-width: 1100px) {
  .navigation-grid {
    grid-template-columns: 1fr;
  }

  .navigation-card__content {
    min-height: 108px;
  }
}

@media (max-width: 767px) {
  .admin-page {
    padding: 16px;
  }

  .page-header {
    padding: 18px;
  }

  .page-header__icon {
    display: none;
  }

  .section-heading {
    align-items: flex-start;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
  }

  .navigation-card__content {
    min-height: 0;
    padding: 16px;
  }

  .navigation-card__description {
    padding-right: 4px;
  }
}

@media (max-width: 420px) {
  .navigation-card__content {
    align-items: flex-start;
  }

  .navigation-card__heading {
    align-items: flex-start;
  }

  .navigation-card__content > .q-btn {
    align-self: center;
  }
}
</style>
