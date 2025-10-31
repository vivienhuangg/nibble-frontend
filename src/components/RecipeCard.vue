<template>
  <div class="recipe-card" @click="viewRecipe">
    <div class="recipe-header">
      <h3>{{ recipe.title }}</h3>
      <div class="recipe-meta">
        <span class="version-info" v-if="versionInfo"> v{{ versionInfo.versionNum }} </span>
        <span class="author-info" v-if="versionInfo"> by {{ versionInfo.author }} </span>
      </div>
    </div>

    <p v-if="recipe.description" class="recipe-description">
      {{ recipe.description }}
    </p>

    <div class="recipe-stats">
      <div class="stat">
        <span class="stat-icon">🥘</span>
        <span>{{ recipe.ingredients.length }} ingredients</span>
      </div>
      <div class="stat">
        <span class="stat-icon">👨‍🍳</span>
        <span>{{ recipe.steps.length }} steps</span>
      </div>
      <div class="stat" v-if="forkCount && forkCount > 0">
        <span class="stat-icon">🍴</span>
        <span>{{ forkCount }} forks</span>
      </div>
    </div>

    <div v-if="recipe.tags && recipe.tags.length > 0" class="recipe-tags">
      <span v-for="tag in recipe.tags" :key="tag" class="tag">
        {{ tag }}
      </span>
    </div>

    <div class="recipe-footer">
      <div class="recipe-date">Updated: {{ formatDate(recipe.updated) }}</div>
    </div>

    <!-- Annotations indicator -->
    <div v-if="annotationCount && annotationCount > 0" class="annotations-indicator">
      <span class="annotation-icon">💬</span>
      <span>{{ annotationCount }} comments</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Recipe, Version } from '@/types/api'

interface Props {
  recipe: Recipe
  versionInfo?: Version | null
  forkCount?: number
  annotationCount?: number
  isFavorited?: boolean
}

interface Emits {
  (e: 'favorite-toggled', recipeId: string): void
  (e: 'share-requested', recipe: Recipe): void
}

const props = withDefaults(defineProps<Props>(), {
  forkCount: 0,
  annotationCount: 0,
  isFavorited: false,
})

const emit = defineEmits<Emits>()
const router = useRouter()

function viewRecipe() {
  router.push(`/recipe/${props.recipe._id}`)
}

function toggleFavorite() {
  emit('favorite-toggled', props.recipe._id)
}

function shareRecipe() {
  emit('share-requested', props.recipe)
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid date'

  return date.toLocaleDateString()
}
</script>

<style scoped>
.recipe-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  position: relative;
  border: 1px solid #e1e5e9;
}

.recipe-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
}

.recipe-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.recipe-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
  flex: 1;
  margin-right: 10px;
}

.recipe-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.version-info {
  font-weight: 600;
  color: var(--color-primary);
}

.author-info {
  margin-top: 2px;
}

.recipe-description {
  color: #666;
  margin-bottom: 15px;
  line-height: 1.4;
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recipe-stats {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  font-size: 13px;
  color: #666;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-icon {
  font-size: 14px;
}

.recipe-tags {
  margin-bottom: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  background: #e1e5e9;
  color: #555;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.tag:nth-child(1) {
  background: #e3f2fd;
  color: #1976d2;
}

.tag:nth-child(2) {
  background: #f3e5f5;
  color: #7b1fa2;
}

.tag:nth-child(3) {
  background: #e8f5e8;
  color: #388e3c;
}

.recipe-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #f0f0f0;
}

.recipe-date {
  font-size: 12px;
  color: #999;
}

.recipe-actions {
  display: flex;
  gap: 8px;
}

.favorite-btn,
.share-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.favorite-btn:hover,
.share-btn:hover {
  background-color: #f0f0f0;
}

.favorite-btn.favorited {
  animation: heartbeat 0.6s ease-in-out;
}

@keyframes heartbeat {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.annotations-indicator {
  position: absolute;
  top: 15px;
  right: 15px;
  background: var(--brand-indigo-500);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.annotation-icon {
  font-size: 12px;
}

@media (max-width: 768px) {
  .recipe-card {
    padding: 15px;
  }

  .recipe-header h3 {
    font-size: 16px;
  }

  .recipe-stats {
    gap: 10px;
    font-size: 12px;
  }

  .recipe-footer {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .recipe-actions {
    align-self: flex-end;
  }
}
</style>
