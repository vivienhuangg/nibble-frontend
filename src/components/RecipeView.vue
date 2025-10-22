<template>
  <div class="recipe-view">
    <div class="recipe-header">
      <div class="breadcrumb">
        <button @click="goBack" class="back-btn">← Back</button>
        <span class="separator">/</span>
        <span class="cookbook-name">{{ currentNotebook?.title || 'Cookbook' }}</span>
      </div>

      <div class="recipe-actions">
        <button @click="showVersionView = true" class="version-btn">📝 Versions</button>
        <button @click="toggleEditMode" class="edit-mode-btn" :class="{ active: editMode }">
          {{ editMode ? '💾 Save' : '✏️ Edit' }}
        </button>
        <button
          @click="forkRecipe"
          :disabled="isOwnRecipe"
          :title="isOwnRecipe ? 'You can\'t fork your own recipe!' : 'Create a copy of this recipe'"
          class="fork-btn"
          :class="{ disabled: isOwnRecipe }"
        >
          🍴 Fork
        </button>
        <button @click="shareRecipe" class="share-btn">📤 Share</button>
      </div>
    </div>

    <div v-if="isLoading" class="loading">Loading recipe...</div>

    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-else-if="currentRecipe" class="recipe-content">
      <!-- Recipe Title and Meta -->
      <div class="recipe-info">
        <h1
          v-if="!editingTitle"
          @click="startEditingTitle"
          @mouseenter="showEditHint = 'title'"
          @mouseleave="showEditHint = null"
          class="editable-title"
          :class="{ 'can-edit': isOwnRecipe && editMode }"
        >
          {{ currentRecipe.title }}
          <span v-if="showEditHint === 'title' && isOwnRecipe && editMode" class="edit-hint"
            >✏️</span
          >
        </h1>
        <input
          v-else
          v-model="editingTitleValue"
          @blur="saveTitle"
          @keydown.enter="saveTitle"
          @keydown.escape="cancelEditTitle"
          class="editable-input title-input"
          ref="titleInput"
        />

        <!-- Save indicator -->
        <div v-if="isOwnRecipe" class="save-indicator">
          <span v-if="isSaving" class="saving-indicator">💾 Saving...</span>
          <span v-else-if="hasUnsavedChanges" class="unsaved-indicator">● Unsaved changes</span>
          <span v-else class="saved-indicator">✓ Saved</span>
        </div>

        <div
          v-if="!editingDescription && currentRecipe.description"
          @click="startEditingDescription"
          @mouseenter="showEditHint = 'description'"
          @mouseleave="showEditHint = null"
          class="editable-description"
          :class="{ 'can-edit': isOwnRecipe && editMode }"
        >
          {{ currentRecipe.description }}
          <span v-if="showEditHint === 'description' && isOwnRecipe && editMode" class="edit-hint"
            >✏️</span
          >
        </div>
        <textarea
          v-else-if="editingDescription"
          v-model="editingDescriptionValue"
          @blur="saveDescription"
          @keydown.escape="cancelEditDescription"
          class="editable-textarea description-input"
          ref="descriptionInput"
          rows="3"
        ></textarea>
        <div
          v-else-if="!currentRecipe.description && isOwnRecipe && editMode"
          @click="startEditingDescription"
          @mouseenter="showEditHint = 'description'"
          @mouseleave="showEditHint = null"
          class="editable-description placeholder"
        >
          Click to add description...
          <span v-if="showEditHint === 'description'" class="edit-hint">✏️</span>
        </div>

        <div class="recipe-meta">
          <div class="version-info">
            <span class="version-number">v{{ latestVersion?.versionNum || '1.0' }}</span>
            <span class="version-author"> by {{ authorName }}</span>
            <span class="version-date">{{
              formatDate(latestVersion?.created || currentRecipe.updated)
            }}</span>
          </div>

          <div class="recipe-stats">
            <span class="fork-count">{{ versionCount }} forks</span>
            <span class="annotation-count">{{ annotationCount }} comments</span>
          </div>
        </div>

        <div v-if="currentRecipe.tags && currentRecipe.tags.length > 0" class="recipe-tags">
          <span v-for="tag in currentRecipe.tags" :key="tag" class="tag">
            {{ tag }}
          </span>
        </div>

        <div v-if="sharedUsers.length > 0" class="sharing-info">
          <span class="sharing-label">Currently shared with:</span>
          <div class="shared-users">
            <span v-for="user in sharedUsers" :key="user._id" class="shared-user">
              {{ user.name }}
            </span>
          </div>
        </div>
        <div v-else class="sharing-info">
          <span class="sharing-label">Not currently shared</span>
        </div>
      </div>

      <!-- Ingredients Section -->
      <section class="ingredients-section">
        <h2>Ingredients</h2>
        <div v-if="displayIngredients.length === 0 && !isOwnRecipe" class="debug-info">
          Debug: No ingredients found. displayIngredients length: {{ displayIngredients.length }}
        </div>
        <div
          v-else-if="displayIngredients.length === 0 && isOwnRecipe && editMode"
          class="empty-state"
        >
          <div @click="addNewIngredient" class="add-ingredient-placeholder">
            + Add first ingredient
          </div>
        </div>
        <div class="ingredients-list">
          <div
            v-for="(ingredient, index) in displayIngredients"
            :key="index"
            class="ingredient-item"
            :class="{ 'can-edit': isOwnRecipe && editMode }"
            @mouseenter="showEditHint = `ingredient-${index}`"
            @mouseleave="showEditHint = null"
          >
            <div
              v-if="editingIngredient !== index"
              @click="startEditingIngredient(index)"
              class="ingredient-content editable-ingredient"
            >
              <span class="ingredient-quantity">{{ ingredient.quantity || 'Amount' }}</span>
              <span v-if="ingredient.unit" class="ingredient-unit">{{ ingredient.unit }}</span>
              <span class="ingredient-name">{{ ingredient.name }}</span>
              <span v-if="ingredient.notes" class="ingredient-notes">({{ ingredient.notes }})</span>
              <span
                v-if="showEditHint === `ingredient-${index}` && isOwnRecipe && editMode"
                class="edit-hint"
                >✏️</span
              >
            </div>
            <div v-else class="ingredient-edit-form">
              <input
                v-model="editingIngredientValue.name"
                @blur="saveIngredient(index)"
                @keydown.enter="saveIngredient(index)"
                @keydown.escape="cancelEditIngredient"
                class="editable-input ingredient-name-input"
                placeholder="Ingredient name"
                ref="ingredientNameInput"
              />
              <input
                v-model="editingIngredientValue.quantity"
                @blur="saveIngredient(index)"
                @keydown.enter="saveIngredient(index)"
                @keydown.escape="cancelEditIngredient"
                class="editable-input ingredient-quantity-input"
                placeholder="Amount"
              />
              <input
                v-model="editingIngredientValue.unit"
                @blur="saveIngredient(index)"
                @keydown.enter="saveIngredient(index)"
                @keydown.escape="cancelEditIngredient"
                class="editable-input ingredient-unit-input"
                placeholder="Unit"
              />
              <input
                v-model="editingIngredientValue.notes"
                @blur="saveIngredient(index)"
                @keydown.enter="saveIngredient(index)"
                @keydown.escape="cancelEditIngredient"
                class="editable-input ingredient-notes-input"
                placeholder="Notes"
              />
              <button @click="removeIngredient(index)" class="remove-ingredient-btn">×</button>
            </div>
            <AnnotationSystem
              :recipe-id="currentRecipe._id"
              target-kind="Ingredient"
              :target-index="index"
            />
          </div>
          <div v-if="isOwnRecipe && editMode" class="add-ingredient-btn" @click="addNewIngredient">
            + Add ingredient
          </div>
        </div>
      </section>

      <!-- Steps Section -->
      <section class="steps-section">
        <h2>Instructions</h2>
        <div v-if="displaySteps.length === 0 && !isOwnRecipe" class="debug-info">
          Debug: No steps found. displaySteps length: {{ displaySteps.length }}
        </div>
        <div v-else-if="displaySteps.length === 0 && isOwnRecipe && editMode" class="empty-state">
          <div @click="addNewStep" class="add-step-placeholder">+ Add first step</div>
        </div>
        <div class="steps-list">
          <div
            v-for="(step, index) in displaySteps"
            :key="index"
            class="step-item"
            :class="{ 'can-edit': isOwnRecipe && editMode }"
            @mouseenter="showEditHint = `step-${index}`"
            @mouseleave="showEditHint = null"
          >
            <div class="step-number">{{ index + 1 }}</div>
            <div
              v-if="editingStep !== index"
              @click="startEditingStep(index)"
              class="step-content editable-step"
            >
              <p class="step-description">{{ step.description }}</p>
              <div v-if="step.duration" class="step-duration">
                Duration: {{ step.duration }} minutes
              </div>
              <div v-if="step.notes" class="step-notes">Note: {{ step.notes }}</div>
              <span
                v-if="showEditHint === `step-${index}` && isOwnRecipe && editMode"
                class="edit-hint"
                >✏️</span
              >
            </div>
            <div v-else class="step-edit-form">
              <textarea
                v-model="editingStepValue.description"
                @blur="saveStep(index)"
                @keydown.escape="cancelEditStep"
                class="editable-textarea step-description-input"
                placeholder="Step description"
                ref="stepDescriptionInput"
                rows="2"
              ></textarea>
              <input
                v-model.number="editingStepValue.duration"
                @blur="saveStep(index)"
                @keydown.escape="cancelEditStep"
                class="editable-input step-duration-input"
                placeholder="Duration (minutes)"
                type="number"
                min="0"
              />
              <input
                v-model="editingStepValue.notes"
                @blur="saveStep(index)"
                @keydown.escape="cancelEditStep"
                class="editable-input step-notes-input"
                placeholder="Notes (optional)"
              />
              <button @click="removeStep(index)" class="remove-step-btn">×</button>
            </div>
            <AnnotationSystem
              :recipe-id="currentRecipe._id"
              target-kind="Step"
              :target-index="index"
            />
          </div>
          <div v-if="isOwnRecipe && editMode" class="add-step-btn" @click="addNewStep">
            + Add step
          </div>
        </div>
      </section>
    </div>

    <!-- Version View Sidebar -->
    <div v-if="showVersionView" class="version-sidebar">
      <div class="sidebar-header">
        <h3>Version History</h3>
        <button @click="showVersionView = false" class="close-btn">×</button>
      </div>
      <VersionView :recipe-id="currentRecipe?._id || ''" />
    </div>

    <!-- Version Sidebar Overlay -->
    <div v-if="showVersionView" class="sidebar-overlay" @click="showVersionView = false"></div>

    <!-- Share Modal -->
    <div v-if="showShareModal" class="share-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Share Recipe</h3>
          <button @click="showShareModal = false" class="close-btn">×</button>
        </div>

        <div class="modal-body">
          <p>Add this recipe to one of your notebooks:</p>

          <div v-if="availableNotebooks.length === 0" class="no-notebooks">
            <p>You don't have any notebooks yet.</p>
            <button @click="showCreateForm = true" class="create-notebook-btn">
              Create a new notebook
            </button>
          </div>

          <!-- Create Notebook Form -->
          <div v-if="showCreateForm" class="create-notebook-form">
            <h4>Create New Notebook</h4>
            <form @submit.prevent="createAndShareNotebook">
              <div class="form-group">
                <label for="notebook-title">Title</label>
                <input
                  id="notebook-title"
                  v-model="newNotebook.title"
                  type="text"
                  placeholder="Enter notebook title"
                  required
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label for="notebook-description">Description (optional)</label>
                <textarea
                  id="notebook-description"
                  v-model="newNotebook.description"
                  placeholder="Enter notebook description"
                  class="form-textarea"
                  rows="3"
                ></textarea>
              </div>
              <div class="form-actions">
                <button type="button" @click="cancelCreateNotebook" class="cancel-btn">
                  Cancel
                </button>
                <button type="submit" :disabled="isCreating" class="create-btn">
                  {{ isCreating ? 'Creating...' : 'Create & Share' }}
                </button>
              </div>
            </form>
          </div>

          <div v-else class="notebooks-list">
            <div
              v-for="notebook in availableNotebooks"
              :key="notebook._id"
              class="notebook-item"
              :class="{ 'already-shared': isRecipeInNotebook(notebook) }"
            >
              <div class="notebook-info">
                <h4>{{ notebook.title }}</h4>
                <p v-if="notebook.description">{{ notebook.description }}</p>
                <span class="member-count"
                  >{{ notebook.members.length }} member{{
                    notebook.members.length !== 1 ? 's' : ''
                  }}</span
                >
              </div>

              <div class="notebook-actions">
                <span v-if="isRecipeInNotebook(notebook)" class="already-shared-badge">
                  ✓ Already shared
                </span>
                <button
                  v-else
                  @click="shareToNotebook(notebook)"
                  :disabled="isSharing"
                  class="share-to-notebook-btn"
                >
                  {{ isSharing ? 'Sharing...' : 'Add to notebook' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Share Modal Overlay -->
    <div v-if="showShareModal" class="modal-overlay" @click="showShareModal = false"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAnnotationStore } from '@/stores/annotation'
import { useAuthStore } from '@/stores/auth'
import { useNotebookStore } from '@/stores/notebook'
import { useRecipeStore } from '@/stores/recipe'
import { useVersionStore } from '@/stores/version'
import type { Notebook, User } from '@/types/api'
import AnnotationSystem from './AnnotationSystem.vue'
import VersionView from './VersionView.vue'

const route = useRoute()
const router = useRouter()
const recipeStore = useRecipeStore()
const notebookStore = useNotebookStore()
const versionStore = useVersionStore()
const annotationStore = useAnnotationStore()
const authStore = useAuthStore()

const showVersionView = ref(false)
const sharedUsers = ref<User[]>([])
const userDetailsCache = ref<Map<string, User>>(new Map())
const authorName = ref<string>('Loading...')
const showShareModal = ref(false)
const isSharing = ref(false)
const showCreateForm = ref(false)
const isCreating = ref(false)
const newNotebook = ref({
  title: '',
  description: '',
})

// Inline editing state
const editMode = ref(false)
const showEditHint = ref<string | null>(null)
const editingTitle = ref(false)
const editingDescription = ref(false)
const editingIngredient = ref<number | null>(null)
const editingStep = ref<number | null>(null)
const editingTitleValue = ref('')
const editingDescriptionValue = ref('')
const editingIngredientValue = ref({
  name: '',
  quantity: '',
  unit: '',
  notes: '',
})
const editingStepValue = ref({ description: '', duration: 0, notes: '' })
const isSaving = ref(false)

// Local state for smooth editing
const localIngredients = ref<
  Array<{ name: string; quantity: string; unit: string; notes: string }>
>([])
const localSteps = ref<Array<{ description: string; duration: number; notes: string }>>([])
const hasUnsavedChanges = ref(false)

const isLoading = computed(
  () => recipeStore.isLoading || versionStore.isLoading || annotationStore.isLoading,
)
const error = computed(() => recipeStore.error)
const currentRecipe = computed(() => recipeStore.currentRecipe)
const currentNotebook = computed(() => notebookStore.currentNotebook)

const versions = computed(() =>
  currentRecipe.value ? versionStore.versionsByRecipe(currentRecipe.value._id) : [],
)

const latestVersion = computed(() => {
  if (versions.value.length === 0) return null
  return versions.value.reduce((latest, version) =>
    parseFloat(version.versionNum) > parseFloat(latest.versionNum) ? version : latest,
  )
})

const versionCount = computed(() => versions.value.length)
const annotationCount = computed(() =>
  currentRecipe.value ? annotationStore.annotationsByRecipe(currentRecipe.value._id).length : 0,
)

const displayIngredients = computed(() => {
  // Use local state if available, otherwise fall back to recipe store
  if (localIngredients.value.length > 0) {
    return localIngredients.value
  }

  console.log('🔍 displayIngredients - currentRecipe:', currentRecipe.value)
  console.log('🔍 displayIngredients - latestVersion:', latestVersion.value)

  if (latestVersion.value) {
    console.log(
      '🔍 displayIngredients - using latestVersion ingredients:',
      latestVersion.value.ingredients,
    )
    return latestVersion.value.ingredients
  }

  const recipeIngredients = currentRecipe.value?.ingredients || []
  console.log('🔍 displayIngredients - using recipe ingredients:', recipeIngredients)
  return recipeIngredients
})

const displaySteps = computed(() => {
  // Use local state if available, otherwise fall back to recipe store
  if (localSteps.value.length > 0) {
    return localSteps.value
  }

  console.log('🔍 displaySteps - currentRecipe:', currentRecipe.value)
  console.log('🔍 displaySteps - latestVersion:', latestVersion.value)

  if (latestVersion.value) {
    console.log('🔍 displaySteps - using latestVersion steps:', latestVersion.value.steps)
    return latestVersion.value.steps
  }

  const recipeSteps = currentRecipe.value?.steps || []
  console.log('🔍 displaySteps - using recipe steps:', recipeSteps)
  return recipeSteps
})

const availableNotebooks = computed(() => {
  return notebookStore.userNotebooks
})

const isOwnRecipe = computed(() => {
  return currentRecipe.value?.owner === authStore.userId
})

function isRecipeInNotebook(notebook: Notebook): boolean {
  if (!currentRecipe.value) return false
  return notebook.recipes.includes(currentRecipe.value._id)
}

function goBack() {
  if (currentNotebook.value) {
    router.push(`/cookbook/${currentNotebook.value._id}`)
  } else {
    router.push('/recipes')
  }
}

function shareRecipe() {
  showShareModal.value = true
}

async function forkRecipe() {
  if (!currentRecipe.value || !authStore.userId || isOwnRecipe.value) return

  try {
    // Create a new recipe based on the current one
    const forkedRecipe = {
      title: `${currentRecipe.value.title} (Fork)`,
      description: currentRecipe.value.description,
      ingredients: currentRecipe.value.ingredients,
      steps: currentRecipe.value.steps,
      tags: [...(currentRecipe.value.tags || [])],
      owner: authStore.userId,
      // Don't copy the original recipe's ID, let the API generate a new one
    }

    console.log('🍴 Forking recipe:', forkedRecipe)

    // Call the recipe store to create the forked recipe
    const newRecipeId = await recipeStore.createRecipe(forkedRecipe)

    console.log('🍴 Recipe forked successfully, new ID:', newRecipeId)

    // Navigate to the new recipe
    router.push(`/recipe/${newRecipeId}`)
  } catch (error) {
    console.error('Failed to fork recipe:', error)
    // You could add a toast notification here
  }
}

// Initialize local state from recipe data
function initializeLocalState() {
  if (!currentRecipe.value) return

  // Initialize local ingredients
  localIngredients.value = (currentRecipe.value.ingredients || []).map((ing) => ({
    name: ing.name || '',
    quantity: ing.quantity || '',
    unit: ing.unit || '',
    notes: ing.notes || '',
  }))

  // Initialize local steps
  localSteps.value = (currentRecipe.value.steps || []).map((step) => ({
    description: step.description || '',
    duration: step.duration || 0,
    notes: step.notes || '',
  }))

  hasUnsavedChanges.value = false
}

// Inline editing functions
function toggleEditMode() {
  if (!isOwnRecipe.value) return

  if (editMode.value) {
    // Exiting edit mode - save all changes
    saveAllChanges()
  } else {
    // Entering edit mode - initialize local state
    initializeLocalState()
  }

  editMode.value = !editMode.value
}

async function saveAllChanges() {
  if (!currentRecipe.value || !authStore.userId) return

  isSaving.value = true

  try {
    const updatedRecipe = {
      owner: currentRecipe.value.owner,
      recipe: currentRecipe.value._id,
      newTitle: editingTitleValue.value || currentRecipe.value.title,
      newDescription: editingDescriptionValue.value || currentRecipe.value.description,
      newIngredients: localIngredients.value.filter((ing) => ing.name.trim() !== ''),
      newSteps: localSteps.value.filter((step) => step.description.trim() !== ''),
    }

    console.log('💾 Saving all changes:', updatedRecipe)

    await recipeStore.updateRecipe(currentRecipe.value._id, updatedRecipe)

    console.log('💾 All changes saved successfully')
    hasUnsavedChanges.value = false
  } catch (error) {
    console.error('Failed to save changes:', error)
  } finally {
    isSaving.value = false
  }
}

function startEditingTitle() {
  if (!isOwnRecipe.value || !editMode.value) return
  editingTitle.value = true
  editingTitleValue.value = currentRecipe.value?.title || ''
  nextTick(() => {
    const input = document.querySelector('.title-input') as HTMLInputElement
    input?.focus()
    input?.select()
  })
}

function saveTitle() {
  if (!currentRecipe.value || !editingTitleValue.value.trim()) return

  editingTitle.value = false
  if (editingTitleValue.value !== currentRecipe.value.title) {
    updateRecipeField('title', editingTitleValue.value)
  }
}

function cancelEditTitle() {
  editingTitle.value = false
  editingTitleValue.value = ''
}

function startEditingDescription() {
  if (!isOwnRecipe.value || !editMode.value) return
  editingDescription.value = true
  editingDescriptionValue.value = currentRecipe.value?.description || ''
  nextTick(() => {
    const input = document.querySelector('.description-input') as HTMLTextAreaElement
    input?.focus()
  })
}

function saveDescription() {
  editingDescription.value = false
  // Don't save immediately - wait for edit mode exit
}

function cancelEditDescription() {
  editingDescription.value = false
  editingDescriptionValue.value = ''
}

function startEditingIngredient(index: number) {
  if (!isOwnRecipe.value || !editMode.value) return
  editingIngredient.value = index
  const ingredient = localIngredients.value[index]
  editingIngredientValue.value = {
    name: ingredient?.name || '',
    quantity: ingredient?.quantity || '',
    unit: ingredient?.unit || '',
    notes: ingredient?.notes || '',
  }
  nextTick(() => {
    const input = document.querySelector('.ingredient-name-input') as HTMLInputElement
    input?.focus()
  })
}

function saveIngredient(index: number) {
  if (!editingIngredientValue.value.name.trim()) return

  editingIngredient.value = null

  // Update local state immediately
  localIngredients.value[index] = { ...editingIngredientValue.value }

  // Mark as having unsaved changes
  hasUnsavedChanges.value = true
}

function cancelEditIngredient() {
  editingIngredient.value = null
  editingIngredientValue.value = {
    name: '',
    quantity: '',
    unit: '',
    notes: '',
  }
}

function startEditingStep(index: number) {
  if (!isOwnRecipe.value || !editMode.value) return
  editingStep.value = index
  const step = localSteps.value[index]
  editingStepValue.value = {
    description: step?.description || '',
    duration: step?.duration || 0,
    notes: step?.notes || '',
  }
  nextTick(() => {
    const input = document.querySelector('.step-description-input') as HTMLTextAreaElement
    input?.focus()
  })
}

function saveStep(index: number) {
  if (!editingStepValue.value.description.trim()) return

  editingStep.value = null

  // Update local state immediately
  localSteps.value[index] = { ...editingStepValue.value }

  // Mark as having unsaved changes
  hasUnsavedChanges.value = true
}

function cancelEditStep() {
  editingStep.value = null
  editingStepValue.value = { description: '', duration: 0, notes: '' }
}

function addNewIngredient() {
  if (!currentRecipe.value || !editMode.value) return
  const newIngredient = { name: '', quantity: '', unit: '', notes: '' }

  // Add to local state immediately
  localIngredients.value.push(newIngredient)

  // Start editing the new ingredient
  nextTick(() => {
    const lastIndex = localIngredients.value.length - 1
    startEditingIngredient(lastIndex)
  })

  // Mark as having unsaved changes
  hasUnsavedChanges.value = true
}

function addNewStep() {
  if (!currentRecipe.value || !editMode.value) return
  const newStep = { description: '', duration: 0, notes: '' }

  // Add to local state immediately
  localSteps.value.push(newStep)

  // Start editing the new step
  nextTick(() => {
    const lastIndex = localSteps.value.length - 1
    startEditingStep(lastIndex)
  })

  // Mark as having unsaved changes
  hasUnsavedChanges.value = true
}

function removeIngredient(index: number) {
  if (!currentRecipe.value || !editMode.value) return

  // Remove from local state immediately
  localIngredients.value.splice(index, 1)

  // Mark as having unsaved changes
  hasUnsavedChanges.value = true
}

function removeStep(index: number) {
  if (!currentRecipe.value || !editMode.value) return

  // Remove from local state immediately
  localSteps.value.splice(index, 1)

  // Mark as having unsaved changes
  hasUnsavedChanges.value = true
}

async function updateRecipeField(field: string, value: any) {
  if (!currentRecipe.value || !authStore.userId) return

  isSaving.value = true

  try {
    const updatedRecipe: any = {
      owner: currentRecipe.value.owner,
      recipe: currentRecipe.value._id,
    }

    // Map field names to API field names
    if (field === 'title') {
      updatedRecipe.newTitle = value
    } else if (field === 'description') {
      updatedRecipe.newDescription = value
    } else if (field === 'ingredients') {
      updatedRecipe.newIngredients = value
    } else if (field === 'steps') {
      updatedRecipe.newSteps = value
    }

    console.log('💾 Updating recipe field:', field, value)

    await recipeStore.updateRecipe(currentRecipe.value._id, updatedRecipe)

    console.log('💾 Recipe field updated successfully')
  } catch (error) {
    console.error('Failed to update recipe field:', error)
  } finally {
    isSaving.value = false
  }
}

async function shareToNotebook(notebook: Notebook) {
  if (!currentRecipe.value || !authStore.userId) return

  isSharing.value = true

  try {
    await notebookStore.shareRecipe({
      sharer: authStore.userId,
      recipe: currentRecipe.value._id,
      notebook: notebook._id,
    })

    // Show success message
    console.log('Recipe shared successfully to', notebook.title)

    // Close modal after a short delay
    setTimeout(() => {
      showShareModal.value = false
    }, 1000)
  } catch (error) {
    console.error('Failed to share recipe:', error)
  } finally {
    isSharing.value = false
  }
}

async function createAndShareNotebook() {
  if (!currentRecipe.value || !authStore.userId) return

  isCreating.value = true

  try {
    // Create the notebook
    const notebookId = await notebookStore.createNotebook({
      title: newNotebook.value.title,
      description: newNotebook.value.description,
    })

    // Share the recipe to the newly created notebook
    await notebookStore.shareRecipe({
      sharer: authStore.userId,
      recipe: currentRecipe.value._id,
      notebook: notebookId,
    })

    console.log('Notebook created and recipe shared successfully')

    // Reset form and close modal
    newNotebook.value = { title: '', description: '' }
    showCreateForm.value = false
    setTimeout(() => {
      showShareModal.value = false
    }, 1000)
  } catch (error) {
    console.error('Failed to create notebook and share recipe:', error)
  } finally {
    isCreating.value = false
  }
}

function cancelCreateNotebook() {
  showCreateForm.value = false
  newNotebook.value = { title: '', description: '' }
}

async function getAuthorName(authorId: string | undefined): Promise<string> {
  // Handle undefined or empty authorId
  if (!authorId) {
    return 'Unknown Author'
  }

  // Check if we already have this user in cache
  const cachedUser = userDetailsCache.value.get(authorId)
  if (cachedUser) {
    return cachedUser.name || `User ${authorId.slice(-4)}`
  }

  try {
    // Fetch user details and cache them
    const userDetails = await authStore.getUserDetails(authorId)
    userDetailsCache.value.set(authorId, userDetails)
    return userDetails.name || `User ${authorId.slice(-4)}`
  } catch (error) {
    console.warn(`Failed to get user details for ${authorId}:`, error)
    // Return a fallback name and cache a placeholder
    const fallbackUser = {
      _id: authorId,
      name: `User ${authorId.slice(-4)}`,
      email: '',
      preferences: {},
    } as User
    userDetailsCache.value.set(authorId, fallbackUser)
    return fallbackUser.name
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown'

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Invalid date'

  return date.toLocaleDateString()
}

async function loadAuthorName(): Promise<void> {
  if (!currentRecipe.value?.owner) {
    authorName.value = 'Unknown Author'
    return
  }

  try {
    const name = await getAuthorName(currentRecipe.value.owner)
    authorName.value = name
  } catch (error) {
    console.error('Failed to load author name:', error)
    authorName.value = `User ${currentRecipe.value.owner.slice(-4)}`
  }
}

async function loadSharedUsers(): Promise<void> {
  if (!currentRecipe.value) return

  try {
    // Get notebooks that contain this recipe
    const notebooks = await notebookStore.getNotebooksContainingRecipe(currentRecipe.value._id)
    console.log('🔍 loadSharedUsers - notebooks containing recipe:', notebooks)

    // Get all unique member IDs from these notebooks
    const memberIds = new Set<string>()
    notebooks.forEach((notebook) => {
      console.log(`🔍 loadSharedUsers - notebook "${notebook.title}" members:`, notebook.members)
      notebook.members.forEach((memberId) => memberIds.add(memberId))
    })
    console.log('🔍 loadSharedUsers - all memberIds:', Array.from(memberIds))

    // Get user details for each member
    const userPromises = Array.from(memberIds).map(async (memberId) => {
      try {
        return await authStore.getUserDetails(memberId)
      } catch (error) {
        console.warn(`Failed to get user details for ${memberId}:`, error)
        return {
          _id: memberId,
          name: `User ${memberId.slice(-4)}`,
          email: '',
          preferences: {},
        } as User
      }
    })

    const users = await Promise.all(userPromises)
    console.log('🔍 loadSharedUsers - all users:', users)
    console.log('🔍 loadSharedUsers - authStore.userId:', authStore.userId)
    console.log('🔍 loadSharedUsers - currentRecipe.value?.owner:', currentRecipe.value?.owner)

    sharedUsers.value = users.filter((user) => {
      // Exclude the current authenticated user and the recipe owner
      const shouldExclude = user._id === authStore.userId || user._id === currentRecipe.value?.owner
      console.log(
        `🔍 loadSharedUsers - user ${user.name} (${user._id}) shouldExclude: ${shouldExclude}`,
      )
      return !shouldExclude
    })

    console.log('🔍 loadSharedUsers - filtered sharedUsers:', sharedUsers.value)
  } catch (error) {
    console.error('Failed to load shared users:', error)
    sharedUsers.value = []
  }
}

onMounted(async () => {
  const recipeId = route.params.id as string
  if (recipeId) {
    await Promise.all([
      recipeStore.loadRecipeById(recipeId),
      versionStore.loadVersionsByRecipe(recipeId),
      annotationStore.loadAnnotationsForRecipe(recipeId),
      notebookStore.loadUserNotebooks(), // Load user notebooks for sharing
    ])

    // Load shared users and author name after recipe is loaded
    await Promise.all([loadSharedUsers(), loadAuthorName()])

    // Initialize local state for smooth editing
    initializeLocalState()
  }
})
</script>

<style scoped>
.recipe-view {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
}

.recipe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e1e5e9;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
}

.back-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  color: #495057;
  font-size: 14px;
}

