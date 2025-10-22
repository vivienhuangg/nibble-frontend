<template>
  <MainLayout>
    <div class="recipes-container">
      <div class="recipes-header">
        <h1>My Recipes</h1>
        <button @click="showCreateForm = true" class="create-btn">+ Create Recipe</button>
      </div>

      <!-- Create Recipe Form -->
      <div v-if="showCreateForm" class="create-form-overlay">
        <div class="create-form">
          <h3>Create New Recipe</h3>
          <form @submit.prevent="handleCreateRecipe">
            <div class="form-group">
              <label for="title">Recipe Title</label>
              <input
                id="title"
                v-model="newRecipe.title"
                type="text"
                required
                placeholder="Enter recipe title"
              />
            </div>

            <div class="form-group">
              <label for="description">Description</label>
              <textarea
                id="description"
                v-model="newRecipe.description"
                placeholder="Enter recipe description (optional)"
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label>Ingredients</label>
              <div
                v-for="(ingredient, index) in newRecipe.ingredients"
                :key="index"
                class="ingredient-row"
              >
                <input v-model="ingredient.name" placeholder="Ingredient name" required />
                <input v-model="ingredient.quantity" placeholder="Quantity" required />
                <input v-model="ingredient.unit" placeholder="Unit (optional)" />
                <button type="button" @click="removeIngredient(index)" class="remove-btn">×</button>
              </div>
              <button type="button" @click="addIngredient" class="add-btn">+ Add Ingredient</button>
            </div>

            <div class="form-group">
              <label>Steps</label>
              <div v-for="(step, index) in newRecipe.steps" :key="index" class="step-row">
                <textarea
                  v-model="step.description"
                  placeholder="Step description"
                  required
                  rows="2"
                ></textarea>
                <input
                  v-model.number="step.duration"
                  type="number"
                  placeholder="Duration (minutes)"
                />
                <button type="button" @click="removeStep(index)" class="remove-btn">×</button>
              </div>
              <button type="button" @click="addStep" class="add-btn">+ Add Step</button>
            </div>

            <div class="form-actions">
              <button type="button" @click="cancelCreate" class="cancel-btn">Cancel</button>
              <button type="submit" :disabled="isLoading" class="submit-btn">
                {{ isLoading ? 'Creating...' : 'Create Recipe' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Recipes List -->
      <div v-if="isLoading" class="loading">Loading recipes...</div>

      <div v-else-if="userRecipes.length === 0" class="empty-state">
        <p>No recipes yet. Create your first recipe!</p>
      </div>

      <div v-else class="recipes-grid">
        <div
          v-for="recipe in userRecipes"
          :key="recipe._id"
          class="recipe-card"
          @click="viewRecipe(recipe._id)"
        >
          <h3>{{ recipe.title }}</h3>
          <p v-if="recipe.description" class="recipe-description">
            {{ recipe.description }}
          </p>
          <div class="recipe-meta">
            <span class="ingredient-count">{{ recipe.ingredients.length }} ingredients</span>
            <span class="step-count">{{ recipe.steps.length }} steps</span>
          </div>
          <div v-if="recipe.tags.length > 0" class="recipe-tags">
            <span v-for="tag in recipe.tags" :key="tag" class="tag">
              {{ tag }}
            </span>
          </div>
          <div class="recipe-date">Created: {{ formatDate(recipe.created) }}</div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/components/MainLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useRecipeStore } from '@/stores/recipe'
import type { Ingredient, Step } from '@/types/api'

const router = useRouter()
const recipeStore = useRecipeStore()
const authStore = useAuthStore()

const showCreateForm = ref(false)
const isLoading = computed(() => recipeStore.isLoading)
const error = computed(() => recipeStore.error)
const userRecipes = computed(() => recipeStore.userRecipes)

const newRecipe = reactive({
  title: '',
  description: '',
  ingredients: [{ name: '', quantity: '', unit: '', notes: '' }] as Ingredient[],
  steps: [{ description: '', duration: undefined, notes: '' }] as Step[],
})

function addIngredient() {
  newRecipe.ingredients.push({ name: '', quantity: '', unit: '', notes: '' })
}

function removeIngredient(index: number) {
  if (newRecipe.ingredients.length > 1) {
    newRecipe.ingredients.splice(index, 1)
  }
}

function addStep() {
  newRecipe.steps.push({ description: '', duration: undefined, notes: '' })
}

function removeStep(index: number) {
  if (newRecipe.steps.length > 1) {
    newRecipe.steps.splice(index, 1)
  }
}

function cancelCreate() {
  showCreateForm.value = false
  resetForm()
}

function resetForm() {
  newRecipe.title = ''
  newRecipe.description = ''
  newRecipe.ingredients = [{ name: '', quantity: '', unit: '', notes: '' }]
  newRecipe.steps = [{ description: '', duration: undefined, notes: '' }]
}

async function handleCreateRecipe() {
  try {
    recipeStore.clearError()

    // Filter out empty ingredients and steps
    const ingredients = newRecipe.ingredients.filter((ing) => ing.name && ing.quantity)
    const steps = newRecipe.steps.filter((step) => step.description)

    await recipeStore.createRecipe({
      title: newRecipe.title,
      description: newRecipe.description || undefined,
      ingredients,
      steps,
    })

    showCreateForm.value = false
    resetForm()
  } catch (err) {
    console.error('Create recipe error:', err)
  }
}

function viewRecipe(recipeId: string) {
  router.push(`/recipe/${recipeId}`)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

onMounted(async () => {
  console.log('🔍 RecipesView onMounted - authStore.isAuthenticated:', authStore.isAuthenticated)
  console.log('🔍 RecipesView onMounted - authStore.userId:', authStore.userId)
  console.log('🔍 RecipesView onMounted - authStore.currentUser:', authStore.currentUser)

  if (authStore.isAuthenticated) {
    console.log('🔍 RecipesView onMounted - calling loadUserRecipes')
    await recipeStore.loadUserRecipes()
  } else {
    console.log('🔍 RecipesView onMounted - not authenticated, skipping loadUserRecipes')
  }
})
</script>

<style scoped>
.recipes-container {
  max-width: 1200px;
  margin: 0 auto;
}

.recipes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

h1 {
  color: #333;
  font-size: 32px;
  font-weight: 600;
}

.create-btn {
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

.create-btn:hover {
  opacity: 0.9;
}

.create-form-overlay {
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

.create-form {
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.create-form h3 {
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

.ingredient-row,
.step-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.ingredient-row input,
.step-row textarea {
  flex: 1;
}

.step-row input {
  width: 120px;
}

.remove-btn {
  background: #ff4757;
  color: white;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn {
  background: #2ed573;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
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

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-state p {
  font-size: 18px;
}

.recipes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.recipe-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.recipe-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
}

.recipe-card h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 20px;
}

.recipe-description {
  color: #666;
  margin-bottom: 15px;
  line-height: 1.4;
}

.recipe-meta {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
  font-size: 14px;
  color: #888;
}

.recipe-tags {
  margin-bottom: 10px;
}

.tag {
  background: #e1e5e9;
  color: #555;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 5px;
}

.recipe-date {
  font-size: 12px;
  color: #999;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 8px;
  margin-top: 20px;
  border: 1px solid #fcc;
}
</style>
