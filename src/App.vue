<template>
  <div class="flex min-h-screen flex-col">
    <FTopNav v-if="auth.initialized && auth.isAuthenticated" />
    <div class="flex-1">
      <RouterView />
    </div>
    <FFooter />
  </div>
</template>

<script setup lang="ts">
import FFooter from '@/components/FFooter.vue'
import FTopNav from '@/components/FTopNav.vue'
import { useAuthStore } from '@/stores/auth'
import { RouterView } from 'vue-router'

const auth = useAuthStore()
</script>

<style scoped></style>
