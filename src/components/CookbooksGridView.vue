<template>
  <div class="cookbooks-grid-view">
    <div class="cookbooks-header">
      <h1>My Cookbooks</h1>
      <button @click="showCreateModal = true" class="create-cookbook-btn">+ Create Cookbook</button>
    </div>

    <div v-if="isLoading" class="loading">Loading cookbooks...</div>

    <div v-else-if="allCookbooks.length === 0" class="empty-state">
      <div class="empty-icon">
        <BookOpenText :size="72" :stroke-width="1.5" />
      </div>
      <h3>No cookbooks yet</h3>
      <p>Create your first cookbook to organize your recipes!</p>
    </div>

    <div v-else>
      <!-- User's Cookbooks Section -->
      <div v-if="userCookbooks.length > 0" class="cookbook-section">
        <h2>Your Cookbooks</h2>
        <div class="cookbooks-grid">
          <CookbookCard
            v-for="cookbook in userCookbooks"
            :key="cookbook._id"
            :cookbook="cookbook"
            :is-owner="true"
            @click="selectCookbook(cookbook._id)"
            @delete="handleDelete"
          />
        </div>
      </div>

      <!-- Shared Cookbooks Section -->
      <div v-if="sharedCookbooks.length > 0" class="cookbook-section">
        <h2>Shared With You</h2>
        <div class="cookbooks-grid">
          <CookbookCard
            v-for="cookbook in sharedCookbooks"
            :key="cookbook._id"
            :cookbook="cookbook"
            :is-owner="false"
            @click="selectCookbook(cookbook._id)"
          />
        </div>
      </div>
    </div>

    <!-- Create Cookbook Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal" @click.stop>
        <h3>Create New Cookbook</h3>

        <div class="form-group">
          <label for="cookbookTitle">Title</label>
          <input
            v-model="newCookbookTitle"
            type="text"
            id="cookbookTitle"
            placeholder="e.g., Family Recipes, Quick Meals, Desserts"
            class="text-input"
            @keydown.enter="createCookbook"
          />
        </div>

        <div class="form-group">
          <label for="cookbookDescription">Description (optional)</label>
          <textarea
            v-model="newCookbookDescription"
            id="cookbookDescription"
            placeholder="What's this cookbook about?"
            class="textarea-input"
            rows="3"
          ></textarea>
        </div>

        <div v-if="createError" class="error-message">{{ createError }}</div>

        <div class="form-actions">
          <button @click="closeCreateModal" class="cancel-btn">Cancel</button>
          <button
            @click="createCookbook"
            class="create-btn"
            :disabled="!newCookbookTitle || isCreating"
          >
            {{ isCreating ? 'Creating...' : 'Create Cookbook' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOpenText } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotebookStore } from '@/stores/notebook'
import type { Notebook } from '@/types/api'
import CookbookCard from './CookbookCard.vue'

const router = useRouter()
const notebookStore = useNotebookStore()
const authStore = useAuthStore()

const showCreateModal = ref(false)
const newCookbookTitle = ref('')
const newCookbookDescription = ref('')
const isCreating = ref(false)
const createError = ref('')

const isLoading = computed(() => notebookStore.isLoading)

// Get all cookbooks (owned + shared)
const allCookbooks = computed(() => notebookStore.notebooks)

// User's own cookbooks
const userCookbooks = computed(() => notebookStore.userNotebooks)

// Cookbooks shared with the user
const sharedCookbooks = computed(() => notebookStore.sharedNotebooks)

function selectCookbook(cookbookId: string) {
  // Navigate to the cookbook view with the selected cookbook
  router.push(`/cookbooks/${cookbookId}`)
}

function closeCreateModal() {
  showCreateModal.value = false
  newCookbookTitle.value = ''
  newCookbookDescription.value = ''
  createError.value = ''
}

async function createCookbook() {
  if (!newCookbookTitle.value) return

  isCreating.value = true
  createError.value = ''

  try {
    const notebookId = await notebookStore.createNotebook({
      title: newCookbookTitle.value,
      description: newCookbookDescription.value || '',
    })

    console.log('🔍 Created notebook with ID:', notebookId)

    // Close modal and reset form
    closeCreateModal()

    // Navigate to the new cookbook
    router.push(`/cookbooks/${notebookId}`)
  } catch (error) {
    console.error('Failed to create cookbook:', error)
    createError.value = 'Failed to create cookbook. Please try again.'
  } finally {
    isCreating.value = false
  }
}

async function handleDelete(cookbookId: string) {
  if (!confirm('Are you sure you want to delete this cookbook? This action cannot be undone.')) {
    return
  }

  try {
    await notebookStore.deleteNotebook(cookbookId)
  } catch (error) {
    console.error('Failed to delete cookbook:', error)
    alert('Failed to delete cookbook. Please try again.')
  }
}

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await notebookStore.loadAllUserNotebooks()
  }
})
</script>

<style scoped>
.cookbooks-grid-view {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.cookbooks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e1e5e9;
}

.cookbooks-header h1 {
  margin: 0;
  color: #333;
  font-size: 36px;
  font-weight: 700;
}


.create-cookbook-btn,
.create-cookbook-btn-large {
  background: none;
  border: none;
  color: var(--brand-indigo-500);
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  transition: color 0.2s ease;
}

.create-cookbook-btn {
  font-size: 16px;
}

.create-cookbook-btn-large {
  font-size: 18px;
}

.create-cookbook-btn:hover,
.create-cookbook-btn:focus-visible,
.create-cookbook-btn-large:hover,
.create-cookbook-btn-large:focus-visible {
  color: var(--brand-indigo-600);
  text-decoration: underline;
}

.create-cookbook-btn:focus-visible,
.create-cookbook-btn-large:focus-visible {
  outline: none;
}

.loading {
  text-align: center;
  padding: 80px;
  color: #666;
  font-size: 18px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #666;
}

.empty-icon {
  margin-bottom: 24px;
  color: var(--brand-indigo-500);
  opacity: 0.5;
  display: flex;
  justify-content: center;
}

.empty-state h3 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 28px;
  font-weight: 600;
}

.empty-state p {
  margin: 0 0 30px 0;
  font-size: 18px;
}

.create-cookbook-btn-large svg {
  flex-shrink: 0;
}

.cookbook-section {
  margin-bottom: 50px;
}

.cookbook-section h2 {
  margin: 0 0 24px 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.cookbooks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  margin: 0 0 24px 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 600;
  font-size: 14px;
}

.text-input,
.textarea-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.2s;
}

.text-input:focus,
.textarea-input:focus {
  outline: none;
  border-color: var(--brand-indigo-500);
}

.textarea-input {
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.cancel-btn {
  background: white;
  color: #666;
  padding: 10px 20px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #f8f9fa;
  border-color: #ced4da;
}

.create-btn {
  background: var(--brand-indigo-500);
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover:not(:disabled) {
  background: var(--brand-indigo-600);
}

.create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  margin-bottom: 16px;
  padding: 10px 14px;
  background: rgba(211, 93, 43, 0.12);
  color: var(--color-danger);
  border: 1px solid rgba(211, 93, 43, 0.3);
  border-radius: 6px;
  font-size: 14px;
}

@media (max-width: 768px) {
  .cookbooks-header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }

  .cookbooks-grid {
    grid-template-columns: 1fr;
  }
}
</style>
