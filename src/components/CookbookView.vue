<template>
  <div class="cookbook-view">
    <div class="cookbook-header">
      <div class="cookbook-info">
        <h1>{{ currentNotebook?.title || ' ' }}</h1>
        <p v-if="currentNotebook?.description" class="cookbook-description">
          {{ currentNotebook.description }}
        </p>
        <div class="cookbook-meta">
          <span>{{ recipes.length }} recipes</span>
          <span>{{ currentNotebook?.members?.length || 0 }} members</span>
        </div>
      </div>

      <div class="cookbook-actions">
        <button @click="createRecipe" class="add-recipe-btn">+ Create Recipe</button>
        <button @click="showShareModal = true" class="share-btn">
          <Share2 :size="16" />
          <span>Share</span>
        </button>
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
        <Search :size="18" class="search-icon" />
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
      <div class="empty-icon">
        <BookOpenText :size="48" :stroke-width="1.5" />
      </div>
      <h3>No recipes found</h3>
      <p v-if="searchQuery || selectedTags.length > 0">Try adjusting your search or filters</p>
      <p v-else>Add your first recipe to this cookbook!</p>
    </div>

    <div v-else class="recipes-grid">
      <RecipeCard
        v-for="recipe in filteredRecipes"
        :key="recipe._id"
        :recipe="recipe"
        :fork-count="forkCounts[recipe._id] || 0"
        :can-delete="canDeleteRecipe(recipe)"
        @share-requested="handleShareRequest"
        @delete-requested="handleRecipeDelete"
      />
    </div>

    <!-- Share Modal -->
    <div v-if="showShareModal" class="modal-overlay" @click="closeShareModal">
      <div class="modal" @click.stop>
        <h3>Share "{{ currentNotebook?.title }}"</h3>

        <div class="invite-section">
          <input
            v-model="inviteUsername"
            type="text"
            id="inviteUsername"
            placeholder="Enter username"
            class="email-input"
            :disabled="isInviting"
          />
        </div>

        <div v-if="otherMembers.length > 0">
          <h4><b>People with access</b></h4>
          <div class="people-list">
            <div class="person" v-for="member in otherMembers" :key="member.id">
              <span>{{ member.username }} ({{ member.name }})</span>
            </div>
          </div>
        </div>

        <div v-if="inviteError" class="error-message">{{ inviteError }}</div>
        <div v-if="inviteSuccess" class="success-message">{{ inviteSuccess }}</div>

        <div class="form-actions">
          <button @click="closeShareModal" class="cancel-btn">Close</button>
          <button
            @click="sendUsernameInvitation"
            class="send-invite-btn"
            :disabled="!inviteUsername || isInviting"
          >
            {{ isInviting ? 'Sending...' : 'Invite' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOpenText, Search, Share2 } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/services/api'
import { useAnnotationStore } from '@/stores/annotation'
import { useAuthStore } from '@/stores/auth'
import { useNotebookStore } from '@/stores/notebook'
import { useRecipeStore } from '@/stores/recipe'
import type { Notebook, Recipe } from '@/types/api'
import RecipeCard from './RecipeCard.vue'

void BookOpenText
void Search
void Share2
void RecipeCard

interface Props {
  notebook?: Notebook | null
}

const props = defineProps<Props>()
const router = useRouter()

const notebookStore = useNotebookStore()
const recipeStore = useRecipeStore()
const annotationStore = useAnnotationStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const showShareModal = ref(false)

// Email invitation state
const inviteUsername = ref('')
const isInviting = ref(false)
const inviteError = ref('')
const inviteSuccess = ref('')

// Member details state
const memberDetails = ref<Array<{ id: string; username: string; name: string }>>([])

// Filtered members excluding the current user
const otherMembers = computed(() => {
  if (!authStore.userId) return memberDetails.value
  return memberDetails.value.filter((member) => member.id !== authStore.userId)
})

const isLoading = computed(() => notebookStore.isLoading || recipeStore.isLoading)

const currentNotebook = computed(() => props.notebook || notebookStore.currentNotebook)
const recipes = ref<Recipe[]>([])
const forkCounts = ref<Record<string, number>>({})

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
      recipes.value = Array.isArray(loadedRecipes)
        ? loadedRecipes.filter((recipe): recipe is Recipe => Boolean(recipe))
        : []
      console.log('🔍 CookbookView - Loaded recipes:', loadedRecipes)

      // Load fork counts for all recipes
      await loadForkCounts(loadedRecipes)
    } else {
      recipes.value = []
      forkCounts.value = {}
    }
  },
  { immediate: true },
)

