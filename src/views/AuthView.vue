<template>
  <div class="auth-container">
    <div class="auth-card">
      <h2>{{ isLogin ? 'Login' : 'Register' }}</h2>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="!isLogin" class="form-group">
          <label for="name">Name</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            :disabled="isLoading"
            placeholder="Enter your name"
          />
        </div>

        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            required
            :disabled="isLoading"
            placeholder="Enter your username"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            :disabled="isLoading"
            placeholder="Enter your password"
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" :disabled="isLoading" class="submit-btn">
          {{ isLoading ? 'Please wait...' : isLogin ? 'Login' : 'Register' }}
        </button>
      </form>

      <div class="auth-switch">
        <p>
          {{ isLogin ? "Don't have an account?" : 'Already have an account?' }}
          <button @click="toggleMode" class="switch-btn" :disabled="isLoading">
            {{ isLogin ? 'Register' : 'Login' }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isLogin = ref(true)
const isLoading = computed(() => authStore.isLoading)
const error = computed(() => authStore.error)

const form = reactive({
  name: '',
  username: '',
  password: '',
})

function toggleMode() {
  isLogin.value = !isLogin.value
  authStore.clearError()
  // Clear form
  form.name = ''
  form.username = ''
  form.password = ''
}

async function handleSubmit() {
  try {
    console.log('🔍 AuthView - handleSubmit starting')
    authStore.clearError()

    if (isLogin.value) {
      console.log('🔍 AuthView - calling login')
      await authStore.login(form.username, form.password)
      console.log('🔍 AuthView - login completed successfully')
    } else {
      console.log('🔍 AuthView - calling register')
      await authStore.register(form.name, form.username, form.password)
      console.log('🔍 AuthView - register completed successfully')
    }

    console.log('🔍 AuthView - redirecting to /')
    // Redirect to home page (notebook view) on success
    router.push('/')
  } catch (err) {
    // Error is handled by the store
    console.error('🔍 AuthView - Auth error:', err)
  }
}
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--brand-indigo-500) 0%, var(--brand-blue-400) 100%);
  padding: 20px;
}

.auth-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 28px;
  font-weight: 600;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-weight: 500;
  color: #555;
  font-size: 14px;
}

input {
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: var(--color-primary);
}

input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  border: 1px solid #fcc;
}

.submit-btn {
  color: var(--brand-blue-400);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn:disabled:hover {
  text-decoration: none;
}

.auth-switch {
  margin-top: 20px;
  text-align: center;
}

.auth-switch p {
  color: #666;
  font-size: 14px;
}

.switch-btn {
  color: var(--brand-blue-400);
}

.switch-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-btn:disabled:hover {
  text-decoration: none;
}
</style>