.back-btn:hover {
  background: #e9ecef;
}

.separator {
  color: #666;
  font-size: 14px;
}

.cookbook-name {
  color: #667eea;
  font-weight: 500;
  font-size: 14px;
}

.recipe-actions {
  display: flex;
  gap: 10px;
}

.version-btn,
.edit-mode-btn,
.fork-btn,
.share-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.version-btn:hover,
.edit-mode-btn:hover,
.fork-btn:hover,
.share-btn:hover {
  background: #e9ecef;
}

.version-btn {
  background: #e3f2fd;
  border-color: #1976d2;
  color: #1976d2;
}

.edit-mode-btn {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.edit-mode-btn.active {
  background: #28a745;
  border-color: #28a745;
}

.edit-mode-btn.active:hover {
  background: #218838;
}

.fork-btn {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.fork-btn.disabled {
  background: #6c757d;
  color: #adb5bd;
  border-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.fork-btn.disabled:hover {
  background: #6c757d;
  color: #adb5bd;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #fcc;
}

.recipe-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.recipe-info h1 {
  color: #333;
  font-size: 32px;
  margin-bottom: 15px;
  font-weight: 600;
}

.recipe-description {
  color: #666;
  font-size: 18px;
  margin-bottom: 20px;
  line-height: 1.6;
}

.recipe-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.version-info {
  display: flex;
  gap: 15px;
  font-size: 14px;
}

.version-number {
  font-weight: 600;
  color: #667eea;
}

.version-author {
  color: #666;
}

.version-date {
  color: #888;
}

.recipe-stats {
  display: flex;
  gap: 15px;
  font-size: 14px;
  color: #666;
}

.fork-count,
.annotation-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.recipe-tags {
  margin-bottom: 20px;
}

.tag {
  background: #e1e5e9;
  color: #555;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 8px;
}

.sharing-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  padding: 10px 15px;
  background: #e8f5e8;
  border-radius: 6px;
  border-left: 3px solid #28a745;
}

.sharing-label {
  font-weight: 500;
}

.shared-users {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 5px;
}

.shared-user {
  background: #28a745;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.debug-info {
  background: #fff3cd;
  color: #856404;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  border: 1px solid #ffeaa7;
}

/* Share Modal Styles */
.share-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  z-index: 1002;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content {
  padding: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
  border-radius: 12px 12px 0 0;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.modal-body {
  padding: 20px;
}

.no-notebooks {
  text-align: center;
  padding: 20px;
}

.create-notebook-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 10px;
}

.create-notebook-btn:hover {
  background: #5a6fd8;
}

.create-notebook-form {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: #f8f9fa;
}

.create-notebook-form h4 {
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
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.cancel-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background: #5a6268;
}

.create-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.create-btn:hover:not(:disabled) {
  background: #218838;
}

.create-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.notebooks-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.notebook-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: #f8f9fa;
}

.notebook-item.already-shared {
  background: #e8f5e8;
  border-color: #28a745;
}

.notebook-info h4 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 16px;
}

