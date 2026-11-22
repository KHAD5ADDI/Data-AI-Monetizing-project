<script setup>
import { ref, computed } from 'vue'

const hours = ref(4)
const rate = ref(200)
const monthly = ref(200)
const adoption = ref(40)

const fullValue = computed(() => hours.value * rate.value * 12)
const price = computed(() => monthly.value * 12)
const y1Value = computed(() => (fullValue.value * adoption.value) / 100)
const share = computed(() => Math.round((price.value / fullValue.value) * 100))
const roiY1 = computed(() => Math.round(((y1Value.value - price.value) / price.value) * 100))
const roiFull = computed(() => Math.round(((fullValue.value - price.value) / price.value) * 100))
const eur = (n) => '€' + Math.round(n).toLocaleString('en-US')
const signed = (n) => (n >= 0 ? '+' : '') + n + '%'
const inRange = computed(() => share.value >= 10 && share.value <= 30)
const priceBar = computed(() => Math.min(100, share.value))
</script>

<template>
  <div class="card">
    <h4>Value per seat · try your own numbers</h4>
    <div class="small">Hours saved per seat per month: <b class="blue">{{ hours }} h</b></div>
    <input type="range" min="1" max="10" step="0.5" v-model.number="hours" />
    <div class="small" style="margin-top: 4px">Billable hourly rate: <b class="blue">€{{ rate }}</b></div>
    <input type="range" min="100" max="400" step="10" v-model.number="rate" />
    <div class="small" style="margin-top: 4px">Price per seat per month: <b class="blue">€{{ monthly }}</b></div>
    <input type="range" min="100" max="400" step="10" v-model.number="monthly" />
    <div class="small" style="margin-top: 4px">Year-1 adoption: <b class="blue">{{ adoption }}%</b> <span class="muted">(realistic: 30 to 60%)</span></div>
    <input type="range" min="30" max="60" step="5" v-model.number="adoption" />

    <div style="margin-top: 12px">
      <div class="bar green" style="width: 100%">Value created at full use: {{ eur(fullValue) }} / year</div>
      <div class="bar blue" :style="{ width: priceBar + '%', minWidth: '150px', marginTop: '6px' }">Price: {{ eur(price) }}</div>
    </div>
    <div style="margin-top: 8px">
      <span class="chip" :class="inRange ? 'green' : 'amber'">Price = {{ share }}% of value (target 10 to 30%)</span>
      <span class="chip blue">ROI year 1: {{ signed(roiY1) }}</span>
      <span class="chip blue">ROI once adopted: {{ signed(roiFull) }}</span>
    </div>
  </div>
</template>
