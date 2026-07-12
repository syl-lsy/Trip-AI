<script setup lang="ts">
import OutlineSidebar from '@/components/plan/OutlineSidebar.vue'
import TimelineCenter from '@/components/plan/TimelineCenter.vue'
import ChatPanel from '@/components/plan/ChatPanel.vue'
</script>

<template>
  <div class="fixed inset-0 top-14 flex bg-bg-base">
    <OutlineSidebar />
    <TimelineCenter />
    <ChatPanel />
  </div>
</template>