.notebook-info p {
  margin: 0 0 5px 0;
  color: #666;
  font-size: 14px;
}

.member-count {
  color: #888;
  font-size: 12px;
}

.already-shared-badge {
  color: #28a745;
  font-weight: 500;
  font-size: 14px;
}

.share-to-notebook-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.share-to-notebook-btn:hover:not(:disabled) {
  background: #5a6fd8;
}

.share-to-notebook-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
}

.ingredients-section,
.steps-section {
  margin-bottom: 40px;
}

.ingredients-section h2,
.steps-section h2 {
  color: #333;
  font-size: 24px;
  margin-bottom: 20px;
  font-weight: 600;
  border-bottom: 2px solid #667eea;
  padding-bottom: 10px;
}

.ingredients-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.ingredient-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.ingredient-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.ingredient-quantity {
  font-weight: 600;
  color: #667eea;
}

.ingredient-unit {
  color: #666;
}

.ingredient-name {
  font-weight: 500;
  color: #333;
}

.ingredient-notes {
  color: #888;
  font-style: italic;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.step-item {
  display: flex;
  gap: 15px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #28a745;
}

.step-number {
  background: #28a745;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-description {
  margin: 0 0 10px 0;
  color: #333;
  line-height: 1.6;
  font-size: 16px;
}

.step-duration {
  color: #666;
  font-size: 14px;
  margin-bottom: 5px;
}

.step-notes {
  color: #888;
  font-size: 14px;
  font-style: italic;
}

.version-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 500px;
  height: 100vh;
  background: white;
  border-left: 1px solid #e1e5e9;
  z-index: 1001;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.sidebar-header h3 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

@media (max-width: 768px) {
  .recipe-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .recipe-actions {
    justify-content: center;
  }

  .recipe-meta {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .version-info {
    flex-direction: column;
    gap: 5px;
  }

  .recipe-stats {
    flex-direction: column;
    gap: 5px;
  }

  .ingredient-item {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .step-item {
    flex-direction: column;
    text-align: center;
  }

  .step-number {
    align-self: center;
  }

  .version-sidebar {
    width: 100%;
  }
}

/* Edit Form Styles */
.edit-form {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.edit-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #dee2e6;
}

.edit-form-header h2 {
  margin: 0;
  color: #333;
}

.cancel-edit-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-edit-btn:hover {
  background: #5a6268;
}

.recipe-edit-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-input,
.form-textarea {
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.ingredients-edit,
.steps-edit {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ingredient-edit-item,
.step-edit-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
}

.ingredient-edit-item {
  align-items: center;
}

.step-edit-item {
  align-items: flex-start;
}

.step-number {
  background: #667eea;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
  margin-top: 5px;
}

.remove-btn {
  background: #dc3545;
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.remove-btn:hover {
  background: #c82333;
}

.add-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  align-self: flex-start;
}

.add-btn:hover {
  background: #218838;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid #dee2e6;
}

.cancel-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background: #5a6268;
}

.save-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.save-btn:hover:not(:disabled) {
  background: #5a6fd8;
}

.save-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Inline Editing Styles */
.editable-title,
.editable-description,
.editable-ingredient,
.editable-step {
  position: relative;
  transition: all 0.2s ease;
}

.editable-title.can-edit,
.editable-description.can-edit,
.editable-ingredient.can-edit,
.editable-step.can-edit {
  cursor: pointer;
}

.editable-title.can-edit:hover,
.editable-description.can-edit:hover,
.editable-ingredient.can-edit:hover,
.editable-step.can-edit:hover {
  background-color: rgba(102, 126, 234, 0.1);
  border-radius: 4px;
  padding: 4px 8px;
  margin: -4px -8px;
}

.edit-hint {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.6;
  font-size: 12px;
}

.editable-input,
.editable-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #667eea;
  border-radius: 6px;
  font-size: inherit;
  font-family: inherit;
  background: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.editable-input:focus,
.editable-textarea:focus {
  outline: none;
  border-color: #5a6fd8;
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.3);
}

.title-input {
  font-size: 2rem;
  font-weight: bold;
  padding: 12px 16px;
}

.description-input {
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  min-height: 60px;
}

.ingredient-edit-form,
.step-edit-form {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 6px;
  border: 2px solid #667eea;
}

.ingredient-name-input {
  flex: 2;
  font-weight: 500;
}

.ingredient-quantity-input,
.ingredient-unit-input {
  flex: 1;
}

.ingredient-notes-input {
  flex: 1.5;
}

.step-description-input {
  flex: 2;
  font-size: 1rem;
  line-height: 1.4;
}

.step-duration-input,
.step-notes-input {
  flex: 1;
}

.remove-ingredient-btn,
.remove-step-btn {
  background: #dc3545;
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.remove-ingredient-btn:hover,
.remove-step-btn:hover {
  background: #c82333;
}

.add-ingredient-btn,
.add-step-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  margin-top: 12px;
  transition: background-color 0.2s;
}

.add-ingredient-btn:hover,
.add-step-btn:hover {
  background: #218838;
}

.add-ingredient-placeholder,
.add-step-placeholder {
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s;
}

.add-ingredient-placeholder:hover,
.add-step-placeholder:hover {
  background: #e9ecef;
  border-color: #667eea;
  color: #667eea;
}

.empty-state {
  margin: 20px 0;
}

.placeholder {
  color: #6c757d;
  font-style: italic;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.2s;
}

.placeholder:hover {
  background-color: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

/* Save indicator styles */
.save-indicator {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 500;
}

.saving-indicator {
  color: #667eea;
  animation: pulse 1.5s ease-in-out infinite;
}

.unsaved-indicator {
  color: #ffc107;
}

.saved-indicator {
  color: #28a745;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
</style>
