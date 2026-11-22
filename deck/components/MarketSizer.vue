<script setup>
import { ref, computed } from 'vue'

const price = ref(2400)
const money = (n) => (n >= 1e6 ? '€' + (n / 1e6).toFixed(1) + 'M' : '€' + Math.round(n / 1000) + 'k')
const tam = computed(() => 14400 * price.value)
const sam = computed(() => 1089 * price.value)
const som = computed(() => 30 * 5 * price.value)
const p = computed(() => price.value.toLocaleString('en-US'))
</script>

<template>
  <div>
    <div class="card accent" style="width: 100%">
      <div class="small muted">TAM · Europe</div>
      <div class="bold" style="font-size: 24px">
        {{ money(tam) }}
        <span class="small muted" style="font-weight: 500">14,400 attorneys × €{{ p }}</span>
      </div>
    </div>
    <div class="card" style="width: 76%; margin-top: 10px">
      <div class="small muted">SAM · France</div>
      <div class="bold" style="font-size: 24px">
        {{ money(sam) }}
        <span class="small muted" style="font-weight: 500">1,089 attorneys × €{{ p }}</span>
      </div>
    </div>
    <div class="card warn" style="width: 54%; margin-top: 10px">
      <div class="small muted">SOM · year 3</div>
      <div class="bold" style="font-size: 24px">
        {{ money(som) }}
        <span class="small muted" style="font-weight: 500">30 firms × 5 seats × €{{ p }}</span>
      </div>
    </div>
    <div style="margin-top: 14px">
      <div class="small"><b>Try it:</b> price per seat per year <b class="blue">€{{ p }}</b></div>
      <input type="range" min="1200" max="4800" step="100" v-model.number="price" />
    </div>
  </div>
</template>
