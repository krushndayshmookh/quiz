<script setup lang="ts">
const router = useRouter()
const name = ref('')
const error = ref('')
const joining = ref(false)

useHead({ title: 'Join Quiz — NST Quiz' })

function join() {
  const trimmed = name.value.trim()
  if (!trimmed) { error.value = 'Please enter your name'; return }
  if (trimmed.length > 32) { error.value = 'Name must be 32 characters or less'; return }
  error.value = ''
  joining.value = true
  localStorage.setItem('nst-player-name', trimmed)
  router.push('/play')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') join()
}

onMounted(() => {
  const saved = localStorage.getItem('nst-player-name')
  if (saved) name.value = saved
})
</script>

<template>
  <div class="page-center" style="background: var(--light)">
    <div class="join-card animate__animated animate__bounceIn">
      <!-- Header -->
      <div class="join-header">
        <div class="join-logo">
          <i class="la la-bolt" />
        </div>
        <h1 class="join-title">NST Quiz</h1>
        <p class="join-sub">Real-time classroom quiz</p>
      </div>

      <!-- Form -->
      <div class="join-form">
        <label class="join-label">
          <i class="la la-user" /> Your Name
        </label>
        <input
          v-model="name"
          type="text"
          class="input input-xl"
          placeholder="Enter your name..."
          maxlength="32"
          autocomplete="given-name"
          autofocus
          @keydown="onKey"
        />
        <p v-if="error" class="join-error animate__animated animate__shakeX">
          <i class="la la-exclamation-circle" /> {{ error }}
        </p>

        <button
          class="btn btn-xl btn-primary btn-block mt-3"
          :disabled="joining || !name.trim()"
          @click="join"
        >
          <i v-if="!joining" class="la la-sign-in-alt" />
          <i v-else class="la la-spinner la-spin" />
          {{ joining ? 'Joining...' : 'Join Quiz' }}
        </button>
      </div>

      <!-- Footer links -->
      <div class="join-footer">
        <NuxtLink to="/leaderboard" class="join-link">
          <i class="la la-trophy" /> Leaderboard
        </NuxtLink>
        <span class="join-divider">·</span>
        <NuxtLink to="/admin" class="join-link">
          <i class="la la-cog" /> Admin
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.join-card {
  background: var(--white);
  border: 3px solid var(--dark);
  border-radius: 24px;
  box-shadow: 8px 8px 0 rgba(30,30,46,0.18);
  padding: 2.5rem;
  width: 100%;
  max-width: 460px;
}

.join-header {
  text-align: center;
  margin-bottom: 2rem;
}

.join-logo {
  width: 72px;
  height: 72px;
  background: var(--yellow);
  border: 3px solid var(--dark);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  margin: 0 auto 1rem;
  box-shadow: 4px 4px 0 rgba(30,30,46,0.15);
}

.join-title {
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: -1px;
}

.join-sub {
  color: var(--mid);
  font-size: 1rem;
  margin-top: 0.25rem;
}

.join-label {
  display: block;
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--dark-2);
}

.join-error {
  color: var(--coral-dark);
  font-weight: 700;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.join-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid rgba(30,30,46,0.1);
}

.join-link {
  color: var(--mid);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: color 0.15s;
}
.join-link:hover { color: var(--dark); }

.join-divider { color: rgba(30,30,46,0.3); }
</style>
