<script setup>
import { ref } from 'vue'

const props = defineProps({ url: { type: String, default: '' } })
const tab = ref(1)
const live = ref(false)
const patents = [
  { n: 'Patent A', s: 87 },
  { n: 'Patent B', s: 81 },
  { n: 'Patent C', s: 74 },
  { n: 'Patent D', s: 69 },
  { n: 'Patent E', s: 63 },
]
</script>

<template>
  <div class="card" style="min-height: 262px">
    <div style="margin-bottom: 8px">
      <button class="btn" :class="{ on: !live && tab === 1 }" style="margin-right: 4px; padding: 4px 11px; font-size: 12.5px" @click="live = false; tab = 1">1 Input</button>
      <button class="btn" :class="{ on: !live && tab === 2 }" style="margin-right: 4px; padding: 4px 11px; font-size: 12.5px" @click="live = false; tab = 2">2 Top 5</button>
      <button class="btn" :class="{ on: !live && tab === 3 }" style="margin-right: 4px; padding: 4px 11px; font-size: 12.5px" @click="live = false; tab = 3">3 Claim table</button>
      <button class="btn" :class="{ on: live }" style="padding: 4px 11px; font-size: 12.5px" :disabled="!props.url" @click="live = !live">▶ Live PoC</button>
    </div>

    <iframe v-if="live && props.url" :src="props.url" style="width: 100%; height: 290px; border: 1px solid var(--line); border-radius: 10px" />

    <div v-else-if="tab === 1">
      <div class="small muted">The jury describes an invention in about 5 lines. Example (fictional):</div>
      <div style="margin-top: 6px; padding: 10px 13px; border: 1px solid var(--line); border-radius: 12px; background: #fbfaf7; font-size: 14.5px">
        “A bicycle helmet with an embedded sensor that detects a crash and automatically sends an alert with the rider's location to an emergency contact.”
      </div>
      <div style="margin-top: 8px"><span class="chip blue">Search ▸</span> <span class="small muted">under one minute</span></div>
      <div v-if="!props.url" class="tiny muted" style="margin-top: 6px">Live PoC button activates once the link is set in slides.md.</div>
    </div>

    <div v-else-if="tab === 2">
      <div class="small muted">The 5 closest public patents, ranked by similarity (illustrative mock-up, not real patent data):</div>
      <div v-for="p in patents" :key="p.n" class="hrow" style="margin-top: 6px; margin-bottom: 0">
        <div style="width: 100px; font-weight: 650; font-size: 14px">{{ p.n }}</div>
        <div class="hbar"><div class="bar blue" :style="{ width: p.s + '%' }">{{ p.s }}%</div></div>
      </div>
    </div>

    <div v-else>
      <div class="small muted">Claim-by-claim comparison with the exact sentence highlighted (illustrative mock-up):</div>
      <table class="tbl" style="margin-top: 6px">
        <thead><tr><th>Claim</th><th>Status</th><th>Exact text from the patent</th><th class="r">Confidence</th></tr></thead>
        <tbody>
          <tr><td>1</td><td><span class="chip green">Overlaps</span></td><td><mark style="background: #ffe9a8">[exact sentence copied from the claim, checked by code]</mark></td><td class="r">0.91</td></tr>
          <tr><td>2</td><td><span class="chip amber">Partial</span></td><td><mark style="background: #ffe9a8">[exact sentence from the claim]</mark></td><td class="r">0.64</td></tr>
          <tr><td>3</td><td><span class="chip">None</span></td><td class="muted">No overlapping passage found</td><td class="r">n/a</td></tr>
        </tbody>
      </table>
      <div class="tiny muted" style="margin-top: 6px">Every quote is verified in code as an exact substring of the patent text; otherwise it is rejected.</div>
    </div>
  </div>
</template>
