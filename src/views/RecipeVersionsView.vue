<template>
  <MainLayout>
    <VersionView :recipe-id="recipeId" />
  </MainLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/components/MainLayout.vue'
import VersionView from '@/components/VersionView.vue'

const route = useRoute()

const recipeId = computed(() => route.params.id as string)
</script>