const availableTags = computed(() => {
  const allTags = new Set<string>()
  const recipeList = Array.isArray(recipes.value) ? recipes.value : []
  recipeList.forEach((recipe) => {
    if (!recipe) return
    const tags = Array.isArray(recipe.tags) ? recipe.tags : []
    tags.forEach((tag) => allTags.add(tag))
  })
  return Array.from(allTags).sort()
})

const filteredRecipes = computed(() => {
  const recipeList = Array.isArray(recipes.value) ? recipes.value : []
  let filtered = recipeList.filter((recipe): recipe is Recipe => Boolean(recipe))

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        (Array.isArray(recipe.tags) &&
          recipe.tags.some((tag) => tag.toLowerCase().includes(query))),
    )
  }

  // Filter by selected tags
  if (selectedTags.value.length > 0) {
    filtered = filtered.filter((recipe) =>
      selectedTags.value.every((tag) => Array.isArray(recipe.tags) && recipe.tags.includes(tag)),
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

function canDeleteRecipe(recipe: Recipe): boolean {
  if (!authStore.userId) return false
  return recipe.owner === authStore.userId
}

async function loadForkCounts(recipesToLoad: Recipe[]) {
  // Load fork counts for all recipes in parallel
  const counts: Record<string, number> = {}
  const list = Array.isArray(recipesToLoad) ? recipesToLoad : []
  await Promise.all(
    list
      .filter((recipe): recipe is Recipe => Boolean(recipe))
      .map(async (recipe) => {
        try {
          counts[recipe._id] = await recipeStore.getForkCount(recipe._id)
        } catch (error) {
          console.error(`Failed to get fork count for ${recipe._id}:`, error)
          counts[recipe._id] = 0
        }
      }),
  )
  forkCounts.value = counts
}

// Removed placeholder counts/favorites; card will not display them without real data

function handleShareRequest(recipe: Recipe) {
  console.log('Share recipe:', recipe)
  // In a real app, you'd open a share modal
}

async function handleRecipeDelete(recipe: Recipe) {
  if (!recipe || !recipe._id) return
  const confirmDelete = window.confirm(
    `Are you sure you want to delete "${recipe.title}"? This action cannot be undone.`,
  )

  if (!confirmDelete) return

  try {
    await recipeStore.deleteRecipe(recipe._id)

    recipes.value = recipes.value.filter((r) => r._id !== recipe._id)
    const updatedCounts = { ...forkCounts.value }
    delete updatedCounts[recipe._id]
    forkCounts.value = updatedCounts

    if (currentNotebook.value?._id) {
      await notebookStore.loadNotebookById(currentNotebook.value._id)
    }
  } catch (error) {
    console.error('Failed to delete recipe:', error)
    alert('Failed to delete recipe. Please try again.')
  }
}

function closeShareModal() {
  showShareModal.value = false
  // Reset invitation form
  inviteUsername.value = ''
  inviteError.value = ''
  inviteSuccess.value = ''
  memberDetails.value = []
}

async function loadMemberDetails() {
  if (!currentNotebook.value?.members) {
    memberDetails.value = []
    return
  }

  try {
    const details = await Promise.all(
      currentNotebook.value.members.map(async (memberId: string) => {
        try {
          const user = await authStore.getUserDetails(memberId)
          return {
            id: memberId,
            username: user.username,
            name: user.name,
          }
        } catch (err) {
          console.error(`Failed to load details for member ${memberId}:`, err)
          return {
            id: memberId,
            username: memberId,
            name: 'Unknown',
          }
        }
      }),
    )
    memberDetails.value = details
  } catch (err) {
    console.error('Failed to load member details:', err)
    memberDetails.value = []
  }
}

function createRecipe() {
  console.log('🔍 createRecipe - currentNotebook.value:', currentNotebook.value)
  console.log('🔍 createRecipe - currentNotebook.value?._id:', currentNotebook.value?._id)
  if (!currentNotebook.value) {
    console.error('❌ createRecipe - No current notebook!')
    return
  }
  if (!currentNotebook.value._id) {
    console.error('❌ createRecipe - Notebook has no _id!')
    return
  }
  console.log(
    '🔍 createRecipe - navigating to:',
    `/recipes/create?notebookId=${currentNotebook.value._id}`,
  )
  router.push(`/recipes/create?notebookId=${currentNotebook.value._id}`)
}

// removed unused copyShareLink and inviteByEmail helpers

async function sendUsernameInvitation() {
  if (!inviteUsername.value || !currentNotebook.value || !authStore.userId) return

  isInviting.value = true
  inviteError.value = ''
  inviteSuccess.value = ''

  try {
    // Get user ID by username first
    const username = inviteUsername.value.trim()
    if (!username) {
      inviteError.value = 'Enter a username to invite.'
      return
    }

    const userId = await authStore.getUserIDByUsername(username)

    if (!userId || userId === '') {
      inviteError.value = `User "${username}" was not found.`
      return
    }

    // Invite the user to the notebook (backend derives owner from session)
    await notebookStore.inviteMember({
      notebook: currentNotebook.value._id,
      member: userId,
    })

    inviteSuccess.value = `${username} has been added to this cookbook!`
    inviteUsername.value = ''

    // Reload the notebook to get updated members list
    if (currentNotebook.value) {
      await notebookStore.loadNotebookById(currentNotebook.value._id)
      // Reload member details to show the new member
      await loadMemberDetails()
    }

    // Close modal after 2 seconds
    setTimeout(() => {
      closeShareModal()
    }, 2000)
  } catch (error) {
    console.error('Failed to send invitation:', error)
    if (error instanceof ApiError && error.status === 404) {
      inviteError.value = 'No user found with that username'
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
      // Load annotations for recipes in this cookbook
      for (const recipeId of newNotebook.recipes || []) {
        await annotationStore.loadAnnotationsForRecipe(recipeId)
      }
    }
  },
  { immediate: true },
)

// Watch for share modal opening to load member details
watch(showShareModal, async (isOpen) => {
  if (isOpen) {
    await loadMemberDetails()
  }
})

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await recipeStore.loadUserRecipes()
    await notebookStore.loadUserNotebooks()
  }
})

