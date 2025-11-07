<template>
  <div class="recipe-view">
    <div v-if="isLoading" class="recipe-content skeleton" role="status" aria-live="polite">
      <span class="sr-only">Loading recipe...</span>

      <div class="recipe-info">
        <div class="title-row">
          <div class="skeleton-title shimmer"></div>
          <div class="save-indicator">
            <div class="skeleton-pill shimmer"></div>
          </div>
          <div class="header-actions">
            <div class="skeleton-button shimmer"></div>
            <div class="skeleton-button shimmer"></div>
            <div class="skeleton-button shimmer"></div>
          </div>
        </div>

        <div class="skeleton-line shimmer"></div>
        <div class="skeleton-line shimmer short"></div>

        <div class="recipe-meta skeleton-meta">
          <div class="skeleton-pill shimmer wide"></div>
          <div class="skeleton-pill shimmer"></div>
          <div class="skeleton-pill shimmer"></div>
        </div>

        <div class="recipe-tags skeleton-tags">
          <div class="skeleton-pill shimmer"></div>
          <div class="skeleton-pill shimmer"></div>
          <div class="skeleton-pill shimmer"></div>
        </div>
      </div>

      <div class="content-grid skeleton-grid">
        <section class="ingredients-section">
          <div class="skeleton-section-title shimmer"></div>
          <div class="skeleton-list">
            <div v-for="n in 4" :key="`ingredient-${n}`" class="skeleton-list-item shimmer"></div>
          </div>
        </section>

        <section class="steps-section">
          <div class="skeleton-section-title shimmer"></div>
          <div class="skeleton-list">
            <div v-for="n in 3" :key="`step-${n}`" class="skeleton-list-block shimmer"></div>
          </div>
        </section>
      </div>
    </div>

    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-else-if="currentRecipe" class="recipe-content">
      <!-- Recipe Title and Meta -->
      <div class="recipe-info">
        <div class="title-row">
          <!-- View Mode: Show title as heading -->
          <h1 v-if="!editMode || !isOwnRecipe" class="plain-title">
            {{ currentRecipe.title }}
          </h1>

          <!-- Edit Mode: Show editable input -->
          <input
            v-else
            v-model="editingTitleValue"
            @input="hasUnsavedChanges = true"
            :class="[
              'plain-title-input',
              currentDraft && isTitleModified ? 'draft-field-highlight' : '',
            ]"
            placeholder="Recipe title"
          />

          <!-- Save indicator -->
          <div v-if="isOwnRecipe" class="save-indicator">
            <span v-if="isSaving" class="saving-indicator">
              <Save :size="16" :stroke-width="2" />
              Saving...
            </span>
            <span v-else-if="hasUnsavedChanges" class="unsaved-indicator">
              <CircleDot :size="16" :stroke-width="2" />
              Draft
            </span>
            <span v-else class="saved-indicator">
              <Check :size="16" :stroke-width="2" />
              Saved
            </span>
          </div>

          <div class="header-actions">
            <button v-if="isOwnRecipe && editMode" @click="showDraftModal = true" class="draft-btn">
              AI Draft
            </button>
            <button
              v-if="isOwnRecipe"
              @click="toggleEditMode"
              class="edit-mode-btn"
              :class="{ active: editMode }"
            >
              {{ editMode ? 'Save' : 'Edit' }}
            </button>
            <button
              v-if="!isOwnRecipe"
              @click="forkRecipe"
              :title="'Create a copy of this recipe'"
              class="fork-btn"
            >
              Fork
            </button>
            <button @click="shareRecipe" class="share-btn">Add to Cookbook</button>
            <button
              v-if="isOwnRecipe"
              @click="deleteRecipe"
              class="delete-btn"
              title="Delete recipe"
            >
              <Trash2 :size="18" />
            </button>
          </div>

          <p v-if="!isOwnRecipe" class="read-only-notice">
            This recipe was shared with you. Fork it to create your own editable copy.
          </p>
        </div>

        <!-- View Mode: Show description as text -->
        <div
          v-if="(!editMode || !isOwnRecipe) && currentRecipe.description"
          class="plain-description"
          :class="{ 'draft-field-highlight': currentDraft && isDescriptionModified }"
        >
          {{ currentRecipe.description }}
        </div>

        <!-- Edit Mode: Show editable textarea -->
        <textarea
          v-else-if="editMode && isOwnRecipe"
          v-model="editingDescriptionValue"
          @input="handleDescriptionInput"
          :class="[
            'plain-description-input',
            currentDraft && isDescriptionModified ? 'draft-field-highlight' : '',
          ]"
          placeholder="Recipe description (optional)"
          rows="3"
        ></textarea>

        <div class="recipe-meta">
          <div class="recipe-author-info">
            <span class="recipe-author"> by {{ authorName }}</span>
            <span class="recipe-date">{{ formatDate(currentRecipe.updated) }}</span>
            <div v-if="cookbooksContainingRecipe.length > 0" class="cookbook-info">
              <button
                v-for="notebook in cookbooksContainingRecipe"
                :key="notebook._id"
                type="button"
                class="cookbook-badge"
                @click="navigateToCookbook(notebook._id)"
              >
                {{ notebook.title }}
              </button>
            </div>
          </div>

          <div class="recipe-stats">
            <span class="fork-count">{{ forkCount }} forks</span>
            <span class="annotation-count">{{ annotationCount }} comments</span>
          </div>
        </div>

        <div v-if="currentRecipe.tags && currentRecipe.tags.length > 0" class="recipe-tags">
          <span v-for="tag in currentRecipe.tags" :key="tag" class="tag">
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- Draft Status Banner -->
      <div v-if="currentDraft" class="draft-banner">
        <div class="draft-banner-content">
          <div class="draft-info">
            <span class="draft-label">
              <Sparkles :size="16" :stroke-width="2" />
              AI Draft Preview
            </span>
            <span class="draft-confidence" :class="getDraftConfidenceClass()"
              >{{ Math.round(currentDraft.confidence * 100) }}% confidence</span
            >
          </div>
          <div class="draft-actions">
            <button @click="discardDraft" class="discard-draft-btn">Discard AI Draft</button>
          </div>
        </div>
        <div v-if="currentDraft.notes" class="draft-notes">
          {{ currentDraft.notes }}
        </div>
      </div>

      <!-- Ingredients and Steps Side by Side -->
      <div class="content-grid">
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
            <!-- Edit Mode: Always show inputs -->
            <template v-if="isOwnRecipe && editMode">
              <div
                v-for="(ingredient, index) in localIngredients"
                :key="index"
                :class="[
                  'ingredient-item',
                  currentDraft ? getIngredientChangeClass(index, localIngredients) : '',
                ]"
              >
                <input
                  v-model="ingredient.quantity"
                  @keydown.enter="addIngredientIfComplete(index)"
                  @blur="addIngredientIfComplete(index)"
                  class="plain-input ingredient-quantity-input"
                  placeholder="Amount"
                />
                <input
                  v-model="ingredient.unit"
                  @keydown.enter="addIngredientIfComplete(index)"
                  @blur="addIngredientIfComplete(index)"
                  class="plain-input ingredient-unit-input"
                  placeholder="Unit"
                />
                <textarea
                  v-model="ingredient.name"
                  @keydown.enter="addIngredientIfComplete(index)"
                  @blur="addIngredientIfComplete(index)"
                  @input="autoExpandTextarea($event)"
                  class="plain-textarea ingredient-name-input"
                  placeholder="Ingredient name"
                ></textarea>
                <textarea
                  v-model="ingredient.notes"
                  @keydown.enter="addIngredientIfComplete(index)"
                  @blur="addIngredientIfComplete(index)"
                  @input="autoExpandTextarea($event)"
                  class="plain-textarea ingredient-notes-input"
                  placeholder="Notes (optional)"
                ></textarea>
                <button @click="removeIngredient(index)" class="remove-ingredient-btn">-</button>
              </div>
            </template>
            <!-- View Mode: Show as text -->
            <template v-else>
              <div
                v-for="(ingredient, index) in displayIngredients"
                :key="index"
                :class="[
                  'ingredient-item',
                  currentDraft ? getIngredientChangeClass(index, displayIngredients) : '',
                ]"
                @click="handleAnnotationClick('Ingredient', index, $event)"
              >
                <div class="ingredient-content">
                  <span class="ingredient-quantity">{{ ingredient.quantity || 'Amount' }}</span>
                  <span v-if="ingredient.unit" class="ingredient-unit">{{ ingredient.unit }}</span>
                  <span class="ingredient-name">{{ ingredient.name }}</span>
                  <span v-if="ingredient.notes" class="ingredient-notes"
                    >({{ ingredient.notes }})</span
                  >
                </div>
              </div>
            </template>
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
            <!-- Edit Mode: Always show inputs -->
            <template v-if="isOwnRecipe && editMode">
              <div
                v-for="(step, index) in localSteps"
                :key="index"
                :class="['step-item', currentDraft ? getStepChangeClass(index, localSteps) : '']"
              >
                <div class="step-number">{{ index + 1 }}</div>
                <textarea
                  v-model="step.description"
                  @blur="addStepIfComplete(index)"
                  @input="autoExpandTextarea($event)"
                  class="plain-textarea step-description-input"
                  placeholder="Step description"
                ></textarea>
                <textarea
                  v-model="step.notes"
                  @keydown.enter="addStepIfComplete(index)"
                  @blur="addStepIfComplete(index)"
                  @input="autoExpandTextarea($event)"
                  class="plain-textarea step-notes-input"
                  placeholder="Notes (optional)"
                ></textarea>
                <button @click="removeStep(index)" class="remove-step-btn">-</button>
              </div>
            </template>
            <!-- View Mode: Show as text -->
            <template v-else>
              <div
                v-for="(step, index) in displaySteps"
                :key="index"
                :class="['step-item', currentDraft ? getStepChangeClass(index, displaySteps) : '']"
                @click="handleAnnotationClick('Step', index, $event)"
              >
                <div class="step-number">{{ index + 1 }}</div>
                <div class="step-content">
                  <p class="step-description">{{ step.description }}</p>
                  <div v-if="step.notes" class="step-notes">Note: {{ step.notes }}</div>
                </div>
              </div>
            </template>
          </div>
        </section>
      </div>
    </div>

    <!-- Annotation Overlay Backdrop -->
    <div v-if="activeAnnotation" class="annotation-overlay-backdrop" @click="closeAnnotation"></div>

    <!-- Annotation Overlay -->
    <AnnotationSystem
      v-if="activeAnnotation && currentRecipe"
      :recipe-id="currentRecipe._id"
      :target-kind="activeAnnotation.targetKind"
      :target-index="activeAnnotation.targetIndex"
      :show-form="activeAnnotation.showForm"
      :position="annotationPosition"
      @close="closeAnnotation"
      @show-form="activeAnnotation.showForm = true"
    />

    <!-- Version View Sidebar -->

    <!-- Share Modal -->
    <div v-if="showShareModal" class="share-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add to Cookbook</h3>
          <button @click="showShareModal = false" class="close-btn">×</button>
        </div>

        <div class="modal-body">
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
                  @input="autoExpandTextarea($event)"
                  class="form-textarea"
                  rows="3"
                ></textarea>
              </div>
              <div class="form-actions">
                <button type="button" @click="cancelCreateNotebook" class="cancel-btn">
                  Cancel
                </button>
                <button type="submit" :disabled="isCreating" class="create-btn">
                  {{ isCreating ? 'Creating...' : 'Create & Add' }}
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
                  <Check :size="14" :stroke-width="2" />
                  Already in cookbook
                </span>
                <button
                  v-else
                  @click="shareToNotebook(notebook)"
                  :disabled="isSharing"
                  class="share-to-notebook-btn"
                >
                  {{ isSharing ? 'Adding...' : 'Add to Cookbook' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Share Modal Overlay -->
    <div v-if="showShareModal" class="modal-overlay" @click="showShareModal = false"></div>

    <!-- Draft Version Modal -->
    <DraftVersionModal
      v-if="showDraftModal && currentRecipe"
      :show-modal="showDraftModal"
      :recipe-id="currentRecipe._id"
      :base-ingredients="baseIngredients"
      :base-steps="baseSteps"
      @close="handleDraftClose"
      @draft-ready="handleDraftReady"
    />
  </div>
</template>

<script setup lang="ts">
import { Check, CircleDot, Save, Sparkles, Trash2 } from 'lucide-vue-next'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { recipeApi } from '@/services/api'
import { useAnnotationStore } from '@/stores/annotation'
import { useAuthStore } from '@/stores/auth'
import { useNotebookStore } from '@/stores/notebook'
import { useRecipeStore } from '@/stores/recipe'
import type { Ingredient, Notebook, RecipeUpdate, Step, User, VersionDraft } from '@/types/api'
import AnnotationSystem from './AnnotationSystem.vue'
import DraftVersionModal from './DraftVersionModal.vue'

type IngredientComparable = Partial<Ingredient> & {
  name?: string | null
  quantity?: string | null
  unit?: string | null
  notes?: string | null
}

type StepComparable = Partial<Step> & {
  description?: string | null
  notes?: string | null
}

const route = useRoute()
const router = useRouter()
const recipeStore = useRecipeStore()
const notebookStore = useNotebookStore()
const annotationStore = useAnnotationStore()
const authStore = useAuthStore()

const showDraftModal = ref(false)
const currentDraft = ref<VersionDraft | null>(null)
const isAcceptingDraft = ref(false)
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
const editingStepValue = ref({ description: '', notes: '' })
const isSaving = ref(false)

// Local state for smooth editing
const localIngredients = ref<
  Array<{ name: string; quantity: string; unit: string; notes: string }>
>([])
const localSteps = ref<Array<{ description: string; notes: string }>>([])
const hasUnsavedChanges = ref(false)

// Annotation state
const activeAnnotation = ref<{
  targetKind: 'Ingredient' | 'Step'
  targetIndex: number
  showForm: boolean
} | null>(null)
const annotationPosition = ref<{ x: number; y: number } | null>(null)

const isLoading = computed(() => recipeStore.isLoading)
const error = computed(() => recipeStore.error)
const currentRecipe = computed(() => recipeStore.currentRecipe)
const currentNotebook = computed(() => notebookStore.currentNotebook)

const forkCount = ref(0)
const annotationCount = computed(() =>
  currentRecipe.value ? annotationStore.annotationsByRecipe(currentRecipe.value._id).length : 0,
)
const cookbooksContainingRecipe = ref<Notebook[]>([])

const displayIngredients = computed(() => {
  // Use draft if available (for preview)
  if (currentDraft.value) {
    return currentDraft.value.ingredients
  }
  return currentRecipe.value?.ingredients || []
})

const displaySteps = computed(() => {
  // Use draft if available (for preview)
  if (currentDraft.value) {
    return currentDraft.value.steps
  }
  return currentRecipe.value?.steps || []
})

const availableNotebooks = computed(() => {
  return notebookStore.userNotebooks
})

const isOwnRecipe = computed(() => {
  return currentRecipe.value?.owner === authStore.userId
})

// Base ingredients/steps for comparison (what was there before the draft)
const baseIngredients = computed<Ingredient[]>(() => {
  return currentRecipe.value?.ingredients || []
})

const baseSteps = computed<Step[]>(() => {
  return currentRecipe.value?.steps || []
})

const isTitleModified = computed(() => {
  if (!currentDraft.value) return false
  const baseTitle =
    typeof currentRecipe.value?.title === 'string' ? currentRecipe.value.title.trim() : ''
  return editingTitleValue.value.trim() !== baseTitle
})

const isDescriptionModified = computed(() => {
  if (!currentDraft.value) return false
  const baseDescription =
    typeof currentRecipe.value?.description === 'string'
      ? currentRecipe.value.description.trim()
      : ''
  return editingDescriptionValue.value.trim() !== baseDescription
})

const isInCurrentCookbook = computed(() => {
  if (!currentRecipe.value || !currentNotebook.value) return false
  return currentNotebook.value.recipes.includes(currentRecipe.value._id)
})

function isRecipeInNotebook(notebook: Notebook): boolean {
  if (!currentRecipe.value) return false
  return notebook.recipes.includes(currentRecipe.value._id)
}

function goBack() {
  if (currentNotebook.value) {
    router.push(`/cookbooks/${currentNotebook.value._id}`)
  } else {
    router.push('/recipes')
  }
}

function shareRecipe() {
  showShareModal.value = true
}

function navigateToCookbook(notebookId: string) {
  router.push(`/cookbooks/${notebookId}`)
}

async function forkRecipe() {
  if (!currentRecipe.value || !authStore.userId || isOwnRecipe.value) return

  try {
    // Create a new recipe based on the current one (fork)
    // Owner is derived from session by backend
    const forkedRecipe = {
      title: `${currentRecipe.value.title} (Fork)`,
      description: currentRecipe.value.description,
      ingredients: currentRecipe.value.ingredients,
      steps: currentRecipe.value.steps,
      tags: [...(currentRecipe.value.tags || [])],
      forkedFrom: currentRecipe.value._id,
    }

    console.log('🍴 Forking recipe:', forkedRecipe)

    // Call the recipe API to create the forked recipe
    const response = await recipeApi.createRecipe(forkedRecipe)
    const newRecipeId = (response as { recipe: string }).recipe

    console.log('🍴 Recipe forked successfully, new ID:', newRecipeId)

    // Navigate to the new recipe
    router.push(`/recipe/${newRecipeId}`)
  } catch (error) {
    console.error('Failed to fork recipe:', error)
    alert(`Failed to fork recipe: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function deleteRecipe() {
  if (!currentRecipe.value || !authStore.userId || !isOwnRecipe.value) return

  // Show confirmation dialog
  const confirmDelete = window.confirm(
    `Are you sure you want to delete "${currentRecipe.value.title}"? This action cannot be undone.`,
  )

  if (!confirmDelete) return

  try {
    console.log('🗑️ Deleting recipe:', currentRecipe.value._id)

    // Call the recipe API to delete the recipe
    await recipeApi.deleteRecipe(currentRecipe.value._id)

    console.log('🗑️ Recipe deleted successfully')

    // Navigate back to cookbook or home
    if (currentNotebook.value) {
      router.push(`/cookbooks/${currentNotebook.value._id}`)
    } else {
      router.push('/')
    }
  } catch (error) {
    console.error('Failed to delete recipe:', error)
    alert(`Failed to delete recipe: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Initialize local state from recipe data (only when entering edit mode)
function initializeLocalState() {
  if (!currentRecipe.value) return

  // Initialize title and description
  editingTitleValue.value = currentRecipe.value.title || ''
  editingDescriptionValue.value = currentRecipe.value.description || ''

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
    notes: step.notes || '',
  }))

  hasUnsavedChanges.value = false
}

// Draft handling
function handleDraftReady(draft: VersionDraft) {
  console.log('✅ Draft received in RecipeView:', draft)
  currentDraft.value = draft
  showDraftModal.value = false

  // Enter edit mode and load draft into editable fields
  if (!editMode.value) {
    editMode.value = true
  }

  // Use AI-suggested title if available, otherwise keep current title
  if (draft.title?.trim()) {
    editingTitleValue.value = draft.title
  } else if (!editingTitleValue.value || editingTitleValue.value === currentRecipe.value?.title) {
    editingTitleValue.value = currentRecipe.value?.title || ''
  }

  // Keep current description (AI doesn't typically change this)
  if (
    !editingDescriptionValue.value ||
    editingDescriptionValue.value === currentRecipe.value?.description
  ) {
    editingDescriptionValue.value = currentRecipe.value?.description || ''
  }

  // Load draft ingredients into local state
  localIngredients.value = draft.ingredients.map((ing) => ({
    name: ing.name || '',
    quantity: ing.quantity || '',
    unit: ing.unit || '',
    notes: ing.notes || '',
  }))

  // Add empty row for new ingredients
  localIngredients.value.push({ name: '', quantity: '', unit: '', notes: '' })

  // Load draft steps into local state
  localSteps.value = draft.steps.map((step) => ({
    description: step.description || '',
    notes: step.notes || '',
  }))

  // Add empty row for new steps
  localSteps.value.push({ description: '', notes: '' })

  // Mark as having unsaved changes
  hasUnsavedChanges.value = true

  console.log('✅ Draft loaded into editable fields')

  // Expand all textareas after render
  nextTick(() => {
    const descriptionTextarea = document.querySelector('.plain-description-input')
    if (descriptionTextarea instanceof HTMLTextAreaElement) {
      autoExpandTextarea({ target: descriptionTextarea } as unknown as Event)
    }

    const ingredientNames = document.querySelectorAll('.ingredient-name-input')
    ingredientNames.forEach((textarea) => {
      if (textarea instanceof HTMLTextAreaElement) {
        autoExpandTextarea({ target: textarea } as unknown as Event)
      }
    })

    const ingredientNotes = document.querySelectorAll('.ingredient-notes-input')
    ingredientNotes.forEach((textarea) => {
      if (textarea instanceof HTMLTextAreaElement) {
        autoExpandTextarea({ target: textarea } as unknown as Event)
      }
    })

    const stepDescriptions = document.querySelectorAll('.step-description-input')
    stepDescriptions.forEach((textarea) => {
      if (textarea instanceof HTMLTextAreaElement) {
        autoExpandTextarea({ target: textarea } as unknown as Event)
      }
    })

    const stepNotes = document.querySelectorAll('.step-notes-input')
    stepNotes.forEach((textarea) => {
      if (textarea instanceof HTMLTextAreaElement) {
        autoExpandTextarea({ target: textarea } as unknown as Event)
      }
    })
  })
}

function handleDraftClose() {
  showDraftModal.value = false
}

function discardDraft() {
  currentDraft.value = null
  editMode.value = false
  hasUnsavedChanges.value = false
  // Reload original recipe data
  if (currentRecipe.value) {
    initializeLocalState()
  }
}

// Comparison helpers for highlighting changes
function normalizeText(value: unknown): string {
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value.trim()
  return ''
}

function hasIngredientContent(ingredient?: IngredientComparable): boolean {
  if (!ingredient) return false
  return (
    normalizeText(ingredient.name) !== '' ||
    normalizeText(ingredient.quantity) !== '' ||
    normalizeText(ingredient.unit) !== '' ||
    normalizeText(ingredient.notes) !== ''
  )
}

function ingredientsDiffer(
  baseIng?: IngredientComparable,
  updatedIng?: IngredientComparable,
): boolean {
  return (
    normalizeText(baseIng?.name) !== normalizeText(updatedIng?.name) ||
    normalizeText(baseIng?.quantity) !== normalizeText(updatedIng?.quantity) ||
    normalizeText(baseIng?.unit) !== normalizeText(updatedIng?.unit) ||
    normalizeText(baseIng?.notes) !== normalizeText(updatedIng?.notes)
  )
}

function getIngredientChangeClass(index: number, comparisonList?: IngredientComparable[]): string {
  if (!currentDraft.value) return ''

  const list =
    (comparisonList as IngredientComparable[] | undefined) ??
    (currentDraft.value.ingredients as IngredientComparable[] | undefined) ??
    []
  const baseIngredient = baseIngredients.value[index] as IngredientComparable | undefined
  const updatedIngredient = list[index]

  const baseHasContent = hasIngredientContent(baseIngredient)
  const updatedHasContent = hasIngredientContent(updatedIngredient)

  if (!baseHasContent && !updatedHasContent) {
    return ''
  }

  if (baseHasContent !== updatedHasContent) {
    return 'change-modified'
  }

  if (ingredientsDiffer(baseIngredient, updatedIngredient)) {
    return 'change-modified'
  }

  return ''
}

function hasStepContent(step?: StepComparable): boolean {
  if (!step) return false
  return normalizeText(step.description) !== '' || normalizeText(step.notes) !== ''
}

function stepsDiffer(baseStep?: StepComparable, updatedStep?: StepComparable): boolean {
  return (
    normalizeText(baseStep?.description) !== normalizeText(updatedStep?.description) ||
    normalizeText(baseStep?.notes) !== normalizeText(updatedStep?.notes)
  )
}

function getStepChangeClass(index: number, comparisonList?: StepComparable[]): string {
  if (!currentDraft.value) return ''

  const list =
    (comparisonList as StepComparable[] | undefined) ??
    (currentDraft.value.steps as StepComparable[] | undefined) ??
    []
  const baseStep = baseSteps.value[index] as StepComparable | undefined
  const updatedStep = list[index]

  const baseHasContent = hasStepContent(baseStep)
  const updatedHasContent = hasStepContent(updatedStep)

  if (!baseHasContent && !updatedHasContent) {
    return ''
  }

  if (baseHasContent !== updatedHasContent) {
    return 'change-modified'
  }

  if (stepsDiffer(baseStep, updatedStep)) {
    return 'change-modified'
  }

  return ''
}

function getDraftConfidenceClass(): string {
  if (!currentDraft.value) return ''
  const conf = currentDraft.value.confidence
  if (conf >= 0.8) return 'high'
  if (conf >= 0.5) return 'medium'
  return 'low'
}

async function acceptDraft() {
  if (!currentDraft.value) {
    console.error('❌ No draft to accept')
    return
  }

  if (!authStore.userId) {
    console.error('❌ User must be logged in')
    return
  }

  if (!currentRecipe.value?._id) {
    console.error('❌ No recipe ID found')
    return
  }

  console.log('✅ Saving draft changes:', {
    recipeId: currentRecipe.value._id,
    userId: authStore.userId,
  })

  isAcceptingDraft.value = true

  try {
    // Filter out empty ingredients and steps
    const filteredIngredients = localIngredients.value.filter((ing) => ing.name.trim() !== '')
    const filteredSteps = localSteps.value.filter((step) => step.description.trim() !== '')

    // Save the edited changes from local state
    await recipeApi.applyDraft(currentRecipe.value._id, {
      ingredients: filteredIngredients,
      steps: filteredSteps,
      notes: currentDraft.value.notes,
    })

    console.log('✅ Draft changes saved successfully')

    // Clear draft and exit edit mode
    currentDraft.value = null
    editMode.value = false
    hasUnsavedChanges.value = false

    // Refresh recipe data
    await recipeStore.loadRecipeById(currentRecipe.value._id)

    console.log('✅ Recipe data refreshed')
  } catch (err) {
    console.error('❌ Failed to save draft changes:', err)
    alert(`Failed to save changes: ${err instanceof Error ? err.message : 'Unknown error'}`)
  } finally {
    isAcceptingDraft.value = false
  }
}

// Inline editing functions
function handleAnnotationClick(
  targetKind: 'Ingredient' | 'Step',
  targetIndex: number,
  event: MouseEvent,
) {
  // Stop propagation to prevent backdrop from closing when clicking on ingredient/step
  event.stopPropagation()

  // Store click position for overlay positioning
  annotationPosition.value = {
    x: event.clientX,
    y: event.clientY,
  }

  // Set active annotation to show the form immediately
  activeAnnotation.value = {
    targetKind,
    targetIndex,
    showForm: true, // Open comment form immediately on click
  }
}

function closeAnnotation() {
  activeAnnotation.value = null
  annotationPosition.value = null
}

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

  // If entering edit mode, expand all textareas after render
  if (editMode.value) {
    nextTick(() => {
      // Expand all ingredient name and note textareas
      const ingredientNames = document.querySelectorAll('.ingredient-name-input')
      ingredientNames.forEach((textarea) => {
        if (textarea instanceof HTMLTextAreaElement) {
          autoExpandTextarea({ target: textarea } as unknown as Event)
        }
      })

      const ingredientNotes = document.querySelectorAll('.ingredient-notes-input')
      ingredientNotes.forEach((textarea) => {
        if (textarea instanceof HTMLTextAreaElement) {
          autoExpandTextarea({ target: textarea } as unknown as Event)
        }
      })

      // Expand all step description and note textareas
      const stepDescriptions = document.querySelectorAll('.step-description-input')
      stepDescriptions.forEach((textarea) => {
        if (textarea instanceof HTMLTextAreaElement) {
          autoExpandTextarea({ target: textarea } as unknown as Event)
        }
      })

      const stepNotes = document.querySelectorAll('.step-notes-input')
      stepNotes.forEach((textarea) => {
        if (textarea instanceof HTMLTextAreaElement) {
          autoExpandTextarea({ target: textarea } as unknown as Event)
        }
      })
    })
  }
}

async function saveAllChanges() {
  if (!currentRecipe.value || !authStore.userId) return

  isSaving.value = true

  try {
    const updatedRecipe: Partial<RecipeUpdate> & { recipe: string } = {
      // owner derived from session by backend
      recipe: currentRecipe.value._id,
      newTitle: editingTitleValue.value || currentRecipe.value.title,
      newDescription: editingDescriptionValue.value || currentRecipe.value.description,
      newIngredients: localIngredients.value.filter((ing) => ing.name.trim() !== ''),
    }

    console.log('💾 Saving all changes:', updatedRecipe)

    await recipeStore.updateRecipe(currentRecipe.value._id, updatedRecipe)

    console.log('💾 All changes saved successfully')
    hasUnsavedChanges.value = false

    // Clear draft banner if it exists
    currentDraft.value = null
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
  editingStepValue.value = { description: '', notes: '' }
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

function addIngredientIfComplete(index: number) {
  const ing = localIngredients.value[index]
  if (ing?.name && ing?.quantity && index === localIngredients.value.length - 1) {
    localIngredients.value.push({
      name: '',
      quantity: '',
      unit: '',
      notes: '',
    })
    hasUnsavedChanges.value = true
  }
}

function addStepIfComplete(index: number) {
  const step = localSteps.value[index]
  if (step?.description && index === localSteps.value.length - 1) {
    localSteps.value.push({ description: '', notes: '' })
    hasUnsavedChanges.value = true
  }
}

function autoExpandTextarea(event: Event) {
  const textarea = event.target as HTMLTextAreaElement
  if (!textarea) return

  // Reset height to auto to get accurate scrollHeight
  textarea.style.height = 'auto'
  textarea.style.overflowY = 'hidden'

  // Calculate minimum height from rows attribute (if present) or CSS min-height, whichever is larger
  const computedStyle = getComputedStyle(textarea)
  const lineHeight = parseFloat(computedStyle.lineHeight) || 20
  const rowsAttr = textarea.getAttribute('rows')
  const minHeightFromRows = rowsAttr ? lineHeight * parseInt(rowsAttr) : 0
  const minHeightFromCSS = parseFloat(computedStyle.minHeight) || 0
  const minHeight = Math.max(minHeightFromRows, minHeightFromCSS)

  // Set height based on scrollHeight, ensuring it shows all content
  // scrollHeight gives us the full content height including padding
  const newHeight = Math.max(textarea.scrollHeight, minHeight)
  textarea.style.height = `${newHeight}px`

  // Ensure no max-height constraint is applied
  textarea.style.maxHeight = 'none'
}

function handleDescriptionInput(event: Event) {
  autoExpandTextarea(event)
  hasUnsavedChanges.value = true
}

function addNewStep() {
  if (!currentRecipe.value || !editMode.value) return
  const newStep = { description: '', notes: '' }

  // Add to local state immediately
  localSteps.value.push(newStep)

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

async function updateRecipeField(field: string, value: unknown) {
  if (!currentRecipe.value || !authStore.userId) return

  isSaving.value = true

  try {
    const updatedRecipe: Partial<RecipeUpdate> & { recipe: string } = {
      // owner derived from session by backend
      recipe: currentRecipe.value._id,
    }

    // Map field names to API field names with type narrowing
    if (field === 'title' && typeof value === 'string') {
      updatedRecipe.newTitle = value
    } else if (field === 'description' && typeof value === 'string') {
      updatedRecipe.newDescription = value
    } else if (field === 'ingredients' && Array.isArray(value)) {
      updatedRecipe.newIngredients = value as RecipeUpdate['newIngredients']
    } else if (field === 'steps' && Array.isArray(value)) {
      updatedRecipe.newSteps = value as RecipeUpdate['newSteps']
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
      username: `user${authorId.slice(-4)}`,
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

async function loadCookbooksContainingRecipe(): Promise<void> {
  if (!currentRecipe.value) {
    cookbooksContainingRecipe.value = []
    return
  }

  try {
    const notebooks = await notebookStore.getNotebooksContainingRecipe(currentRecipe.value._id)
    cookbooksContainingRecipe.value = notebooks
    console.log('🔍 loadCookbooksContainingRecipe - notebooks containing recipe:', notebooks)
  } catch (error) {
    console.error('Failed to load cookbooks containing recipe:', error)
    cookbooksContainingRecipe.value = []
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
          username: `user${memberId.slice(-4)}`,
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
      annotationStore.loadAnnotationsForRecipe(recipeId),
      notebookStore.loadUserNotebooks(), // Load user notebooks for sharing
    ])

    // Load fork count
    if (currentRecipe.value?._id) {
      try {
        const response = await recipeApi.getForkCount(currentRecipe.value._id)
        forkCount.value = (response as { count: number }).count || 0
      } catch (error) {
        console.error('Failed to load fork count:', error)
        forkCount.value = 0
      }
    }

    // Restore current notebook if recipe is in a notebook
    if (!notebookStore.currentNotebook && currentRecipe.value) {
      const notebooks = await notebookStore.getNotebooksContainingRecipe(currentRecipe.value._id)
      if (notebooks.length > 0) {
        // Prefer user's own notebooks over shared ones
        const ownedNotebook = notebooks.find((nb) => nb.owner === authStore.userId)
        if (ownedNotebook) {
          await notebookStore.loadNotebookById(ownedNotebook._id)
        } else if (notebooks[0]) {
          // Use the first shared notebook
          await notebookStore.loadNotebookById(notebooks[0]._id)
        }
      }
    }

    // Load shared users, author name, and cookbooks after recipe is loaded
    await Promise.all([loadSharedUsers(), loadAuthorName(), loadCookbooksContainingRecipe()])
  }
})

const __templateBindings = {
  showDraftModal,
  currentDraft,
  isAcceptingDraft,
  sharedUsers,
  authorName,
  showShareModal,
  isSharing,
  showCreateForm,
  isCreating,
  newNotebook,
  editMode,
  showEditHint,
  editingTitle,
  editingDescription,
  editingIngredient,
  editingStep,
  editingTitleValue,
  editingDescriptionValue,
  editingIngredientValue,
  editingStepValue,
  isSaving,
  localIngredients,
  localSteps,
  hasUnsavedChanges,
  activeAnnotation,
  annotationPosition,
  isLoading,
  error,
  currentRecipe,
  currentNotebook,
  forkCount,
  annotationCount,
  cookbooksContainingRecipe,
  displayIngredients,
  displaySteps,
  availableNotebooks,
  isOwnRecipe,
  baseIngredients,
  baseSteps,
  isTitleModified,
  isDescriptionModified,
  isInCurrentCookbook,
  isRecipeInNotebook,
  goBack,
  shareRecipe,
  navigateToCookbook,
  forkRecipe,
  deleteRecipe,
  loadSharedUsers,
  loadCookbooksContainingRecipe,
  loadAuthorName,
  handleDraftReady,
  handleDraftClose,
  discardDraft,
  acceptDraft,
  handleAnnotationClick,
  closeAnnotation,
  toggleEditMode,
  saveAllChanges,
  startEditingTitle,
  saveTitle,
  cancelEditTitle,
  startEditingDescription,
  saveDescription,
  cancelEditDescription,
  startEditingIngredient,
  saveIngredient,
  cancelEditIngredient,
  startEditingStep,
  saveStep,
  cancelEditStep,
  addNewIngredient,
  addIngredientIfComplete,
  addStepIfComplete,
  autoExpandTextarea,
  handleDescriptionInput,
  addNewStep,
  removeIngredient,
  removeStep,
  updateRecipeField,
  shareToNotebook,
  createAndShareNotebook,
  cancelCreateNotebook,
  formatDate,
  getDraftConfidenceClass,
  getIngredientChangeClass,
  getStepChangeClass,
  AnnotationSystem,
  DraftVersionModal,
  Save,
  CircleDot,
  Sparkles,
  Check,
  Trash2,
}

void __templateBindings
</script>

<style scoped>
.recipe-view {
  width: calc(100% + 60px);
  min-height: calc(100vh - 60px);
  margin: -30px;
  padding: 30px;
  position: relative;
  background: white;
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
  margin-right: 8px;
}

.separator {
  color: #666;
  font-size: 14px;
}

.cookbook-name {
  color: var(--color-primary);
  font-weight: 500;
  font-size: 14px;
}

.recipe-actions {
  display: flex;
  gap: 10px;
}

.draft-btn,
.edit-mode-btn,
.versions-btn,
.fork-btn,
.share-btn,
.delete-btn {
  margin: 0 8px;
}

.draft-btn {
  color: var(--brand-indigo-500);
}

.edit-mode-btn {
  color: var(--brand-indigo-500);
}

.edit-mode-btn.active {
  color: var(--color-success);
}

.fork-btn {
  color: var(--color-success);
}

.fork-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fork-btn.disabled:hover {
  text-decoration: none;
}

.delete-btn {
  color: var(--color-danger);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
}

.delete-btn:hover {
  opacity: 0.8;
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
  border-radius: 0;
  padding: 30px;
  box-shadow: none;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
  color: var(--brand-orange-500);
}

.title-row .plain-title-input {
  flex: 1;
  margin-bottom: 0;
  color: var(--brand-orange-500);
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-left: auto;
}

.read-only-notice {
  margin-top: 8px;
  color: #555;
  font-size: 14px;
}

.plain-title,
.recipe-info h1 {
  color: var(--brand-orange-500);
  font-size: 2rem;
  margin-bottom: 0;
  font-weight: bold;
}

/* Plain inputs without borders */
.plain-title-input,
.plain-description-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
}

.plain-title-input {
  font-size: 2rem;
  font-weight: bold;
  padding: 12px 0;
  margin-bottom: 10px;
}

.plain-title-input::placeholder {
  color: var(--brand-orange-500);
  opacity: 0.6;
}

.plain-description-input {
  font-size: 1rem;
  line-height: 1.5;
  resize: none;
  overflow: hidden;
  min-height: 60px;
  padding: 8px 0;
}

.plain-description {
  font-size: 1rem;
  line-height: 1.5;
  color: #666;
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

.recipe-author-info {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 14px;
  flex-wrap: wrap;
}

.recipe-author {
  color: #666;
}

.recipe-date {
  color: #888;
}

.cookbook-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.cookbook-badge {
  background: none;
  border: none;
  color: var(--brand-indigo-500);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  padding: 0;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}

.cookbook-badge:hover,
.cookbook-badge:focus-visible {
  color: var(--brand-indigo-600);
  text-decoration: underline;
}

.cookbook-badge:focus-visible {
  outline: none;
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
  color: var(--brand-blue-400);
  margin-top: 10px;
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
  border-color: var(--brand-indigo-500);
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.form-textarea {
  resize: none;
  overflow: hidden;
  min-height: 80px;
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

.create-btn {
  color: var(--brand-blue-400);
}

.create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.create-btn:disabled:hover {
  text-decoration: none;
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.share-to-notebook-btn {
  color: var(--brand-indigo-500);
  margin-left: 8px;
}

.share-to-notebook-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.share-to-notebook-btn:disabled:hover {
  text-decoration: none;
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

.annotation-overlay-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: 999;
}

.ingredients-section,
.steps-section {
  margin-bottom: 40px;
  min-width: 0; /* Allow grid items to shrink below content size */
}

/* Content grid for side by side layout */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 2fr; /* 1:2 ratio (ingredients:instructions) */
  gap: 40px;
  width: 100%;
}

.ingredients-section h2,
.steps-section h2 {
  color: #333;
  font-size: 24px;
  margin-bottom: 20px;
  font-weight: 600;
  border-bottom: 2px solid var(--brand-blue-400);
  padding-bottom: 10px;
}

.ingredients-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ingredient-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
  user-select: none;
  cursor: pointer;
  min-width: 0;
}

.ingredient-content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  flex-wrap: wrap;
  min-width: 0;
}

.ingredient-quantity {
  font-weight: 600;
  color: var(--color-primary);
  word-wrap: break-word;
  overflow-wrap: break-word;
  min-width: 0;
}

.ingredient-unit {
  color: #666;
  word-wrap: break-word;
  overflow-wrap: break-word;
  min-width: 0;
}

.ingredient-name {
  font-weight: 500;
  color: #333;
  word-wrap: break-word;
  overflow-wrap: break-word;
  min-width: 0;
}

.ingredient-notes {
  color: #888;
  font-style: italic;
  word-break: break-word;
  word-wrap: break-word;
  overflow-wrap: break-word;
  min-width: 0;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #e9ecef;
  user-select: none;
  cursor: pointer;
}

.step-number {
  color: var(--brand-orange-500);
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
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
  font-size: 24px;
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

  .title-row {
    flex-wrap: wrap;
  }

  .header-actions {
    margin-left: 0;
  }

  .recipe-actions {
    justify-content: center;
  }

  .content-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .ingredient-item {
    flex-wrap: wrap;
  }

  .step-item {
    flex-wrap: wrap;
  }

  .step-number {
    align-self: flex-start;
  }

  .recipe-meta {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .recipe-author-info {
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
  color: #6c757d;
  margin-right: 8px;
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
  border-color: var(--brand-indigo-500);
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.form-textarea {
  resize: none;
  overflow: hidden;
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
  background: var(--brand-indigo-500);
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
  color: var(--color-danger);
  width: auto;
  height: auto;
  padding: 0;
  margin: 0 8px;
}

.add-btn {
  color: var(--color-success);
  padding: 0;
  margin-top: 12px;
  align-self: flex-start;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid #dee2e6;
}

.save-btn {
  color: var(--brand-blue-400);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-btn:disabled:hover {
  text-decoration: none;
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

/* Plain inputs for ingredients and steps */
.plain-input,
.plain-textarea {
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  padding: 4px 0;
  font-size: 16px;
}

.plain-textarea {
  resize: none;
  overflow: hidden;
  overflow-y: hidden;
  max-height: none !important;
  height: auto;
  box-sizing: border-box;
}

.plain-input::placeholder,
.plain-textarea::placeholder {
  color: #999;
  font-style: italic;
}

.ingredient-notes-input,
.step-notes-input {
  font-size: 14px;
}

.editable-input,
.editable-textarea {
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  padding: 4px 0;
  font-size: 16px;
}

.title-input {
  font-size: 2rem;
  font-weight: bold;
  padding: 12px 0;
}

.description-input {
  font-size: 1rem;
  line-height: 1.5;
  resize: none;
  overflow: hidden;
  min-height: 60px;
}

.ingredient-edit-form,
.step-edit-form {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.ingredient-quantity-input {
  flex: 1 1 0%; /* Amount */
  min-width: 0;
  font-weight: 500;
}

.ingredient-unit-input {
  flex: 1.5 1 0%;
  min-width: 0;
  font-weight: 500;
}

.ingredient-name-input {
  flex: 4 1 0%;
  min-width: 0;
  min-height: 1.5em;
  max-height: none !important;
  height: auto;
  font-weight: 500;
}

.ingredient-notes-input {
  flex: 5 1 0%;
  min-width: 0;
  min-height: 1.5em;
  max-height: none !important;
  height: auto;
}

.step-description-input {
  flex: 1 1 0%;
  min-width: 0;
  min-height: 1.5em;
  max-height: none !important;
  height: auto;
  font-size: 1rem;
  line-height: 1.4;
}

.step-duration-input {
  flex: 1 1 0%;
  min-width: 0;
}

.step-notes-input {
  flex: 0.6 1 0%;
  min-width: 0;
  min-height: 1.5em;
  max-height: none !important;
  height: auto;
}

.remove-ingredient-btn,
.remove-step-btn {
  color: var(--color-danger);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  margin: 0 4px;
}

.add-ingredient-btn,
.add-step-btn {
  color: var(--color-success);
  padding: 0;
  margin-top: 12px;
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
  border-color: var(--brand-indigo-500);
  color: var(--brand-indigo-500);
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
  color: var(--brand-indigo-500);
}

/* Save indicator styles */
.save-indicator {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 500;
}

.saving-indicator {
  color: var(--brand-blue-400);
  animation: pulse 1.5s ease-in-out infinite;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.unsaved-indicator {
  color: var(--brand-orange-500);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.saved-indicator {
  color: #6c757d;
  display: inline-flex;
  align-items: center;
  gap: 6px;
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

/* Change highlighting styles for draft versions */
.ingredient-item.change-added,
.step-item.change-added,
.ingredient-item.change-removed,
.step-item.change-removed,
.ingredient-item.change-modified,
.step-item.change-modified {
  background: #fff3cd;
  padding-left: 10px;
  margin-left: -10px;
  border-left: 4px solid #ffc107;
  border-radius: 0;
}

.draft-field-highlight {
  background-color: #fff3cd !important;
  box-shadow: inset 4px 0 0 #ffc107;
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease;
}

.change-badge {
  font-weight: bold;
  font-size: 18px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.change-badge.added {
  background: #28a745;
  color: white;
}

.change-badge.removed {
  background: #dc3545;
  color: white;
}

.change-badge.modified {
  background: #ffc107;
  color: #856404;
}

/* Draft Banner Styles */
.draft-banner {
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #e7f3ff 0%, #d1ecf1 100%);
  border: 2px solid var(--brand-blue-400);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.draft-banner-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 15px;
}

.draft-version-input {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(88, 146, 168, 0.3);
}

.draft-version-input label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
  white-space: nowrap;
}

.version-num-input {
  padding: 8px 12px;
  border: 2px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  width: 150px;
  font-weight: 500;
}

.version-num-input:focus {
  outline: none;
  border-color: var(--brand-blue-400);
  box-shadow: 0 0 0 3px rgba(88, 146, 168, 0.1);
}

.base-version-hint {
  font-size: 12px;
  color: #666;
  font-style: italic;
  white-space: nowrap;
}

.draft-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.draft-label {
  font-size: 18px;
  font-weight: 600;
  color: var(--brand-blue-400);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.draft-confidence {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.draft-confidence.high {
  background: #d4edda;
  color: #155724;
}

.draft-confidence.medium {
  background: #fff3cd;
  color: #856404;
}

.draft-confidence.low {
  background: #f8d7da;
  color: #721c24;
}

.draft-actions {
  display: flex;
  gap: 10px;
}

.discard-draft-btn {
  margin: 0 8px;
  color: #6c757d;
}

.draft-banner .draft-notes {
  padding: 15px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  color: #004085;
}

.skeleton {
  pointer-events: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.shimmer {
  position: relative;
  overflow: hidden;
  background-color: #f1f3f5;
  border-radius: 8px;
}

.shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    rgba(241, 243, 245, 0) 0%,
    rgba(230, 236, 247, 0.8) 50%,
    rgba(241, 243, 245, 0) 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

.skeleton .title-row {
  align-items: center;
}

.skeleton-title {
  height: 34px;
  width: 50%;
  border-radius: 12px;
}

.skeleton-line {
  height: 14px;
  margin: 12px 0;
}

.skeleton-line.short {
  width: 60%;
}

.skeleton-meta,
.skeleton-tags,
.skeleton .header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 20px;
}

.skeleton-pill {
  height: 18px;
  min-width: 80px;
}

.skeleton-pill.wide {
  min-width: 140px;
}

.skeleton-button {
  height: 32px;
  min-width: 90px;
  border-radius: 16px;
}

.skeleton-section-title {
  height: 24px;
  width: 40%;
  margin-bottom: 20px;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-list-item {
  height: 20px;
  border-radius: 6px;
}

.skeleton-list-block {
  height: 56px;
  border-radius: 10px;
}

.skeleton-grid {
  margin-top: 30px;
}
</style>
