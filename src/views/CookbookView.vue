<template>
  <MainLayout>
    <CookbookView :notebook="currentNotebook" />
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import CookbookView from '@/components/CookbookView.vue'
import MainLayout from '@/components/MainLayout.vue'
import { useNotebookStore } from '@/stores/notebook'

const route = useRoute()
const notebookStore = useNotebookStore()

const currentNotebook = computed(() => notebookStore.currentNotebook)

onMounted(async () => {
  const notebookId = route.params.id as string
  if (notebookId) {
    await notebookStore.loadNotebookById(notebookId)
  }
})
</script>
