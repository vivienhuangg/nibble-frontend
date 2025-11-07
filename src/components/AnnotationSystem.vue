<template>
  <div class="annotation-container" :style="containerStyle" @click.stop>
    <!-- Header with comment count and add button -->

    <!-- Comments List -->
    <div v-if="annotations.length > 0" class="annotations-list">
      <div v-for="annotation in sortedAnnotations" :key="annotation._id" class="annotation-item">
        <div class="annotation-content">
          <div class="annotation-header">
            <div class="annotation-meta">
              <span class="annotation-author">{{ getAuthorNameDisplay(annotation.author) }}</span>
              <span class="annotation-date">{{ formatDate(annotation.created) }}</span>
            </div>
          </div>
          <div class="annotation-text">
            {{ annotation.text }}
          </div>
        </div>
      </div>
    </div>

    <!-- Annotation Form -->
    <div v-if="showAnnotationForm" class="annotation-form">
      <form @submit.prevent="submitAnnotation" class="comment-form">
        <textarea
          ref="textareaRef"
          v-model="annotationText"
          @input="autoResizeTextarea"
          placeholder="Add your comment..."
          rows="1"
          class="annotation-textarea"
        ></textarea>
        <button
          type="submit"
          :disabled="!annotationText.trim() || isLoading"
          class="submit-btn-inline"
        >
          <Loader2 v-if="isLoading" :size="16" class="icon-spin" />
          <Send v-else :size="16" />
        </button>
      </form>
    </div>

    <!-- Show "Add Comment" button if no annotations exist -->
    <div v-if="annotations.length === 0 && !showAnnotationForm" class="no-annotations">
      <button @click="emit('show-form')" class="add-comment-btn">+ Add Comment</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader2, Send } from 'lucide-vue-next'
import { computed, nextTick, onMounted, ref, watch, withDefaults } from 'vue'
import { useAnnotationStore } from '@/stores/annotation'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types/api'

interface Props {
  recipeId: string
  targetKind: 'Ingredient' | 'Step'
  targetIndex: number
  showForm?: boolean
  position?: { x: number; y: number } | null
}

const props = withDefaults(defineProps<Props>(), {
  showForm: false,
})

const emit = defineEmits<{
  close: []
  'show-form': []
}>()

const annotationStore = useAnnotationStore()
const authStore = useAuthStore()

const showAnnotationForm = computed({
  get: () => props.showForm,
  set: (value) => {
    if (!value) {
      emit('close')
    }
  },
})
const annotationText = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const userDetailsCache = ref<Map<string, User>>(new Map())
const authorNames = ref<Record<string, string>>({})

function autoResizeTextarea() {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      textareaRef.value.style.height = `${textareaRef.value.scrollHeight}px`
    }
  })
}

watch(
  () => annotationText.value,
  () => {
    autoResizeTextarea()
  },
)

watch(
  () => showAnnotationForm.value,
  (isOpen) => {
    if (isOpen) {
      nextTick(() => {
        nextTick(() => {
          autoResizeTextarea()
          if (textareaRef.value) {
            textareaRef.value.focus()
          }
        })
      })
    }
  },
  { immediate: true },
)

const isLoading = computed(() => annotationStore.isLoading)
const annotations = computed(() =>
  annotationStore
    .annotationsByRecipe(props.recipeId)
    .filter(
      (annotation) =>
        annotation.targetKind === props.targetKind && annotation.targetIndex === props.targetIndex,
    ),
)

onMounted(() => {
  if (showAnnotationForm.value && textareaRef.value) {
    nextTick(() => {
      textareaRef.value?.focus()
    })
  }
  // Load author names for all annotations
  annotations.value.forEach((annotation) => {
    loadAuthorName(annotation.author)
  })
})

// Watch for new annotations and load their author names
watch(
  () => annotations.value,
  (newAnnotations) => {
    newAnnotations.forEach((annotation) => {
      // Only load if we don't already have this author's name
      if (!authorNames.value[annotation.author]) {
        loadAuthorName(annotation.author)
      }
    })
  },
  { deep: true },
)

