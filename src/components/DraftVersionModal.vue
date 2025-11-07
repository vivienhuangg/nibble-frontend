<template>
  <div v-if="showModal" class="modal-overlay" @click="closeModal">
    <div class="modal" @click.stop>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Draft Version</h3>
          <button @click="closeModal" class="close-btn">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="goal">What would you like to create or change?</label>
            <textarea
              id="goal"
              v-model="goal"
              placeholder="e.g., I have chicken and broccoli - what can I make?"
              rows="4"
              class="goal-input"
            ></textarea>
          </div>

          <div class="form-actions">
            <button @click="closeModal" class="cancel-btn">Cancel</button>
            <button
              @click="generateDraft"
              :disabled="!goal.trim() || isGenerating"
              class="generate-btn"
            >
              {{ isGenerating ? 'Generating...' : 'Generate Draft' }}
            </button>
          </div>

          <div v-if="error" class="error-message">{{ error }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { recipeApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Ingredient, Step, VersionDraft } from '@/types/api'

interface Props {
  showModal: boolean
  recipeId: string
  baseIngredients: Ingredient[]
  baseSteps: Step[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: []; 'draft-ready': [draft: VersionDraft] }>()

const goal = ref('')
const isGenerating = ref(false)
const error = ref<string | null>(null)
const authStore = useAuthStore()

function closeModal() {
  goal.value = ''
  isGenerating.value = false
  error.value = null
  emit('close')
}

async function generateDraft() {
  if (!goal.value.trim()) return

  isGenerating.value = true
  error.value = null

  try {
    if (!authStore.userId) {
      throw new Error('User must be logged in to generate drafts')
    }

    // Call the draftRecipeWithAI API
    const response = await recipeApi.draftRecipeWithAI(props.recipeId, goal.value)

    // Log the raw response from the AI
    console.log('🤖 Raw AI Response:', response)

    // Map the API response to VersionDraft format
    // The API returns { draftId, baseRecipe, requester, goal, ingredients, steps, notes, confidence, created, expires }
    // But VersionDraft expects { _id, baseRecipe, requester, goal, ingredients, steps, notes, confidence, created, expires }
    const responseData = response as Record<string, unknown>
    const draft: VersionDraft = {
      _id: (responseData.draftId as string) || '',
      baseRecipe: (responseData.baseRecipe as string) || '',
      requester: (responseData.requester as string) || '',
      goal: (responseData.goal as string) || '',
      ingredients: (responseData.ingredients as Ingredient[]) || [],
      steps: (responseData.steps as Step[]) || [],
      notes: (responseData.notes as string) || '',
      confidence: (responseData.confidence as number) || 0,
      created: (responseData.created as string) || '',
      expires: (responseData.expires as string) || '',
    }

    // Emit the draft to the parent so it can display inline
    console.log('📤 Emitting draft-ready event with:', draft)
    emit('draft-ready', draft)
  } catch (err) {
    console.error('Failed to generate draft:', err)
    error.value = err instanceof Error ? err.message : 'Failed to generate draft. Please try again.'
  } finally {
    isGenerating.value = false
  }
}
</script>

<style scoped>
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
  z-index: 1002;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 95%;
  max-width: 1200px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.close-btn {
  font-size: 28px;
  color: #666;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.draft-body {
  padding: 30px;
}

.prompt-help {
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.goal-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
}

.goal-input:focus {
  outline: none;
  border-color: var(--brand-indigo-500);
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.cancel-btn,
.generate-btn,
.edit-btn,
.accept-btn,
.save-btn {
  margin: 0 8px;
}

.cancel-btn {
  color: #6c757d;
}

.generate-btn {
  color: var(--brand-indigo-500);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.generate-btn:disabled:hover {
  text-decoration: none;
}

.confidence-badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 20px;
}

.confidence-badge.high {
  background: #d4edda;
  color: #155724;
}

.confidence-badge.medium {
  background: #fff3cd;
  color: #856404;
}

.confidence-badge.low {
  background: #f8d7da;
  color: #721c24;
}

/* Content grid for side by side layout - matching RecipeView */
.content-grid {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: 40px;
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
  user-select: none;
  cursor: pointer;
  transition: all 0.2s;
}

.ingredient-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.ingredient-item.change-added {
  background: #d4edda;
  padding-left: 10px;
  margin-left: -10px;
  border-left: 4px solid #28a745;
}

.ingredient-item.change-removed {
  background: #f8d7da;
  padding-left: 10px;
  margin-left: -10px;
  border-left: 4px solid #dc3545;
  text-decoration: line-through;
  opacity: 0.6;
}

.ingredient-item.change-modified {
  background: #fff3cd;
  padding-left: 10px;
  margin-left: -10px;
  border-left: 4px solid #ffc107;
}

.ingredient-item.change-unchanged {
  background: transparent;
}

.ingredient-quantity {
  font-weight: 600;
  color: var(--color-primary);
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
  transition: all 0.2s;
}

.step-item.change-added {
  background: #d4edda;
  padding-left: 10px;
  margin-left: -10px;
  border-left: 4px solid #28a745;
}

.step-item.change-removed {
  background: #f8d7da;
  padding-left: 10px;
  margin-left: -10px;
  border-left: 4px solid #dc3545;
  text-decoration: line-through;
  opacity: 0.6;
}

.step-item.change-modified {
  background: #fff3cd;
  padding-left: 10px;
  margin-left: -10px;
  border-left: 4px solid #ffc107;
}

.step-item.change-unchanged {
  background: transparent;
}

.change-badge {
  font-weight: bold;
  font-size: 18px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.step-notes {
  color: #888;
  font-size: 14px;
  font-style: italic;
}

.draft-notes {
  padding: 15px;
  background: #e7f3ff;
  border-left: 4px solid var(--brand-blue-400);
  border-radius: 6px;
  margin-bottom: 20px;
  color: #004085;
}

.edit-btn {
  color: var(--brand-orange-500);
}

.accept-btn {
  color: var(--color-success);
}

.accept-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.accept-btn:disabled:hover {
  text-decoration: none;
}

.save-btn {
  color: var(--brand-indigo-500);
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 6px;
  margin-top: 15px;
  border: 1px solid #f5c6cb;
}

.ingredient-row,
.step-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.ingredient-row input,
.step-row input,
.step-row textarea {
  padding: 10px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
}

.remove-btn {
  color: var(--color-danger);
  width: auto;
  height: auto;
  padding: 0;
  margin: 0 8px;
  font-size: 20px;
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.remove-btn:disabled:hover {
  text-decoration: none;
}

.add-btn {
  color: var(--color-success);
  padding: 0;
  margin-top: 12px;
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .ingredient-item,
  .step-item {
    flex-wrap: wrap;
  }

  .step-number {
    align-self: flex-start;
  }
}
</style>
