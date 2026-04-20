<template>
  <footer class="border-t border-border/70 bg-surface/40 backdrop-blur-sm">
    <div class="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
      <div class="flex items-center gap-4">
        <router-link to="/terms" class="text-sm text-muted hover:text-primary">Regulamin</router-link>
        <router-link to="/privacy" class="text-sm text-muted hover:text-primary">
          Polityka prywatności
        </router-link>
      </div>
      <span class="text-xs text-muted">goceries</span>
    </div>
  </footer>
</template>

<script setup lang="ts"></script>

<style scoped></style>
