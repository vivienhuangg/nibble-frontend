<template>
  <MainLayout>
    <div class="recipe-view">
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="recipe-content">
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

        <!-- Recipe Title and Meta -->
        <div class="recipe-info">
          <div class="title-row">
            <!-- Always show editable input -->
            <input
              v-model="recipeData.title"
              placeholder="Recipe title"
              class="plain-title-input"
            />

            <div class="save-indicator">
              <span v-if="isSaving" class="saving-indicator">
                <Save :size="16" :stroke-width="2" />
                Saving...
              </span>
              <span v-else-if="hasChanges" class="unsaved-indicator">
                <CircleDot :size="16" :stroke-width="2" />
                Draft
              </span>
              <span v-else class="saved-indicator">
                <Pencil :size="16" :stroke-width="2" />
                Start editing...
              </span>
            </div>
            <div class="header-actions">
              <button
                type="button"
                @click="handleAIDraftClick"
                :disabled="isSaving || currentDraft !== null"
                :title="'Ask AI to generate a recipe from scratch or modify what you have'"
                class="draft-btn header-action-btn"
              >
                AI Draft
              </button>
              <button
                type="button"
                @click="handleCreateRecipe"
                :disabled="isSaving"
                class="save-btn header-action-btn"
              >
                {{
                  isSaving
                    ? tempRecipeId
                      ? 'Saving...'
                      : 'Creating...'
                    : tempRecipeId
                      ? 'Save'
                      : 'Create'
                }}
              </button>
              <button type="button" @click="goBack" class="cancel-btn header-action-btn">
                Cancel
              </button>
            </div>
          </div>

          <!-- Always show editable textarea -->
          <textarea
            v-model="recipeData.description"
            placeholder="Recipe description (optional)"
            class="plain-description-input"
            rows="3"
            @input="autoResizeTextarea"
          />
        </div>

        <!-- Ingredients and Steps Side by Side -->
        <div class="content-grid">
          <!-- Ingredients Section -->
          <section class="ingredients-section">
            <h2>Ingredients</h2>
            <div class="ingredients-list">
              <!-- Always show editable inputs -->
              <div
                v-for="(ingredient, index) in recipeData.ingredients"
                :key="index"
                class="ingredient-item"
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
                  @input="autoResizeTextarea"
                  class="plain-textarea ingredient-name-input"
                  placeholder="Ingredient name"
                  rows="1"
                ></textarea>
                <textarea
                  v-model="ingredient.notes"
                  @keydown.enter="addIngredientIfComplete(index)"
                  @blur="addIngredientIfComplete(index)"
                  @input="autoResizeTextarea"
                  class="plain-textarea ingredient-notes-input"
                  placeholder="Notes (optional)"
                  rows="1"
                ></textarea>
              </div>
            </div>
          </section>

          <!-- Steps Section -->
          <section class="steps-section">
            <h2>Instructions</h2>
            <div class="steps-list">
              <!-- Always show editable inputs -->
              <div v-for="(step, index) in recipeData.steps" :key="index" class="step-item">
                <div class="step-number">{{ index + 1 }}</div>
                <textarea
                  v-model="step.description"
                  @blur="addStepIfComplete(index)"
                  @input="autoResizeTextarea"
                  class="plain-textarea step-description-input"
                  placeholder="Step description"
                  rows="3"
                ></textarea>
                <textarea
                  v-model="step.notes"
                  @keydown.enter="addStepIfComplete(index)"
                  @blur="addStepIfComplete(index)"
                  @input="autoResizeTextarea"
                  class="plain-textarea step-notes-input"
                  placeholder="Notes (optional)"
                  rows="1"
                ></textarea>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- AI Draft Modal -->
    <DraftVersionModal
      :show-modal="showDraftModal"
      :recipe-id="tempRecipeId"
      :base-ingredients="currentIngredients"
      :base-steps="currentSteps"
      @close="showDraftModal = false"
      @draft-ready="handleDraftReady"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { CircleDot, Pencil, Save, Sparkles } from 'lucide-vue-next'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  watchEffect,
} from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import DraftVersionModal from '@/components/DraftVersionModal.vue'
import MainLayout from '@/components/MainLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotebookStore } from '@/stores/notebook'
import { useRecipeStore } from '@/stores/recipe'
import type { Ingredient, Step, VersionDraft } from '@/types/api'

void DraftVersionModal
void MainLayout
void getDraftConfidenceClass
void CircleDot
void Pencil
void Save
void Sparkles

