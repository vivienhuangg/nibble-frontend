<template>
  <div class="cookbook-view">
    <div class="cookbook-header">
      <div class="cookbook-info">
        <h1>{{ currentNotebook?.title || 'Select a Cookbook' }}</h1>
        <p v-if="currentNotebook?.description" class="cookbook-description">
          {{ currentNotebook.description }}
        </p>
        <div class="cookbook-meta">
          <span>{{ recipes.length }} recipes</span>
          <span>{{ currentNotebook?.members?.length || 0 }} members</span>
          <span v-if="currentNotebook">Shared with: APT 511</span>
        </div>
      </div>

      <div class="cookbook-actions">
        <button @click="showAddRecipe = true" class="add-recipe-btn">+ Add Recipe</button>
        <button @click="showShareModal = true" class="share-btn">📤 Share</button>
      </div>
    </div>

    <!-- Filter and Search -->
    <div class="filter-section">
      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search recipes..."
          class="search-input"
        />
        <span class="search-icon">🔍</span>
      </div>

      <div class="tag-filters">
        <button
          v-for="tag in availableTags"
          :key="tag"
          @click="toggleTagFilter(tag)"
          class="tag-filter"
          :class="{ active: selectedTags.includes(tag) }"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- Recipes Grid -->
    <div v-if="isLoading" class="loading">Loading recipes...</div>

    <div v-else-if="filteredRecipes.length === 0" class="empty-state">
      <div class="empty-icon">📚</div>
      <h3>No recipes found</h3>
      <p v-if="searchQuery || selectedTags.length > 0">Try adjusting your search or filters</p>
      <p v-else>Add your first recipe to this cookbook!</p>
    </div>

    <div v-else class="recipes-grid">
      <RecipeCard
        v-for="recipe in filteredRecipes"
        :key="recipe._id"
        :recipe="recipe"
        :version-info="getVersionInfo(recipe._id)"
        :fork-count="getForkCount(recipe._id)"
        :annotation-count="getAnnotationCount(recipe._id)"
        :is-favorited="isRecipeFavorited(recipe._id)"
        @favorite-toggled="handleFavoriteToggle"
        @share-requested="handleShareRequest"
      />
    </div>

    <!-- Add Recipe Modal -->
    <div v-if="showAddRecipe" class="modal-overlay" @click="closeAddRecipe">
      <div class="modal" @click.stop>
        <h3>Add Recipe to Cookbook</h3>
        <div class="recipe-selection">
          <div v-if="availableRecipes.length === 0" class="no-recipes">
            <p>No recipes available to add. Create a recipe first!</p>
            <button @click="goToCreateRecipe" class="create-recipe-btn">Create Recipe</button>
          </div>
          <div v-else class="recipe-list">
            <div
              v-for="recipe in availableRecipes"
              :key="recipe._id"
              class="recipe-option"
              @click="addRecipeToCookbook(recipe)"
            >
              <h4>{{ recipe.title }}</h4>
              <p>{{ recipe.description }}</p>
              <div class="recipe-tags">
                <span v-for="tag in recipe.tags" :key="tag" class="tag">
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button @click="closeAddRecipe" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Share Modal -->
    <div v-if="showShareModal" class="modal-overlay" @click="closeShareModal">
      <div class="modal" @click.stop>
        <h3>Share Cookbook</h3>
        <div class="share-content">
          <p>Share "{{ currentNotebook?.title }}" with others</p>

          <!-- Email Invitation Form -->
          <div class="email-invitation-form">
            <h4>Invite by Email</h4>
            <div class="form-group">
              <label for="inviteEmail">Email Address</label>
              <input
                v-model="inviteEmail"
                type="email"
                id="inviteEmail"
                placeholder="Enter email address"
                class="email-input"
                :disabled="isInviting"
              />
            </div>
            <div class="form-group">
              <label for="inviteMessage">Message (Optional)</label>
              <textarea
                v-model="inviteMessage"
                id="inviteMessage"
                placeholder="Add a personal message..."
                class="message-input"
                rows="3"
                :disabled="isInviting"
              ></textarea>
            </div>
            <button
              @click="sendEmailInvitation"
              class="send-invite-btn"
              :disabled="!inviteEmail || isInviting"
            >
              {{ isInviting ? 'Sending...' : 'Send Invitation' }}
            </button>
            <div v-if="inviteError" class="error-message">{{ inviteError }}</div>
            <div v-if="inviteSuccess" class="success-message">{{ inviteSuccess }}</div>
          </div>
        </div>
        <div class="form-actions">
          <button @click="closeShareModal" class="cancel-btn">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAnnotationStore } from '@/stores/annotation'
