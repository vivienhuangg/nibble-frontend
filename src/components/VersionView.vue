<template>
  <div class="version-view">
    <div v-if="isLoading" class="loading">Loading versions...</div>

    <div v-else-if="versions.length === 0" class="empty-state">
      <div class="empty-icon">📝</div>
      <h3>No versions yet</h3>
      <p>Create the first version of this recipe!</p>
    </div>

    <div v-else class="versions-container" :class="{ 'has-details': selectedVersion }">
      <!-- Current Version (Latest) -->
      <div class="version-section">
        <h3>Current Version</h3>
        <div class="version-card current">
          <div class="version-header">
            <div class="version-info">
              <h4>Version {{ latestVersion.versionNum }}</h4>
              <p class="version-notes">{{ latestVersion.notes }}</p>
              <div class="version-meta">
                <span>by {{ getAuthorName(latestVersion.author) }}</span>
                <span>{{ formatDate(latestVersion.created) }}</span>
              </div>
            </div>
            <div class="version-actions">
              <button @click="viewVersion(latestVersion)" class="view-btn">View Details</button>
              <button @click="createVersionFrom(latestVersion)" class="fork-btn">
                Fork Version
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Previous Versions -->
      <div v-if="previousVersions.length > 0" class="version-section">
        <h3>Previous Versions</h3>
        <div class="versions-list">
          <div
            v-for="version in previousVersions"
            :key="version.id"
            class="version-card"
            :class="{ selected: selectedVersion?.id === version.id }"
            @click="selectVersion(version)"
          >
            <div class="version-header">
              <div class="version-info">
                <h4>Version {{ version.versionNum }}</h4>
                <p class="version-notes">{{ version.notes }}</p>
                <div class="version-meta">
                  <span>by {{ getAuthorName(version.author) }}</span>
                  <span>{{ formatDate(version.created) }}</span>
                </div>
              </div>
              <div class="version-actions">
                <button @click.stop="viewVersion(version)" class="view-btn">View</button>
                <button @click.stop="compareVersions(version, latestVersion)" class="compare-btn">
                  Compare
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Version Details Panel -->
      <div v-if="selectedVersion" class="version-details-panel">
        <div class="panel-header">
          <h4>Version {{ selectedVersion.versionNum }} Details</h4>
          <button @click="selectedVersion = null" class="close-btn">×</button>
        </div>

        <div class="panel-content">
          <div class="version-info">
            <p><strong>Notes:</strong> {{ selectedVersion.notes }}</p>
            <p><strong>Author:</strong> {{ getAuthorName(selectedVersion.author) }}</p>
            <p><strong>Created:</strong> {{ formatDate(selectedVersion.created) }}</p>
          </div>

          <div class="version-changes">
            <h5>Changes from Previous Version</h5>
            <div class="changes-list">
              <div class="change-item added">
                <span class="change-icon">+</span>
                <span>Added gluten-free flour</span>
              </div>
              <div class="change-item modified">
                <span class="change-icon">~</span>
                <span>Reduced baking time by 5 minutes</span>
              </div>
              <div class="change-item removed">
                <span class="change-icon">-</span>
                <span>Removed vanilla extract</span>
              </div>
            </div>
          </div>

          <div class="version-ingredients">
            <h5>Ingredients</h5>
            <div class="ingredients-list">
              <div
                v-for="(ingredient, index) in selectedVersion.ingredients"
                :key="index"
                class="ingredient-item"
              >
                <span class="quantity">{{ ingredient.quantity }}</span>
                <span v-if="ingredient.unit" class="unit">{{ ingredient.unit }}</span>
                <span class="name">{{ ingredient.name }}</span>
                <span v-if="ingredient.notes" class="notes">({{ ingredient.notes }})</span>
              </div>
            </div>
          </div>

          <div class="version-steps">
            <h5>Steps</h5>
            <div class="steps-list">
              <div v-for="(step, index) in selectedVersion.steps" :key="index" class="step-item">
                <div class="step-number">{{ index + 1 }}</div>
                <div class="step-content">
                  <p>{{ step.description }}</p>
                  <div v-if="step.duration" class="step-duration">
                    Duration: {{ step.duration }} minutes
                  </div>
                  <div v-if="step.notes" class="step-notes">Note: {{ step.notes }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Version Modal -->
    <div v-if="showCreateVersion" class="modal-overlay" @click="closeCreateVersion">
      <div class="modal" @click.stop>
        <h3>Create New Version</h3>
        <form @submit.prevent="handleCreateVersion">
          <div class="form-group">
            <label for="versionNum">Version Number</label>
            <input
              id="versionNum"
              v-model="newVersion.versionNum"
              type="text"
              required
              placeholder="e.g., 3.8"
            />
            <span v-if="baseVersionForFork" class="base-version-hint">
              (based on v{{ baseVersionForFork.versionNum }})
            </span>
          </div>

          <div class="form-group">
            <label for="notes">Version Notes</label>
            <textarea
              id="notes"
              v-model="newVersion.notes"
              placeholder="Describe what changed in this version..."
              rows="3"
              required
            ></textarea>
          </div>

          <div class="form-group">
            <label>Ingredients</label>
            <div
              v-for="(ingredient, index) in newVersion.ingredients"
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
            <div v-for="(step, index) in newVersion.steps" :key="index" class="step-row">
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
            <button type="button" @click="closeCreateVersion" class="cancel-btn">Cancel</button>
            <button type="submit" :disabled="isLoading" class="submit-btn">
              {{ isLoading ? 'Creating...' : 'Create Version' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { Ingredient, Step } from '@/types/api'

// NOTE: Version concept does not exist in the backend API spec
// This component needs to be reimplemented or removed

interface Props {
  recipeId: string
}

const props = defineProps<Props>()

const authStore = useAuthStore()

const showCreateVersion = ref(false)
const selectedVersion = ref<any | null>(null)
const baseVersionForFork = ref<any | null>(null)

const isLoading = ref(false)
const versions = ref<any[]>([])

const latestVersion = computed(() => {
  if (versions.value.length === 0) return null
  return versions.value.reduce((latest, version) =>
    parseFloat(version.versionNum) > parseFloat(latest.versionNum) ? version : latest,
  )
})

const previousVersions = computed(() => {
  if (!latestVersion.value) return versions.value
  return versions.value
    .filter((v) => v.id !== latestVersion.value!.id)
    .sort((a, b) => parseFloat(b.versionNum) - parseFloat(a.versionNum))
})

const newVersion = reactive({
  versionNum: '',
  notes: '',
  ingredients: [{ name: '', quantity: '', unit: '', notes: '' }] as Ingredient[],
  steps: [{ description: '', duration: undefined, notes: '' }] as Step[],
})

function getAuthorName(authorId: string): string {
  // In a real app, you'd look up the user name by ID
  return `User ${authorId.slice(-4)}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

function selectVersion(version: Version) {
  selectedVersion.value = version
}

function viewVersion(version: Version) {
  selectedVersion.value = version
}

function createVersionFrom(baseVersion: Version) {
  // Pre-populate the form with the base version's data
  // Set the base version number as the starting point (user can change it)
  baseVersionForFork.value = baseVersion
  newVersion.versionNum = baseVersion.versionNum
  newVersion.notes = ''
  newVersion.ingredients = [...baseVersion.ingredients]
  newVersion.steps = [...baseVersion.steps]
  showCreateVersion.value = true
}

function compareVersions(version1: Version, version2: Version) {
  // In a real app, you'd implement version comparison logic
  console.log('Comparing versions:', version1.versionNum, 'vs', version2.versionNum)
}

function addIngredient() {
  newVersion.ingredients.push({ name: '', quantity: '', unit: '', notes: '' })
}

function removeIngredient(index: number) {
  if (newVersion.ingredients.length > 1) {
    newVersion.ingredients.splice(index, 1)
  }
}

function addStep() {
  newVersion.steps.push({ description: '', duration: undefined, notes: '' })
}

function removeStep(index: number) {
  if (newVersion.steps.length > 1) {
    newVersion.steps.splice(index, 1)
  }
}

function closeCreateVersion() {
  showCreateVersion.value = false
  baseVersionForFork.value = null
  resetForm()
}

function resetForm() {
  newVersion.versionNum = ''
  newVersion.notes = ''
  newVersion.ingredients = [{ name: '', quantity: '', unit: '', notes: '' }]
  newVersion.steps = [{ description: '', duration: undefined, notes: '' }]
}

async function handleCreateVersion() {
  // Version concept does not exist in backend API spec
  console.warn('Version creation not implemented - Version concept not in backend spec')
  closeCreateVersion()
}

onMounted(async () => {
  // Version loading not available - backend doesn't have Version concept
  console.warn('Version loading not available - Version concept not in backend spec')
})
</script>

<style scoped>
.version-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e1e5e9;
}

.version-header h2 {
  margin: 0;
  color: var(--color-heading);
  font-size: 28px;
  font-weight: 600;
}

.create-version-btn {
  color: var(--brand-indigo-500);
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-text);
  font-size: 18px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0 0 10px 0;
  color: var(--color-heading);
  font-size: 24px;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
}

.versions-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
}

.versions-container.has-details {
  grid-template-columns: 1fr 400px;
}

.version-section {
  margin-bottom: 30px;
}

.version-section h3 {
  margin: 0 0 20px 0;
  color: var(--color-heading);
  font-size: 20px;
  font-weight: 600;
}

.version-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.version-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.version-card.current {
  border-color: var(--brand-indigo-500);
  background: rgba(82, 120, 176, 0.1);
}

.version-card.selected {
  border-color: var(--color-success);
  background: rgba(184, 220, 219, 0.2);
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.version-info h4 {
  margin: 0 0 8px 0;
  color: var(--color-heading);
  font-size: 18px;
  font-weight: 600;
}

.version-notes {
  margin: 0 0 10px 0;
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.4;
}

.version-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: var(--color-text);
}

.version-actions {
  display: flex;
  gap: 8px;
}

.view-btn,
.fork-btn,
.compare-btn {
  margin: 0 4px;
  font-size: 12px;
}

.fork-btn {
  color: var(--color-primary);
}

.compare-btn {
  color: var(--color-accent);
}

.version-details-panel {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
}

.panel-header h4 {
  margin: 0;
  color: var(--color-heading);
  font-size: 18px;
}

.close-btn {
  font-size: 24px;
  color: var(--color-text);
}

.panel-content {
  padding: 20px;
  max-height: 600px;
  overflow-y: auto;
}

.version-info {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
}

.version-info p {
  margin: 0 0 8px 0;
  color: var(--color-heading);
  font-size: 14px;
}

.version-changes {
  margin-bottom: 20px;
}

.version-changes h5 {
  margin: 0 0 15px 0;
  color: var(--color-heading);
  font-size: 16px;
}

.changes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.change-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.change-item.added {
  background: rgba(184, 220, 219, 0.2);
  color: var(--color-success);
}

.change-item.modified {
  background: rgba(250, 132, 40, 0.12);
  color: var(--color-accent);
}

.change-item.removed {
  background: rgba(211, 93, 43, 0.12);
  color: var(--color-danger);
}

.change-icon {
  font-weight: 600;
  width: 16px;
  text-align: center;
}

.version-ingredients,
.version-steps {
  margin-bottom: 20px;
}

.version-ingredients h5,
.version-steps h5 {
  margin: 0 0 15px 0;
  color: var(--color-heading);
  font-size: 16px;
}

.ingredients-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ingredient-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-background-soft);
  border-radius: 4px;
  font-size: 14px;
}

.quantity {
  font-weight: 600;
  color: var(--color-primary);
}

.unit {
  color: var(--color-text);
}

.name {
  font-weight: 500;
  color: var(--color-heading);
}

.notes {
  color: var(--color-text);
  font-style: italic;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.step-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--color-background-soft);
  border-radius: 6px;
}

.step-number {
  background: var(--color-success);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content p {
  margin: 0 0 5px 0;
  color: var(--color-heading);
  font-size: 14px;
  line-height: 1.4;
}

.step-duration,
.step-notes {
  font-size: 12px;
  color: var(--color-text);
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
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h3 {
  margin-bottom: 20px;
  color: var(--color-heading);
  font-size: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--color-text);
}

.base-version-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
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
  color: var(--color-danger);
  width: auto;
  height: auto;
  padding: 0;
  margin: 0 8px;
  font-size: 18px;
}

.add-btn {
  color: var(--color-success);
  padding: 0;
  margin-top: 12px;
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

.submit-btn {
  color: var(--brand-blue-400);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn:disabled:hover {
  text-decoration: none;
}

@media (max-width: 1024px) {
  .versions-container {
    grid-template-columns: 1fr;
  }

  .version-details-panel {
    order: -1;
  }
}

@media (max-width: 768px) {
  .version-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .version-actions {
    justify-content: center;
  }

  .ingredient-row,
  .step-row {
    flex-wrap: wrap;
  }

  .step-row {
    flex-direction: column;
    align-items: stretch;
  }

  .step-row input {
    width: 100%;
  }
}
</style>
