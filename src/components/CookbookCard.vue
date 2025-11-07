<template>
  <div class="cookbook-card" @click="$emit('click', cookbook._id)">
    <div class="cookbook-card-header">
      <div class="cookbook-icon">
        <BookOpenText :size="32" :stroke-width="2" />
      </div>
      <button
        v-if="isOwner"
        @click.stop="$emit('delete', cookbook._id)"
        class="delete-btn"
        title="Delete cookbook"
      >
        <Trash2 :size="18" />
      </button>
    </div>

    <div class="cookbook-card-body">
      <h3 class="cookbook-title">{{ cookbook.title }}</h3>
      <p v-if="cookbook.description" class="cookbook-description">
        {{
          cookbook.description.length <= 100
            ? cookbook.description
            : cookbook.description.substring(0, 100).trim() + '...'
        }}
      </p>

      <div class="cookbook-meta">
        <div class="meta-item">
          <BookOpen :size="16" :stroke-width="2" />
          <span class="meta-text">{{ cookbook.recipes?.length || 0 }} recipes</span>
        </div>
        <div class="meta-item">
          <Users :size="16" :stroke-width="2" />
          <span class="meta-text">{{ cookbook.members?.length || 0 }} members</span>
        </div>
      </div>

      <div v-if="!isOwner" class="shared-badge">
        <span>Shared</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOpen, BookOpenText, Trash2, Users } from 'lucide-vue-next'
import type { Notebook } from '@/types/api'

interface Props {
  cookbook: Notebook
  isOwner: boolean
}

defineProps<Props>()

defineEmits<{
  click: [cookbookId: string]
  delete: [cookbookId: string]
}>()

void BookOpen
void BookOpenText
void Trash2
void Users
</script>

<style scoped>
.cookbook-card {
  background-color: #fff;
  border: 1px solid #e1e5e9;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.cookbook-card:hover,
.cookbook-card:focus-visible {
  border-color: transparent;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 0 0 2px rgba(99, 102, 241, 0.25);
}

.cookbook-card:hover {
  transform: translateY(-4px);
}

.cookbook-card:focus-visible {
  outline: none;
  transform: translateY(-2px);
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.1),
    0 0 0 2px rgba(99, 102, 241, 0.25);
}

.cookbook-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.cookbook-icon {
  color: var(--brand-indigo-500);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  opacity: 0;
  transition:
    opacity 0.2s,
    transform 0.2s;
  color: var(--color-danger);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cookbook-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  transform: scale(1.1);
}

.cookbook-card-body {
  position: relative;
}

.cookbook-title {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.3;
  word-break: break-word;
}

.cookbook-description {
  margin: 0 0 16px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  min-height: 42px;
}

.cookbook-meta {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e1e5e9;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666;
  font-size: 14px;
}

.meta-item svg {
  flex-shrink: 0;
}

.meta-text {
  font-weight: 500;
}

.shared-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: linear-gradient(135deg, var(--brand-indigo-500), var(--brand-indigo-600));
  color: white;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (max-width: 768px) {
  .cookbook-card {
    padding: 20px;
  }

  .cookbook-title {
    font-size: 20px;
  }
}
</style>
