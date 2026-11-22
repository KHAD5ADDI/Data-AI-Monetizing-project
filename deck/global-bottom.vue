<template>
  <div v-if="$slidev.nav.currentPage > 1" class="gb">
    <span>Verbatim · Monetizing Data &amp; AI · Albert School</span>
    <span>{{ $slidev.nav.currentPage - 1 }} / {{ $slidev.nav.total - 1 }}</span>
  </div>
</template>

<style>
.gb {
  position: absolute;
  left: 54px;
  right: 54px;
  bottom: 12px;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #8a8fa0;
}
</style>
