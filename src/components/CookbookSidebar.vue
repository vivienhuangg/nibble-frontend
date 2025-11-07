<template>
  <div class="cookbook-sidebar">
    <div class="sidebar-header">
      <h2>Cookbooks</h2>
      <button @click="showCreateForm = true" class="create-btn">+</button>
    </div>

    <div class="cookbook-list">
      <div
        v-for="notebook in userNotebooks"
        :key="notebook._id"
        class="cookbook-item"
        :class="{ active: selectedNotebook?._id === notebook._id }"
        @click="selectNotebook(notebook)"
      >
        <div class="cookbook-icon">
          <BookOpenText :size="24" :stroke-width="2" />
        </div>
        <div class="cookbook-info">
          <h3>{{ notebook.title }}</h3>
          <p>{{ notebook.description }}</p>
          <div class="cookbook-meta">
            <span>{{ notebook.recipes?.length || 0 }} recipes</span>
            <span>{{ notebook.members?.length || 1 }} members</span>
          </div>
        </div>
      </div>

      <div v-if="sharedNotebooks.length > 0" class="section-divider">
        <h4>Shared with me</h4>
      </div>

      <div
        v-for="notebook in sharedNotebooks"
        :key="notebook._id"
        class="cookbook-item shared"
        :class="{ active: selectedNotebook?._id === notebook._id }"
        @click="selectNotebook(notebook)"
      >
        <div class="cookbook-icon shared-icon">
          <Users :size="24" :stroke-width="2" />
        </div>
        <div class="cookbook-info">
          <h3>{{ notebook.title }}</h3>
          <p>{{ notebook.description }}</p>
          <div class="cookbook-meta">
            <span>{{ notebook.recipes?.length || 0 }} recipes</span>
            <span>{{ notebook.members?.length || 1 }} members</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Cookbook Modal -->
    <div v-if="showCreateForm" class="modal-overlay" @click="closeCreateForm">
      <div class="modal" @click.stop>
        <h3>Create New Cookbook</h3>
        <form @submit.prevent="handleCreateNotebook">
          <div class="form-group">
            <label for="title">Cookbook Name</label>
            <input
              id="title"
              v-model="newNotebook.title"
              type="text"
              required
              placeholder="e.g., Family Recipes, Cocktails!!!"
            />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="newNotebook.description"
              placeholder="Describe this cookbook..."
              rows="3"
            ></textarea>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeCreateForm" class="cancel-btn">Cancel</button>
            <button type="submit" :disabled="isLoading" class="submit-btn">
              {{ isLoading ? 'Creating...' : 'Create Cookbook' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { BookOpenText, Users } from 'lucide-vue-next'
import { useNotebookStore } from '@/stores/notebook'
import type { Notebook } from '@/types/api'

interface Props {
  selectedNotebook?: Notebook | null
}

interface Emits {
  (e: 'notebook-selected', notebook: Notebook): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const notebookStore = useNotebookStore()
const showCreateForm = ref(false)

const isLoading = computed(() => notebookStore.isLoading)
const userNotebooks = computed(() => notebookStore.userNotebooks)
const sharedNotebooks = computed(() => notebookStore.sharedNotebooks)

const newNotebook = reactive({
  title: '',
  description: '',
})

function selectNotebook(notebook: Notebook) {
  emit('notebook-selected', notebook)
}

function closeCreateForm() {
  showCreateForm.value = false
  resetForm()
}

function resetForm() {
  newNotebook.title = ''
  newNotebook.description = ''
}

async function handleCreateNotebook() {
  try {
    notebookStore.clearError()

    await notebookStore.createNotebook({
      title: newNotebook.title,
      description: newNotebook.description,
    })

    showCreateForm.value = false
    resetForm()
  } catch (err) {
    console.error('Create notebook error:', err)
  }
}
</script>

<style scoped>
.cookbook-sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid #e1e5e9;
  height: 100vh;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e1e5e9;
}

.sidebar-header h2 {
  margin: 0;
  color: #333;
  font-size: 20px;
  font-weight: 600;
}

.create-btn {
  color: var(--brand-indigo-500);
  width: auto;
  height: auto;
  padding: 0;
  font-size: 18px;
}

.cookbook-list {
  padding: 20px 0;
}

.cookbook-item {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-left: 3px solid transparent;
}

.cookbook-item:hover {
  background-color: #f8f9fa;
}

.cookbook-item.active {
  background-color: rgba(82, 120, 176, 0.1);
  border-left-color: var(--brand-indigo-500);
}

.cookbook-item.shared {
  background-color: #f0f8f0;
}

.cookbook-item.shared.active {
  background-color: rgba(184, 220, 219, 0.2);
  border-left-color: var(--color-success);
}

.cookbook-icon {
  margin-right: 15px;
  flex-shrink: 0;
  color: var(--brand-indigo-500);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cookbook-icon.shared-icon {
  color: var(--color-success);
}

.cookbook-info {
  flex: 1;
  min-width: 0;
}

.cookbook-info h3 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cookbook-info p {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cookbook-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #888;
}

.section-divider {
  padding: 20px 20px 10px;
  border-top: 1px solid #e1e5e9;
  margin-top: 20px;
}

.section-divider h4 {
  margin: 0;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

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
}

.modal h3 {
  margin-bottom: 20px;
  color: #333;
  font-size: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.cancel-btn {
  color: #6c757d;
  margin-right: 8px;
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

@media (max-width: 768px) {
  .cookbook-sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid #e1e5e9;
  }

  .cookbook-item {
    padding: 12px 15px;
  }

  .cookbook-icon {
    font-size: 20px;
    margin-right: 12px;
  }

  .cookbook-info h3 {
    font-size: 14px;
  }

  .cookbook-info p {
    font-size: 12px;
  }
}
</style>
