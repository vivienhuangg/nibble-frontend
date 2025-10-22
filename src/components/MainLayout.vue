<template>
  <div class="main-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <h2 v-if="!sidebarCollapsed">Nibble</h2>
        <button @click="toggleSidebar" class="toggle-btn">
          {{ sidebarCollapsed ? '☰' : '✕' }}
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <h3 v-if="!sidebarCollapsed">Cookbooks</h3>
          <div class="nav-items">
            <button
              v-for="notebook in userNotebooks || []"
              :key="notebook._id"
              @click="selectNotebook(notebook)"
              class="nav-item"
              :class="{ active: currentNotebook?._id === notebook._id }"
            >
              <span v-if="!sidebarCollapsed">{{ notebook.title }}</span>
              <span v-else class="nav-icon">📚</span>
            </button>
          </div>
        </div>

        <div class="nav-section">
          <h3 v-if="!sidebarCollapsed">Shared</h3>
          <div class="nav-items">
            <button
              v-for="notebook in sharedNotebooks || []"
              :key="notebook._id"
              @click="selectNotebook(notebook)"
              class="nav-item shared"
              :class="{ active: currentNotebook?._id === notebook._id }"
            >
              <span v-if="!sidebarCollapsed">{{ notebook.title }}</span>
              <span v-else class="nav-icon">👥</span>
            </button>
          </div>
        </div>

        <div class="nav-section">
          <button @click="showCreateNotebook = true" class="create-notebook-btn">
            <span v-if="!sidebarCollapsed">+ New Cookbook</span>
            <span v-else class="nav-icon">+</span>
          </button>
        </div>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="content-header">
        <div class="breadcrumb">
          <span v-if="currentNotebook">{{ currentNotebook.title }}</span>
          <span v-else>Select a Cookbook</span>
        </div>
        <div class="header-actions">
          <button @click="goToRecipes" class="action-btn">All Recipes</button>
          <button @click="goToHome" class="action-btn">Home</button>
          <button @click="handleLogout" class="action-btn logout-btn">Logout</button>
        </div>
      </header>

      <div class="content-body">
        <slot />
      </div>
    </main>

    <!-- Create Notebook Modal -->
    <div v-if="showCreateNotebook" class="modal-overlay" @click="closeCreateNotebook">
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
            <button type="button" @click="closeCreateNotebook" class="cancel-btn">Cancel</button>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAnnotationStore } from '@/stores/annotation'
import { useAuthStore } from '@/stores/auth'
import { useNotebookStore } from '@/stores/notebook'
import { useRecipeStore } from '@/stores/recipe'
import { useVersionStore } from '@/stores/version'

const router = useRouter()
const notebookStore = useNotebookStore()
const authStore = useAuthStore()
const recipeStore = useRecipeStore()
const versionStore = useVersionStore()
const annotationStore = useAnnotationStore()

const sidebarCollapsed = ref(false)
const showCreateNotebook = ref(false)

const isLoading = computed(() => notebookStore.isLoading)
const userNotebooks = computed(() => {
  console.log('🔍 MainLayout userNotebooks computed:', notebookStore.userNotebooks)
  return notebookStore.userNotebooks
})
const sharedNotebooks = computed(() => {
  console.log('🔍 MainLayout sharedNotebooks computed:', notebookStore.sharedNotebooks)
  return notebookStore.sharedNotebooks
})
const currentNotebook = computed(() => notebookStore.currentNotebook)

const newNotebook = reactive({
  title: '',
  description: '',
})

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function selectNotebook(notebook: { _id: string }) {
  notebookStore.loadNotebookById(notebook._id)
  // Navigate to cookbook view
  router.push(`/cookbook/${notebook._id}`)
}

function goToRecipes() {
  router.push('/recipes')
}

function goToHome() {
  router.push('/')
}

function handleLogout() {
  authStore.logout()
  // Clear all stores
  notebookStore.clearCurrentNotebook()
  recipeStore.clearCurrentRecipe()
  // Redirect to login page
  router.push('/auth')
}

function closeCreateNotebook() {
  showCreateNotebook.value = false
  resetForm()
}

function resetForm() {
  newNotebook.title = ''
  newNotebook.description = ''
}

async function handleCreateNotebook() {
  try {
    console.log('🔍 MainLayout handleCreateNotebook - starting')
    notebookStore.clearError()

    await notebookStore.createNotebook({
      title: newNotebook.title,
      description: newNotebook.description,
    })

    console.log('🔍 MainLayout handleCreateNotebook - notebook created successfully')
    showCreateNotebook.value = false
    resetForm()
  } catch (err) {
    console.error('Create notebook error:', err)
  }
}

onMounted(async () => {
  if (authStore.isAuthenticated) {
    try {
      await notebookStore.loadAllUserNotebooks()
    } catch (err) {
      console.error('Failed to load notebooks:', err)
    }
  }
})
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  background-color: #f8f9fa;
}

.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e1e5e9;
  transition: width 0.3s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #e1e5e9;
}

.sidebar-header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.toggle-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  padding: 5px;
}

.sidebar-nav {
  padding: 20px 0;
}

.nav-section {
  margin-bottom: 30px;
}

.nav-section h3 {
  margin: 0 0 15px 20px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-items {
  display: flex;
  flex-direction: column;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: #333;
  font-size: 16px;
  transition: background-color 0.2s;
}

.nav-item:hover {
  background-color: #f8f9fa;
}

.nav-item.active {
  background-color: #667eea;
  color: white;
}

.nav-item.shared {
  color: #28a745;
}

.nav-item.shared.active {
  color: white;
}

.nav-icon {
  font-size: 20px;
  margin: 0 auto;
}

.create-notebook-btn {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  margin: 0 20px;
  border-radius: 8px;
  transition: opacity 0.2s;
}

.create-notebook-btn:hover {
  opacity: 0.9;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  background: white;
  border-bottom: 1px solid #e1e5e9;
}

.breadcrumb {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  color: #495057;
  font-size: 14px;
}

.action-btn:hover {
  background: #e9ecef;
}

.logout-btn {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.logout-btn:hover {
  background: #c82333;
  border-color: #bd2130;
}

.content-body {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
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
  border-color: #667eea;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.cancel-btn {
  background: #ddd;
  color: #333;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
}

.submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -280px;
    z-index: 100;
    height: 100vh;
  }

  .sidebar:not(.collapsed) {
    left: 0;
  }

  .main-content {
    margin-left: 0;
  }

  .content-header {
    padding: 15px 20px;
  }

  .content-body {
    padding: 20px;
  }
}
</style>