defineExpose({
  availableTags,
  filteredRecipes,
  toggleTagFilter,
  canDeleteRecipe,
  handleShareRequest,
  handleRecipeDelete,
  createRecipe,
  sendUsernameInvitation,
  otherMembers,
  isLoading,
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

.cookbook-actions button {
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

.cookbook-actions button:hover,
.cookbook-actions button:focus-visible {
  color: var(--brand-indigo-600);
  text-decoration: underline;
}

.cookbook-actions button:focus-visible {
  outline: none;
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
  border-color: var(--color-primary);
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  pointer-events: none;
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
  background: var(--brand-indigo-500);
  color: white;
  border-color: var(--brand-indigo-500);
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
  margin-bottom: 20px;
  color: var(--brand-indigo-500);
  opacity: 0.5;
  display: flex;
  justify-content: center;
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

.modal h4 {
  margin: 20px 0 10px 0;
  color: var(--brand-orange-500);
  font-size: 18px;
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

/* removed share-content/option sections */

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.cancel-btn {
  color: #6c757d;
  margin-right: 8px;
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
.email-invitation {
  margin-top: 20px;
  padding: 20px;
  background: var(--color-background-soft);
  border-radius: 8px;
  border: 1px solid var(--color-border);
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

.email-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.email-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.invite-section {
  margin: 20px 0;
}

.send-invite-btn {
  color: var(--brand-indigo-500);
}

.send-invite-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-invite-btn:disabled:hover {
  text-decoration: none;
}

.error-message {
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(211, 93, 43, 0.12);
  color: var(--color-danger);
  border: 1px solid rgba(211, 93, 43, 0.3);
  border-radius: 4px;
  font-size: 14px;
}

.success-message {
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(184, 220, 219, 0.2);
  color: var(--color-success);
  border: 1px solid rgba(184, 220, 219, 0.4);
  border-radius: 4px;
  font-size: 14px;
}
</style>
