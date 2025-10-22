<template>
  <div class="annotation-container">
    <!-- Annotation Button -->
    <button
      v-if="!showAnnotationForm"
      @click="showAnnotationForm = true"
      class="annotation-btn"
      :class="{ 'has-annotations': annotations.length > 0 }"
    >
      <span class="annotation-icon">💬</span>
      <span v-if="annotations.length > 0" class="annotation-count">
        {{ annotations.length }}
      </span>
    </button>

    <!-- Annotation Form -->
    <div v-if="showAnnotationForm" class="annotation-form">
      <div class="annotation-header">
        <h4>Add Comment</h4>
        <button @click="closeForm" class="close-btn">×</button>
      </div>

      <form @submit.prevent="submitAnnotation">
        <textarea
          v-model="annotationText"
          placeholder="Add your comment..."
          rows="3"
          class="annotation-textarea"
        ></textarea>

        <div class="annotation-actions">
          <button type="button" @click="closeForm" class="cancel-btn">Cancel</button>
          <button type="submit" :disabled="!annotationText.trim() || isLoading" class="submit-btn">
            {{ isLoading ? 'Adding...' : 'Add Comment' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Existing Annotations -->
    <div v-if="annotations.length > 0" class="annotations-list">
      <div
        v-for="annotation in sortedAnnotations"
        :key="annotation._id"
        class="annotation-item"
        :class="{ resolved: annotation.resolved }"
      >
        <div class="annotation-content">
          <div class="annotation-header">
            <span class="annotation-author">{{ getAuthorName(annotation.author) }}</span>
            <span class="annotation-date">{{ formatDate(annotation.created) }}</span>
            <div class="annotation-actions">
              <button
                v-if="canEdit(annotation)"
                @click="editAnnotation(annotation)"
                class="edit-btn"
              >
                ✏️
              </button>
              <button
                v-if="canResolve(annotation)"
                @click="toggleResolve(annotation)"
                class="resolve-btn"
                :class="{ resolved: annotation.resolved }"
              >
                {{ annotation.resolved ? '✅' : '⭕' }}
              </button>
              <button
                v-if="canDelete(annotation)"
                @click="deleteAnnotation(annotation._id)"
                class="delete-btn"
              >
                🗑️
              </button>
            </div>
          </div>

          <div class="annotation-text">
            {{ annotation.text }}
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Annotation Modal -->
    <div v-if="editingAnnotation" class="modal-overlay" @click="cancelEdit">
      <div class="modal" @click.stop>
        <h4>Edit Comment</h4>
        <form @submit.prevent="saveEdit">
          <textarea v-model="editText" rows="3" class="annotation-textarea"></textarea>
          <div class="annotation-actions">
            <button type="button" @click="cancelEdit" class="cancel-btn">Cancel</button>
            <button type="submit" :disabled="!editText.trim() || isLoading" class="submit-btn">
              {{ isLoading ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAnnotationStore } from '@/stores/annotation'
import { useAuthStore } from '@/stores/auth'
import type { Annotation } from '@/types/api'

interface Props {
  recipeId: string
  targetKind: 'Ingredient' | 'Step'
  targetIndex: number
}

const props = defineProps<Props>()

const annotationStore = useAnnotationStore()
const authStore = useAuthStore()

const showAnnotationForm = ref(false)
const annotationText = ref('')
const editingAnnotation = ref<Annotation | null>(null)
const editText = ref('')

const isLoading = computed(() => annotationStore.isLoading)
const annotations = computed(() =>
  annotationStore
    .annotationsByRecipe(props.recipeId)
    .filter(
      (annotation) =>
        annotation.targetKind === props.targetKind && annotation.targetIndex === props.targetIndex,
    ),
)

const sortedAnnotations = computed(() =>
  [...annotations.value].sort(
    (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime(),
  ),
)

function getAuthorName(authorId: string): string {
  // In a real app, you'd look up the user name by ID
  return `User ${authorId.slice(-4)}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

function canEdit(annotation: Annotation): boolean {
  return annotation.author === authStore.userId && !annotation.resolved
}

function canResolve(annotation: Annotation): boolean {
  return authStore.userId && !annotation.resolved
}

function canDelete(annotation: Annotation): boolean {
  return annotation.author === authStore.userId
}

async function submitAnnotation() {
  if (!annotationText.value.trim()) return

  try {
    await annotationStore.createAnnotation({
      recipe: props.recipeId,
      targetKind: props.targetKind,
      index: props.targetIndex,
      text: annotationText.value.trim(),
    })

    annotationText.value = ''
    showAnnotationForm.value = false
  } catch (err) {
    console.error('Failed to create annotation:', err)
  }
}

function editAnnotation(annotation: Annotation) {
  editingAnnotation.value = annotation
  editText.value = annotation.text
}

function cancelEdit() {
  editingAnnotation.value = null
  editText.value = ''
}

async function saveEdit() {
  if (!editingAnnotation.value || !editText.value.trim()) return

  try {
    await annotationStore.updateAnnotation(editingAnnotation.value._id, editText.value.trim())

    cancelEdit()
  } catch (err) {
    console.error('Failed to update annotation:', err)
  }
}

async function toggleResolve(annotation: Annotation) {
  try {
    await annotationStore.resolveAnnotation(annotation._id, !annotation.resolved)
  } catch (err) {
    console.error('Failed to resolve annotation:', err)
  }
}

async function deleteAnnotation(annotationId: string) {
  if (!confirm('Are you sure you want to delete this comment?')) return

  try {
    await annotationStore.deleteAnnotation(annotationId)
  } catch (err) {
    console.error('Failed to delete annotation:', err)
  }
}

function closeForm() {
  showAnnotationForm.value = false
  annotationText.value = ''
}
</script>

<style scoped>
.annotation-container {
  position: relative;
}

.annotation-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.annotation-btn:hover {
  background: #e9ecef;
}

.annotation-btn.has-annotations {
  background: #e3f2fd;
  border-color: #1976d2;
  color: #1976d2;
}

.annotation-icon {
  font-size: 16px;
}

.annotation-count {
  background: #1976d2;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 600;
}

.annotation-form {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
  margin-top: 5px;
}

.annotation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.annotation-header h4 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
}

.annotation-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.annotation-textarea:focus {
  outline: none;
  border-color: #667eea;
}

.annotation-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 10px;
}

.cancel-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.submit-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.annotations-list {
  margin-top: 10px;
}

.annotation-item {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.annotation-item.resolved {
  background: #e8f5e8;
  border-color: #28a745;
  opacity: 0.8;
}

.annotation-content {
  width: 100%;
}

.annotation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.annotation-author {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.annotation-date {
  color: #666;
  font-size: 12px;
}

.annotation-actions {
  display: flex;
  gap: 4px;
}

.edit-btn,
.resolve-btn,
.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.edit-btn:hover,
.resolve-btn:hover,
.delete-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.resolve-btn.resolved {
  color: #28a745;
}

.annotation-text {
  color: #333;
  font-size: 14px;
  line-height: 1.4;
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
  border-radius: 8px;
  padding: 20px;
  width: 90%;
  max-width: 500px;
}

.modal h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
}

@media (max-width: 768px) {
  .annotation-form {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 400px;
  }

  .annotation-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .annotation-actions {
    justify-content: center;
  }
}
</style>
