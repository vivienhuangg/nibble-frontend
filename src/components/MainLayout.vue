<template>
  <div class="main-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <!-- Hover trigger zone for collapsed sidebar -->
    <div
      class="sidebar-hover-trigger"
      @mouseenter="sidebarCollapsed = false"
      @mouseleave="sidebarCollapsed = true"
    ></div>

    <!-- Sidebar -->
    <aside
      class="sidebar"
      :class="{ collapsed: sidebarCollapsed }"
      @mouseenter="sidebarCollapsed = false"
      @mouseleave="sidebarCollapsed = true"
    >
      <div class="sidebar-header">
        <h2>Nibble</h2>
      </div>

      <div class="sidebar-content">
        <nav class="sidebar-nav">
          <div class="nav-section">
            <button @click="goToCookbooks" class="view-all-btn">
              <BookOpenText :size="18" />
              <span>All Cookbooks</span>
            </button>

            <button @click="showCreateNotebook = true" class="create-notebook-btn">
              <Plus :size="18" />
              <span>New Cookbook</span>
            </button>

            <div class="nav-divider"></div>
          </div>

          <div class="nav-section">
            <div class="nav-items">
              <button
                v-for="notebook in allNotebooks"
                :key="notebook._id"
                @click="selectNotebook(notebook)"
                class="nav-item"
                :class="{ active: currentNotebook?._id === notebook._id }"
              >
                <span class="notebook-title">{{ notebook.title }}</span>
                <Users
                  v-if="isSharedNotebook(notebook)"
                  :size="16"
                  class="shared-icon"
                  title="Shared with you"
                />
              </button>
            </div>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="footer-actions">
            <button @click="handleLogout" class="nav-item logout-btn">Logout</button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
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
import { BookOpenText, Plus, Users } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotebookStore } from '@/stores/notebook'
import { useRecipeStore } from '@/stores/recipe'

const router = useRouter()
const notebookStore = useNotebookStore()
const authStore = useAuthStore()
const recipeStore = useRecipeStore()

const sidebarCollapsed = ref(true)
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

// Combine all notebooks (owned + shared) into a single list
const allNotebooks = computed(() => {
  return [...(userNotebooks.value || []), ...(sharedNotebooks.value || [])]
})

// Check if a notebook is shared (not owned by current user)
function isSharedNotebook(notebook: { _id: string; owner: string }) {
  return notebook.owner !== authStore.userId
}

const newNotebook = reactive({
  title: '',
  description: '',
})

function selectNotebook(notebook: { _id: string }) {
  notebookStore.loadNotebookById(notebook._id)
  // Navigate to cookbook view
  router.push(`/cookbooks/${notebook._id}`)
}

function goToCookbooks() {
  router.push('/cookbooks')
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
  background-color: white;
}

.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e1e5e9;
  transition: transform 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 100;
}

.sidebar.collapsed {
  transform: translateX(-100%);
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
}

.sidebar-hover-trigger {
  position: fixed;
  left: 0;
  top: 0;
  width: 20px;
  height: 100vh;
  z-index: 101;
  background: transparent;
  pointer-events: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e1e5e9;
}

.sidebar-header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.sidebar-nav {
  padding: 20px 0;
  flex: 1;
  overflow-y: auto;
}

.sidebar-footer {
  border-top: 1px solid #e1e5e9;
  padding: 15px 0;
  display: flex;
  flex-direction: column;
  margin-top: auto;
}

.footer-actions {
  display: flex;
  flex-direction: column;
}

.footer-actions .nav-item {
  width: 100%;
  justify-content: flex-start;
}

.nav-section {
  margin-bottom: 30px;
}

.nav-divider {
  height: 1px;
  background-color: #e1e5e9;
  margin: 10px 20px 0;
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
  justify-content: space-between;
  padding: 12px 20px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: #333;
  font-size: 16px;
  transition: background-color 0.2s;
  width: 100%;
}

.nav-item:hover {
  opacity: 0.8;
}

.nav-item.active {
  color: var(--brand-blue-400);
}

.notebook-title {
  flex: 1;
  text-align: left;
}

.shared-icon {
  margin-left: 8px;
  opacity: 0.6;
  flex-shrink: 0;
  stroke-width: 2;
}

.nav-icon {
  font-size: 20px;
  margin: 0 auto;
}

.create-notebook-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--brand-blue-400);
  text-align: left;
  padding: 12px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
  justify-content: flex-start;
  transition: opacity 0.2s;
}

.create-notebook-btn:hover {
  opacity: 0.8;
}

.create-notebook-btn svg {
  flex-shrink: 0;
}

.view-all-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--brand-indigo-500);
  text-align: left;
  padding: 12px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
  justify-content: flex-start;
  transition: opacity 0.2s;
}

.view-all-btn:hover {
  opacity: 0.8;
}

.view-all-btn svg {
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: margin-left 0.3s ease;
}

.main-layout.sidebar-collapsed .main-content {
  margin-left: 0;
}

.logout-btn {
  color: var(--color-danger);
}

.content-body {
  flex: 1;
  padding: 30px 60px;
  overflow-y: auto;
  background: white;
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
}

.submit-btn {
  color: var(--brand-blue-400);
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
    padding: 20px 20px;
  }
}
</style>