import { useAuthStore } from '@/stores/auth'
import { useNotebookStore } from '@/stores/notebook'
import { useRecipeStore } from '@/stores/recipe'
import { useVersionStore } from '@/stores/version'
import type { Notebook, Recipe } from '@/types/api'
import RecipeCard from './RecipeCard.vue'

interface Props {
  notebook?: Notebook | null
}

const props = defineProps<Props>()
const router = useRouter()

const notebookStore = useNotebookStore()
const recipeStore = useRecipeStore()
const versionStore = useVersionStore()
const annotationStore = useAnnotationStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const showAddRecipe = ref(false)
const showShareModal = ref(false)

// Email invitation state
const inviteEmail = ref('')
const inviteMessage = ref('')
const isInviting = ref(false)
const inviteError = ref('')
const inviteSuccess = ref('')

const isLoading = computed(
  () => notebookStore.isLoading || recipeStore.isLoading || versionStore.isLoading,
)

const currentNotebook = computed(() => props.notebook || notebookStore.currentNotebook)
const recipes = ref<Recipe[]>([])

// Load recipes when notebook changes
watch(
  currentNotebook,
  async (newNotebook) => {
    if (newNotebook?.recipes) {
      console.log(
        '🔍 CookbookView - Loading recipes for notebook:',
        newNotebook._id,
        'recipe IDs:',
        newNotebook.recipes,
      )
      const loadedRecipes = await recipeStore.loadRecipesByIds(newNotebook.recipes)
      recipes.value = loadedRecipes
      console.log('🔍 CookbookView - Loaded recipes:', loadedRecipes)
    } else {
      recipes.value = []
    }
  },
  { immediate: true },
)

const availableRecipes = computed(() => {
  // Recipes that are not already in this cookbook
  const cookbookRecipeIds = currentNotebook.value?.recipes || []
  return recipeStore.userRecipes.filter((recipe) => !cookbookRecipeIds.includes(recipe._id))
})

const availableTags = computed(() => {
  const allTags = new Set<string>()
  recipes.value.forEach((recipe) => {
    recipe.tags.forEach((tag) => allTags.add(tag))
  })
  return Array.from(allTags).sort()
})

const filteredRecipes = computed(() => {
  let filtered = recipes.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(query)),
    )
  }

  // Filter by selected tags
  if (selectedTags.value.length > 0) {
    filtered = filtered.filter((recipe) =>
      selectedTags.value.every((tag) => recipe.tags.includes(tag)),
    )
  }

  return filtered
})