const route = useRoute()
const router = useRouter()
const recipeStore = useRecipeStore()
const notebookStore = useNotebookStore()
const authStore = useAuthStore()

const notebookId = computed(() => {
  const id = route.query.notebookId as string | undefined
  return id
})

const recipeData = reactive({
  title: '',
  description: '',
  ingredients: [{ name: '', quantity: '', unit: '', notes: '' }] as Ingredient[],
  steps: [{ description: '', notes: '' }] as Step[],
})

const isSaving = ref(false)
const localError = ref<string>('')
const showDraftModal = ref(false)
const tempRecipeId = ref<string>('')
const currentDraft = ref<VersionDraft | null>(null)
const isAcceptingDraft = ref(false)
const hasFinalized = ref(false)

const error = computed(() => localError.value || recipeStore.error)
watchEffect(() => {
  if (error.value) {
    console.error('Error:', error.value)
  }
})

const hasChanges = computed(() => {
  return (
    recipeData.title.trim() !== '' ||
    recipeData.description.trim() !== '' ||
    recipeData.ingredients.length > 0 ||
    recipeData.steps.length > 0
  )
})

const currentIngredients = computed(() => {
  return recipeData.ingredients.filter((ing) => ing.name && ing.quantity)
})

const currentSteps = computed(() => {
  return recipeData.steps.filter((step) => step.description)
})

function autoResizeTextarea(event: Event) {
  const textarea = event.target as HTMLTextAreaElement | null
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}

function resizeAllTextareas() {
  const textareas = document.querySelectorAll<HTMLTextAreaElement>(
    '.plain-textarea, .plain-description-input',
  )
  textareas.forEach((textarea) => {
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  })
}

onMounted(() => {
  nextTick(() => {
    resizeAllTextareas()
  })
})

watch(
  () => recipeData.description,
  () => {
    nextTick(() => resizeAllTextareas())
  },
)

watch(
  () => recipeData.ingredients,
  () => {
    nextTick(() => resizeAllTextareas())
  },
  { deep: true },
)

watch(
  () => recipeData.steps,
  () => {
    nextTick(() => resizeAllTextareas())
  },
  { deep: true },
)

