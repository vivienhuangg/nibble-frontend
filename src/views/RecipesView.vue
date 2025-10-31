<template>
  <MainLayout>
    <div class="recipes-container">
      <div class="recipes-header">
        <h1>My Recipes</h1>
        <button @click="goToCreate" class="create-btn">+ Create Recipe</button>
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
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/components/MainLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useRecipeStore } from '@/stores/recipe'

const router = useRouter()
const recipeStore = useRecipeStore()
const authStore = useAuthStore()

const isLoading = computed(() => recipeStore.isLoading)
const error = computed(() => recipeStore.error)
const userRecipes = computed(() => recipeStore.userRecipes)

function goToCreate() {
  router.push('/recipes/create')
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
  color: var(--brand-indigo-500);
  margin-bottom: 20px;
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