const sortedAnnotations = computed(() =>
  [...annotations.value].sort(
    (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime(),
  ),
)

const containerStyle = computed(() => {
  if (!props.position) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  const x = Math.min(props.position.x, window.innerWidth - 420)
  const y = Math.min(props.position.y + 20, window.innerHeight - 100)

  return {
    left: `${x}px`,
    top: `${y}px`,
    transform: 'none',
  }
})

function getAuthorNameDisplay(authorId: string): string {
  // Return cached name if available
  if (authorNames.value[authorId]) {
    return authorNames.value[authorId]
  }

  // Load username asynchronously
  loadAuthorName(authorId)

  // Return fallback while loading
  return `User ${authorId.slice(-4)}`
}

async function loadAuthorName(authorId: string): Promise<void> {
  if (!authorId || authorNames.value[authorId]) return

  // Check cache first
  const cachedUser = userDetailsCache.value.get(authorId)
  if (cachedUser) {
    authorNames.value[authorId] =
      cachedUser.name || cachedUser.username || `User ${authorId.slice(-4)}`
    return
  }

  try {
    // Fetch user details and cache them
    const userDetails = await authStore.getUserDetails(authorId)
    userDetailsCache.value.set(authorId, userDetails)
    const displayName = userDetails.name || userDetails.username || `User ${authorId.slice(-4)}`
    authorNames.value[authorId] = displayName
  } catch (error) {
    console.warn(`Failed to get user details for ${authorId}:`, error)
    // Cache a fallback
    const fallbackName = `User ${authorId.slice(-4)}`
    authorNames.value[authorId] = fallbackName
    const fallbackUser = {
      _id: authorId,
      name: fallbackName,
      username: `user${authorId.slice(-4)}`,
      preferences: {},
    } as User
    userDetailsCache.value.set(authorId, fallbackUser)
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

async function submitAnnotation(event?: Event) {
  // Ensure we prevent default behavior
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  
  if (!annotationText.value.trim()) return

  try {
    await annotationStore.createAnnotation({
      recipe: props.recipeId,
      targetKind: props.targetKind,
      index: props.targetIndex,
      text: annotationText.value.trim(),
    })

    annotationText.value = ''
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
    }
    emit('close')
  } catch (err) {
    console.error('Failed to create annotation:', err)
    // Don't re-throw - handle gracefully
  }
}
</script>

<style scoped>
.annotation-container {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 2px;
}

.annotation-header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e9ecef;
}

.annotation-header-section h4 {
  margin: 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.add-comment-btn {
  color: var(--brand-blue-400);
  font-size: 14px;
  padding: 0;
}

.annotation-form {
  margin-bottom: 16px;
}

.comment-form {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.annotation-textarea {
  flex: 1;
  padding: 8px 0;
  border: none;
  border-bottom: 1px solid #e9ecef;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  resize: none;
  box-sizing: border-box;
  min-height: 32px;
  max-height: 200px;
  overflow-y: auto;
}

.annotation-textarea:focus {
  border-bottom-color: var(--brand-blue-400);
}

.annotation-textarea::placeholder {
  color: #999;
  font-style: italic;
}

.submit-btn-inline {
  color: var(--brand-blue-400);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 2px;
}

.submit-btn-inline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn-inline:disabled:hover {
  text-decoration: none;
}

.icon-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.annotations-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.annotation-item {
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.annotation-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.annotation-content {
  width: 100%;
}

.annotation-header {
  margin-bottom: 8px;
}

.annotation-meta {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.annotation-author {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.annotation-date {
  color: #999;
  font-size: 12px;
  justify-self: flex-end;
}

.annotation-text {
  color: #333;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.no-annotations {
  text-align: center;
  padding: 20px 0;
}

.no-annotations .add-comment-btn {
  font-size: 14px;
}

@media (max-width: 768px) {
  .annotation-container {
    width: 90%;
    max-width: 400px;
  }

  .annotation-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>
