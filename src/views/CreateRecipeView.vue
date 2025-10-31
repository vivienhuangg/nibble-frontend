<template>
  <MainLayout>
    <div class="recipe-view">
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="recipe-content">
        <!-- Recipe Title and Meta -->
        <div class="recipe-info">
          <div class="title-row">
            <input
              v-model="recipeData.title"
              placeholder="Recipe title"
              class="plain-title-input"
            />
            <div class="save-indicator">
              <span v-if="isSaving" class="saving-indicator">💾 Saving...</span>
              <span v-else-if="hasChanges" class="unsaved-indicator">● Draft</span>
              <span v-else class="saved-indicator">✏️ Start editing...</span>
            </div>
            <div class="header-actions">
              <button
                type="button"
                @click="handleCreateRecipe"
                :disabled="isSaving"
                class="save-btn"
              >
                {{ isSaving ? 'Creating...' : 'Create' }}
              </button>
              <button type="button" @click="goBack" class="cancel-btn">Cancel</button>
            </div>
          </div>

          <textarea
            v-model="recipeData.description"
            placeholder="Recipe description (optional)"
            class="plain-description-input"
            rows="3"
          />
        </div>

        <!-- Ingredients and Steps Side by Side -->
        <div class="content-grid">
          <!-- Ingredients Section -->
          <section class="ingredients-section">
            <h2>Ingredients</h2>
            <div class="ingredients-list">
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
                  style="width: 100px"
                />
                <input
                  v-model="ingredient.unit"
                  @keydown.enter="addIngredientIfComplete(index)"
                  @blur="addIngredientIfComplete(index)"
                  class="plain-input ingredient-unit-input"
                  placeholder="Unit"
                  style="width: 100px"
                />
                <input
                  v-model="ingredient.name"
                  @keydown.enter="addIngredientIfComplete(index)"
                  @blur="addIngredientIfComplete(index)"
                  class="plain-input ingredient-name-input"
                  placeholder="Ingredient name"
                  style="flex: 1"
                />
                <input
                  v-model="ingredient.notes"
                  @keydown.enter="addIngredientIfComplete(index)"
                  @blur="addIngredientIfComplete(index)"
                  class="plain-input ingredient-notes-input"
                  placeholder="Notes (optional)"
                  style="flex: 0.6"
                />
              </div>
            </div>
          </section>

          <!-- Steps Section -->
          <section class="steps-section">
            <h2>Instructions</h2>
            <div class="steps-list">
              <div v-for="(step, index) in recipeData.steps" :key="index" class="step-item">
                <div class="step-number">{{ index + 1 }}</div>
                <textarea
                  v-model="step.description"
                  @blur="addStepIfComplete(index)"
                  class="plain-textarea step-description-input"
                  placeholder="Step description"
                  rows="3"
                  style="flex: 1"
                ></textarea>
                <input
                  v-model="step.notes"
                  @keydown.enter="addStepIfComplete(index)"
                  @blur="addStepIfComplete(index)"
                  class="plain-input step-notes-input"
                  placeholder="Notes (optional)"
                  style="flex: 0.6"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/components/MainLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotebookStore } from '@/stores/notebook'
import { useRecipeStore } from '@/stores/recipe'
import type { Ingredient, Step } from '@/types/api'

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

const error = computed(() => localError.value || recipeStore.error)
const hasChanges = computed(() => {
  return (
    recipeData.title.trim() !== '' ||
    recipeData.description.trim() !== '' ||
    recipeData.ingredients.length > 0 ||
    recipeData.steps.length > 0
  )
})

function goBack() {
  // If we came from a cookbook, go back to it
  if (notebookId.value) {
    router.push(`/cookbook/${notebookId.value}`)
  } else {
    // Otherwise go to home (recipes must be in a cookbook)
    router.push('/')
  }
}

async function handleCreateRecipe() {
  // Recipes must be in a cookbook
  if (!notebookId.value) {
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

    const recipeId = await recipeStore.createRecipe({
      title: recipeData.title,
      description: recipeData.description || undefined,
      ingredients,
      steps,
    })

    // Add the recipe to the cookbook
    try {
      await notebookStore.shareRecipe({
        sharer: authStore.userId,
        notebook: notebookId.value,
        recipe: recipeId,
      })
    } catch (err) {
      console.error('Failed to add recipe to cookbook:', err)
      localError.value = 'Recipe created but failed to add to cookbook. Please try adding it manually.'
      isSaving.value = false
      return
    }
    
    // Navigate back to the cookbook
    router.push(`/cookbook/${notebookId.value}`)
  } catch (err) {
    console.error('Create recipe error:', err)
    localError.value = 'Failed to create recipe. Please try again.'
  } finally {
    isSaving.value = false
  }
}

function addIngredientIfComplete(index: number) {
  const ing = recipeData.ingredients[index]
  if (ing?.name && ing?.quantity && index === recipeData.ingredients.length - 1) {
    recipeData.ingredients.push({ name: '', quantity: '', unit: '', notes: '' })
  }
}

function addStepIfComplete(index: number) {
  const step = recipeData.steps[index]
  if (step?.description && index === recipeData.steps.length - 1) {
    recipeData.steps.push({ description: '', notes: '' })
  }
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

.back-btn {
  background: white;
  border: none;
  padding: 8px 0;
  cursor: pointer;
  color: #6c757d;
  font-size: 14px;
  transition: color 0.2s;
}


.save-btn {
  margin-left: auto;
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
  margin-right: 8px;
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
  resize: vertical;
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
  resize: vertical;
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
  font-size: 14px;
  font-weight: 500;
}

.saving-indicator {
  color: var(--brand-blue-400);
  animation: pulse 1.5s ease-in-out infinite;
}

.unsaved-indicator {
  color: var(--brand-orange-500);
}

.saved-indicator {
  color: #6c757d;
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
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
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
}

.step-number {
  color: var(--brand-orange-500);
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
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