async function ensureRecipeInCookbook(recipeId: string) {
  if (!notebookId.value || notebookId.value === 'undefined') {
    return
  }

  try {
    await notebookStore.shareRecipe({
      notebook: notebookId.value,
      recipe: recipeId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!/already/i.test(message)) {
      throw err
    }
  }
}

async function cleanupTempRecipe() {
  if (!tempRecipeId.value || hasFinalized.value) {
    return
  }

  try {
    await recipeStore.deleteRecipe(tempRecipeId.value)
  } catch (err) {
    console.error('Failed to delete temporary recipe:', err)
  } finally {
    tempRecipeId.value = ''
  }
}

onBeforeUnmount(() => {
  void cleanupTempRecipe()
})

onBeforeRouteLeave(async (_to, _from, next) => {
  if (tempRecipeId.value && !hasFinalized.value) {
    await cleanupTempRecipe()
  }
  next()
})

defineExpose({
  autoResizeTextarea,
  goBack,
  handleCreateRecipe,
  handleAIDraftClick,
  addIngredientIfComplete,
  addStepIfComplete,
  handleDraftReady,
  discardDraft,
  acceptDraft,
  currentIngredients,
  currentSteps,
  error,
  getDraftConfidenceClass,
  CircleDot,
  Pencil,
  Save,
  Sparkles,
  DraftVersionModal,
  MainLayout,
})

function goBack() {
  // If we came from a cookbook, go back to it
  if (notebookId.value) {
    router.push(`/cookbooks/${notebookId.value}`)
  } else {
    // Otherwise go to home (recipes must be in a cookbook)
    router.push('/')
  }
}

async function handleCreateRecipe() {
  console.log('🔍 handleCreateRecipe - notebookId.value:', notebookId.value)
  console.log('🔍 handleCreateRecipe - route.query:', route.query)
  console.log('🔍 handleCreateRecipe - route.query.notebookId:', route.query.notebookId)
  console.log('🔍 handleCreateRecipe - tempRecipeId:', tempRecipeId.value)

  // Recipes must be in a cookbook
  if (!notebookId.value || notebookId.value === 'undefined') {
    localError.value = 'Please create recipes from within a cookbook'
    return
  }

  if (!hasChanges.value) {
    localError.value = 'Please add at least a title to create a recipe'
    return
  }

  if (!authStore.userId) {
    localError.value = 'You must be logged in to create recipes'
    return
  }

  try {
    recipeStore.clearError()
    localError.value = ''
    isSaving.value = true

    // Filter out empty ingredients and steps
    const ingredients = recipeData.ingredients.filter((ing) => ing.name && ing.quantity)
    const steps = recipeData.steps.filter((step) => step.description)

    if (ingredients.length === 0) {
      localError.value = 'Please add at least one ingredient'
      isSaving.value = false
      return
    }

    if (steps.length === 0) {
      localError.value = 'Please add at least one step'
      isSaving.value = false
      return
    }

    let recipeId = tempRecipeId.value

    if (tempRecipeId.value) {
      console.log('📝 Updating existing temp recipe:', tempRecipeId.value)
      await recipeStore.updateRecipe(tempRecipeId.value, {
        newTitle: recipeData.title,
        newDescription: recipeData.description || undefined,
        newIngredients: ingredients,
        newSteps: steps,
      })
    } else {
      console.log('📝 Creating new recipe')
      recipeId = await recipeStore.createRecipe({
        title: recipeData.title,
        description: recipeData.description || undefined,
        ingredients,
        steps,
      })
    }

    if (recipeId) {
      try {
        await ensureRecipeInCookbook(recipeId)
      } catch (err) {
        console.error('Failed to add recipe to cookbook:', err)
        localError.value = 'Failed to add recipe to cookbook. Please try again.'
        isSaving.value = false
        return
      }
    }

    // Clear draft banner if it exists
    currentDraft.value = null
    hasFinalized.value = true
    tempRecipeId.value = recipeId || ''

    // Navigate back to the cookbook or recipe detail
    if (notebookId.value && notebookId.value !== 'undefined') {
      router.push(`/cookbooks/${notebookId.value}`)
    } else if (recipeId) {
      router.push(`/recipe/${recipeId}`)
    } else {
      router.push('/')
    }
  } catch (err) {
    console.error('Create recipe error:', err)
    localError.value =
      err instanceof Error ? err.message : 'Failed to create recipe. Please try again.'
  } finally {
    isSaving.value = false
  }
}

function addIngredientIfComplete(index: number) {
  const ing = recipeData.ingredients[index]
  if (ing?.name && ing?.quantity && index === recipeData.ingredients.length - 1) {
    recipeData.ingredients.push({
      name: '',
      quantity: '',
      unit: '',
      notes: '',
    })

    nextTick(() => resizeAllTextareas())
  }
}

function addStepIfComplete(index: number) {
  const step = recipeData.steps[index]
  if (step?.description && index === recipeData.steps.length - 1) {
    recipeData.steps.push({ description: '', notes: '' })
    nextTick(() => resizeAllTextareas())
  }
}

// Handle AI Draft button click
async function handleAIDraftClick() {
  console.log('🤖 AI Draft clicked')

  // If we already have a temp recipe, just show the modal
  if (tempRecipeId.value) {
    showDraftModal.value = true
    return
  }

  // Otherwise, create a temporary recipe first
  if (!authStore.userId) {
    localError.value = 'You must be logged in to use AI draft'
    return
  }

  if (!notebookId.value || notebookId.value === 'undefined') {
    localError.value = 'Please create recipes from within a cookbook'
    return
  }

  try {
    recipeStore.clearError()
    localError.value = ''
    isSaving.value = true

    // Filter out empty ingredients and steps
    const ingredients = recipeData.ingredients.filter((ing) => ing.name && ing.quantity)
    const steps = recipeData.steps.filter((step) => step.description)

    // Create recipe with current data or placeholders if starting from scratch
    // The title can be "New Recipe" - the AI will suggest a better one
    const recipeId = await recipeStore.createRecipe({
      title: recipeData.title.trim() || 'New Recipe',
      description: recipeData.description || 'Recipe created with AI assistance',
      ingredients:
        ingredients.length > 0
          ? ingredients
          : [{ name: 'ingredient', quantity: '1', unit: '', notes: '' }],
      steps: steps.length > 0 ? steps : [{ description: 'step', notes: '' }],
    })

    tempRecipeId.value = recipeId
    hasFinalized.value = false
    showDraftModal.value = true
  } catch (err) {
    console.error('Create temp recipe error:', err)
    localError.value =
      err instanceof Error ? err.message : 'Failed to create temporary recipe. Please try again.'
  } finally {
    isSaving.value = false
  }
}

// Handle draft ready from modal - load into editable form
function handleDraftReady(draft: VersionDraft) {
  console.log('📥 Draft ready, loading into form:', draft)
  currentDraft.value = draft
  showDraftModal.value = false

  // Load draft ingredients into form
  recipeData.ingredients = [
    ...draft.ingredients.map((ing) => ({ ...ing })),
    { name: '', quantity: '', unit: '', notes: '' }, // Add empty row for new input
  ]

  // Load draft steps into form
  recipeData.steps = [
    ...draft.steps.map((step) => ({ ...step })),
    { description: '', notes: '' }, // Add empty row for new input
  ]

  nextTick(() => resizeAllTextareas())

  // Use AI-suggested title if available
  const hasPlaceholderTitle = !recipeData.title.trim() || recipeData.title === 'New Recipe'
  if (draft.title?.trim()) {
    // Use the AI-suggested title directly
    recipeData.title = draft.title
  } else if (hasPlaceholderTitle && draft.notes) {
    // Fallback: Try to extract a title from the notes (for backward compatibility)
    const titleMatch = draft.notes.match(/^(?:Title|Recipe Name|Name):\s*(.+?)(?:\n|$)/im)
    if (titleMatch?.[1]) {
      recipeData.title = titleMatch[1].trim()
    } else {
      // Try to use first line if it's short and looks like a title
      const lines = draft.notes.split('\n')
      const firstLine = lines[0]?.trim()
      if (firstLine && firstLine.length < 60 && !firstLine.includes('.') && lines.length > 1) {
        recipeData.title = firstLine
      }
    }
  }

  // Set description from notes if available
  if (draft.notes?.trim()) {
    // Remove title line from notes if it was embedded there
    let notesContent = draft.notes
    const titleMatch = draft.notes.match(/^(?:Title|Recipe Name|Name):\s*.+?(?:\n|$)/im)
    if (titleMatch) {
      notesContent = draft.notes.replace(/^(?:Title|Recipe Name|Name):\s*.+?(?:\n|$)/im, '').trim()
    } else {
      // Remove first line if it was used as title
      const lines = draft.notes.split('\n')
      const firstLine = lines[0]?.trim()
      if (firstLine && firstLine === recipeData.title && lines.length > 1) {
        notesContent = lines.slice(1).join('\n').trim()
      }
    }

    // Set or append to description
    if (!recipeData.description || recipeData.description === 'Recipe created with AI assistance') {
      recipeData.description = notesContent
    } else {
      recipeData.description += '\n\n' + notesContent
    }
  }

  console.log('✅ Draft loaded into editable form')
}

// Discard the current draft and reset to original data
function discardDraft() {
  currentDraft.value = null
  recipeData.ingredients = [{ name: '', quantity: '', unit: '', notes: '' }]
  recipeData.steps = [{ description: '', notes: '' }]
  recipeData.description = ''

  nextTick(() => {
    resizeAllTextareas()
  })
}

// Save the draft changes
async function acceptDraft() {
  if (!currentDraft.value) {
    console.error('❌ No draft to save')
    return
  }

  console.log('✅ Saving draft changes')
  isAcceptingDraft.value = true

  try {
    // The user has already edited recipeData directly, so we just need to save it
    // Filter out empty ingredients and steps
    const ingredients = recipeData.ingredients.filter((ing) => ing.name && ing.quantity)
    const steps = recipeData.steps.filter((step) => step.description)

    // Update the recipe with the edited data
    if (!tempRecipeId.value) {
      console.error('❌ No temporary recipe to apply draft to')
      return
    }

    await recipeStore.updateRecipe(tempRecipeId.value, {
      newTitle: recipeData.title.trim() || 'New Recipe',
      newDescription: recipeData.description || 'Recipe created with AI assistance',
      newIngredients:
        ingredients.length > 0
          ? ingredients
          : [{ name: 'ingredient', quantity: '1', unit: '', notes: '' }],
      newSteps: steps.length > 0 ? steps : [{ description: 'step', notes: '' }],
    })

    try {
      await ensureRecipeInCookbook(tempRecipeId.value)
    } catch (err) {
      console.error('Failed to add recipe to cookbook after accepting draft:', err)
      localError.value =
        err instanceof Error ? err.message : 'Failed to add recipe to cookbook. Please try again.'
      return
    }

    console.log('✅ Draft changes saved successfully')

    currentDraft.value = null
    hasFinalized.value = true

    if (notebookId.value && notebookId.value !== 'undefined') {
      router.push(`/recipe/${tempRecipeId.value}?notebookId=${notebookId.value}`)
    } else {
      router.push(`/recipe/${tempRecipeId.value}`)
    }
  } catch (err) {
    console.error('Failed to save draft changes:', err)
    localError.value =
      err instanceof Error ? err.message : 'Failed to save changes. Please try again.'
  } finally {
    isAcceptingDraft.value = false
  }
}

// Get draft confidence class for styling
function getDraftConfidenceClass() {
  if (!currentDraft.value) return ''
  const confidence = currentDraft.value.confidence
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.5) return 'medium'
  return 'low'
}
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

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-left: auto;
}