function toggleTagFilter(tag: string) {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

function getVersionInfo(recipeId: string) {
  // In a real app, you'd get the latest version for this recipe
  return null
}

function getForkCount(recipeId: string) {
  // In a real app, you'd count versions for this recipe
  return Math.floor(Math.random() * 5) // Placeholder
}

function getAnnotationCount(recipeId: string) {
  // In a real app, you'd count annotations for this recipe
  return Math.floor(Math.random() * 3) // Placeholder
}

function isRecipeFavorited(recipeId: string) {
  // In a real app, you'd check user's favorites
  return Math.random() > 0.7 // Placeholder
}

function handleFavoriteToggle(recipeId: string) {
  console.log('Toggle favorite for recipe:', recipeId)
  // In a real app, you'd update the favorite status
}

function handleShareRequest(recipe: Recipe) {
  console.log('Share recipe:', recipe)
  // In a real app, you'd open a share modal
}

function closeAddRecipe() {
  showAddRecipe.value = false
}

function closeShareModal() {
  showShareModal.value = false
  // Reset invitation form
  inviteEmail.value = ''
  inviteMessage.value = ''
  inviteError.value = ''
  inviteSuccess.value = ''
}

function addRecipeToCookbook(recipe: Recipe) {
  if (!currentNotebook.value) return

  // In a real app, you'd call the API to add the recipe to the cookbook
  console.log('Adding recipe to cookbook:', recipe._id, currentNotebook.value._id)
  closeAddRecipe()
}

function goToCreateRecipe() {
  router.push('/recipes')
  closeAddRecipe()
}

function copyShareLink() {
  // In a real app, you'd generate and copy a share link
  navigator.clipboard.writeText(window.location.href)
  console.log('Share link copied')
}

function inviteByEmail() {
  // This function is no longer needed since we have the email form in the modal
  console.log('Invite by email')
}

async function sendEmailInvitation() {
  if (!inviteEmail.value || !currentNotebook.value || !authStore.userId) return

  isInviting.value = true
  inviteError.value = ''
  inviteSuccess.value = ''

  try {
    // Get user ID by email first
    const userId = await authStore.getUserIDByEmail(inviteEmail.value)

    if (!userId || userId === '') {
      inviteError.value = 'No user found with that email address'
      return
    }

    // Invite the user to the notebook
    await notebookStore.inviteMember({
      owner: authStore.userId,
      notebook: currentNotebook.value._id,
      member: userId,
    })

    inviteSuccess.value = `Invitation sent to ${inviteEmail.value}!`
    inviteEmail.value = ''
    inviteMessage.value = ''

    // Close modal after 2 seconds
    setTimeout(() => {
      closeShareModal()
    }, 2000)
  } catch (error) {
    console.error('Failed to send invitation:', error)
    if (error instanceof Error && error.message.includes('404')) {
      inviteError.value = 'No user found with that email address'
    } else {
      inviteError.value = 'Failed to send invitation. Please try again.'
    }
  } finally {
    isInviting.value = false
  }
}

// Watch for notebook changes and load related data
watch(
  currentNotebook,
  async (newNotebook) => {
    if (newNotebook) {
      // Load versions and annotations for recipes in this cookbook
      for (const recipeId of newNotebook.recipes || []) {
        await versionStore.loadVersionsByRecipe(recipeId)
        await annotationStore.loadAnnotationsForRecipe(recipeId)
      }
    }
  },
  { immediate: true },
)

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await recipeStore.loadUserRecipes()
    await notebookStore.loadUserNotebooks()
  }
})
</script>

<style scoped>
.cookbook-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.cookbook-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e1e5e9;
}

.cookbook-info h1 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 32px;
  font-weight: 600;
}

.cookbook-description {
  color: #666;
  font-size: 16px;
  margin-bottom: 15px;
  line-height: 1.5;
}

.cookbook-meta {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #888;
}

.cookbook-actions {
  display: flex;
  gap: 10px;
}

.add-recipe-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.add-recipe-btn:hover {
  opacity: 0.9;
}

.share-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
}

.share-btn:hover {
  background: #e9ecef;
}

.filter-section {
  margin-bottom: 30px;
}

.search-bar {
  position: relative;
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: #666;
}

.tag-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-filter {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tag-filter:hover {
  background: #e9ecef;
}

.tag-filter.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #666;
  font-size: 18px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 24px;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
}

.recipes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
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
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal h3 {
  margin-bottom: 20px;
  color: #333;
  font-size: 24px;
}

.recipe-selection {
  margin-bottom: 20px;
}

.no-recipes {
  text-align: center;
  padding: 40px;
  color: #666;
}

.create-recipe-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 15px;
}

.recipe-list {
  max-height: 300px;
  overflow-y: auto;
}

.recipe-option {
  padding: 15px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.recipe-option:hover {
  background-color: #f8f9fa;
}

.recipe-option h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 16px;
}

.recipe-option p {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
}

.recipe-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  background: #e1e5e9;
  color: #555;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 11px;
}

.share-content {
  margin-bottom: 20px;
}

.share-content p {
  margin-bottom: 20px;
  color: #666;
}

.share-options {
  display: flex;
  gap: 10px;
}

.share-option {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.share-option:hover {
  background: #e9ecef;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.cancel-btn {
  background: #ddd;
  color: #333;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .cookbook-header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }

  .cookbook-actions {
    justify-content: center;
  }

  .cookbook-meta {
    flex-direction: column;
    gap: 5px;
  }

  .recipes-grid {
    grid-template-columns: 1fr;
  }
}

/* Email Invitation Form Styles */
.email-invitation-form {
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
}

.email-invitation-form h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #555;
  font-weight: 500;
  font-size: 14px;
}

.email-input,
.message-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.email-input:focus,
.message-input:focus {
  outline: none;
  border-color: #667eea;
}

.message-input {
  resize: vertical;
  min-height: 80px;
}

.send-invite-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-invite-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.send-invite-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  margin-top: 10px;
  padding: 8px 12px;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  font-size: 14px;
}

.success-message {
  margin-top: 10px;
  padding: 8px 12px;
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  border-radius: 4px;
  font-size: 14px;
}
</style>
