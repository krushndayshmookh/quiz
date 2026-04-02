<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode: number
    statusMessage?: string
    message?: string
  }
}>()

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="error-page">
    <div class="error-card animate__animated animate__bounceIn">
      <div class="error-icon">
        <i v-if="error.statusCode === 404" class="la la-search la-3x" />
        <i v-else class="la la-exclamation-triangle la-3x" />
      </div>
      <h1 class="error-code">{{ error.statusCode }}</h1>
      <h2 class="error-title">
        {{ error.statusCode === 404 ? 'Page Not Found' : 'Something Went Wrong' }}
      </h2>
      <p class="error-msg text-muted mt-1">
        {{ error.statusCode === 404
          ? "The page you're looking for doesn't exist."
          : (error.statusMessage || error.message || 'An unexpected error occurred.') }}
      </p>
      <button class="btn btn-primary btn-xl mt-3" @click="handleError">
        <i class="la la-home" /> Back to Home
      </button>
    </div>
  </div>
</template>

<style>
/* Global reset so the error page uses our design system */
@import '/assets/css/main.css';
</style>

<style scoped>
.error-page {
  min-height: 100vh;
  background: var(--light);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.error-card {
  background: var(--white);
  border: 3px solid var(--dark);
  border-radius: 24px;
  padding: 3rem 2.5rem;
  text-align: center;
  max-width: 480px;
  width: 100%;
  box-shadow: 8px 8px 0 rgba(30,30,46,0.12);
}

.error-icon {
  width: 80px;
  height: 80px;
  background: var(--purple-light);
  border: 3px solid var(--dark);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.25rem;
  color: var(--purple-dark);
  box-shadow: 4px 4px 0 rgba(30,30,46,0.15);
}

.error-code {
  font-size: 4.5rem;
  font-weight: 900;
  color: var(--purple-dark);
  line-height: 1;
  margin: 0;
}

.error-title {
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0.5rem 0 0;
}

.error-msg {
  font-size: 1rem;
}
</style>