.header-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
}

.header-action-btn:disabled {
  cursor: not-allowed;
}

.back-btn {
  background: white;
  border: none;
  padding: 8px 0;
  cursor: pointer;
  color: #6c757d;
  font-size: 14px;
  transition: color 0.2s;
}

.draft-btn {
  color: var(--brand-indigo-500);
}

.draft-btn:hover:not(:disabled) {
  text-decoration: underline;
}

.draft-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.draft-btn:disabled:hover {
  text-decoration: none;
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

.cancel-btn {
  color: #6c757d;
}

.error-message {
  background-color: rgba(250, 132, 40, 0.1);
  color: var(--brand-burnt-500);
  padding: 12px 30px;
  border-radius: 8px;
  margin: -30px -30px 20px -30px;
  border: 1px solid var(--brand-orange-500);
}

.recipe-content {
  background: white;
  border-radius: 0;
  padding: 30px;
  box-shadow: none;
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
  min-height: 1.5em;
  line-height: 1.4;
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

/* Content grid for side by side layout */
.content-grid {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: 40px;
}

/* Save indicator styles */
.save-indicator {
  display: flex;
  align-items: center;
  margin-top: 0;
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
  min-height: 0;
}

.ingredient-quantity-input {
  flex: 1 1 0%;
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
}

.ingredient-notes-input {
  flex: 5 1 0%;
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
  min-height: 0; /* Allow natural height based on content */
}

.step-description-input {
  flex: 1 1 0%;
  min-width: 0;
}

.step-notes-input {
  flex: 0.6 1 0%;
  min-width: 0;
}

.step-number {
  color: var(--brand-orange-500);
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

/* Preview mode styles */
.preview-title {
  color: var(--brand-orange-500);
  font-size: 2rem;
  font-weight: bold;
  margin: 0;
  padding: 12px 0;
}

.preview-description {
  color: #666;
  font-size: 1rem;
  line-height: 1.5;
  padding: 8px 0;
  margin-bottom: 10px;
  white-space: pre-wrap;
}

.ingredient-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.ingredient-quantity {
  font-weight: 600;
  color: var(--color-primary);
  padding: 4px 0;
  width: 100px;
}

.ingredient-unit {
  color: #666;
  padding: 4px 0;
  width: 100px;
}

.ingredient-name {
  font-weight: 500;
  color: #333;
  padding: 4px 0;
  flex: 1;
}

.ingredient-notes {
  color: #888;
  font-style: italic;
  font-size: 14px;
  padding: 4px 0;
  flex: 0.6;
  word-wrap: break-word;
}

.step-content {
  flex: 1;
}

.step-description {
  margin: 0;
  color: #333;
  line-height: 1.6;
  font-size: 16px;
  white-space: pre-wrap;
}

.step-notes {
  color: #888;
  font-size: 14px;
  font-style: italic;
  margin-top: 8px;
}

/* Preview text elements - match the input styling but as plain text */
.step-description-preview {
  flex: 1;
  padding: 4px 0;
  font-size: 16px;
  color: #333;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  min-height: 0;
  /* Mimic textarea behavior - grows with content */
}

.step-notes-preview {
  flex: 0.6;
  font-size: 14px;
  color: #888;
  font-style: italic;
  padding: 4px 0;
  word-wrap: break-word;
  min-height: 0;
}

/* Draft banner styles - match RecipeView */
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
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
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
  margin-top: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  color: #004085;
  font-size: 14px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .recipe-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .save-btn {
    margin-left: 0;
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

  .title-row {
    flex-wrap: wrap;
  }
}
</style>
