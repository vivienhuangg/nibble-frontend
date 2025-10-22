<template>
  <MainLayout>
    <CookbookView :notebook="currentNotebook" />
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import CookbookView from '@/components/CookbookView.vue'
import MainLayout from '@/components/MainLayout.vue'
import { useNotebookStore } from '@/stores/notebook'

const notebookStore = useNotebookStore()

const currentNotebook = computed(() => notebookStore.currentNotebook)

onMounted(async () => {
  // Load user's notebooks when the home page loads
  if (notebookStore.userNotebooks.length === 0) {
    await notebookStore.loadUserNotebooks()
  }
})
</script>

<style scoped>
/* Styles are now handled by MainLayout and CookbookView components */
</style>
