<script setup>
import { ref, computed } from 'vue'

const scenarios = {
  Cautious: [3, 8, 16],
  Base: [5, 15, 30],
  Ambitious: [8, 25, 50],
}
const current = ref('Base')

const SEATS = 5
const PRICE = 2400
const VAR = 0.1
const FIXED = [120, 200, 280]

const rows = computed(() => {
  const ends = scenarios[current.value]
  let prev = 0
  let cum = 0
  return ends.map((c, i) => {
    const arr = (c * SEATS * PRICE) / 1000
    const rev = (prev + arr) / 2
    const varc = rev * VAR
    const res = rev - varc - FIXED[i]
    cum += res
    prev = arr
    return { year: i + 1, cabinets: c, arr, rev, varc, fixed: FIXED[i], res, cum }
  })
})

const peak = computed(() => Math.min(...rows.value.map((r) => r.cum)))
const crossYear = computed(() => {
  const r = rows.value.find((x) => x.arr * (1 - VAR) >= x.fixed)
  return r ? 'Year ' + r.year : 'Not within 3 years'
})
const ASK = 250
const askText = computed(() => {
  const gap = Math.round(-peak.value - ASK)
  return gap > 0 ? '€250k ask: €' + gap + 'k short' : '€250k ask: covered, €' + -gap + 'k margin'
})
const askShort = computed(() => -peak.value > ASK)
const f = (n) => (n < 0 ? '−' : '') + Math.abs(Math.round(n))

// Barres du résultat cumulé
const maxAbs = computed(() => Math.max(1, ...rows.value.map((r) => Math.abs(r.cum))))
const bars = computed(() =>
  rows.value.map((r, i) => {
    const h = (Math.abs(r.cum) / maxAbs.value) * 22
    const x = 40 + i * 90
    return { x, h, neg: r.cum < 0, val: r.cum, y: r.cum < 0 ? 38 : 38 - h }
  }),
)
</script>

<template>
  <div class="card">
    <h4>Forecast P&amp;L (€k) · pick a scenario</h4>
    <div style="margin-bottom: 8px">
      <button v-for="(v, k) in scenarios" :key="k" class="btn" :class="{ on: current === k }" style="margin-right: 6px" @click="current = k">{{ k }}</button>
    </div>
    <table class="tbl" style="font-size: 13.5px">
      <thead>
        <tr><th></th><th class="r">Year 1</th><th class="r">Year 2</th><th class="r">Year 3</th></tr>
      </thead>
      <tbody>
        <tr><td>Recurring revenue (ARR)</td><td v-for="r in rows" :key="r.year" class="r">{{ f(r.arr) }}</td></tr>
        <tr><td>Revenue recognised</td><td v-for="r in rows" :key="r.year" class="r">{{ f(r.rev) }}</td></tr>
        <tr><td>Costs (10% variable + fixed)</td><td v-for="r in rows" :key="r.year" class="r">{{ f(-(r.varc + r.fixed)) }}</td></tr>
        <tr class="hl"><td>Result</td><td v-for="r in rows" :key="r.year" class="r">{{ f(r.res) }}</td></tr>
      </tbody>
    </table>
    <svg viewBox="0 0 360 74" style="width: 100%; height: auto; display: block; margin-top: 4px">
      <text x="0" y="10" style="font-size:10px" fill="#667086">Cumulative result (€k)</text>
      <line x1="30" y1="38" x2="350" y2="38" stroke="#d9d3c4" />
      <g v-for="(b, i) in bars" :key="i">
        <rect :x="b.x" :y="b.y" width="46" :height="Math.max(b.h, 1)" rx="3" :fill="b.neg ? '#a8465a' : '#3d7a65'" opacity="0.88" />
        <text :x="b.x + 23" :y="b.neg ? 32 : b.y - 4" style="font-size:10.5px" font-weight="700" text-anchor="middle" fill="#1c2434">{{ f(b.val) }}</text>
        <text :x="b.x + 23" y="72" style="font-size:10px" text-anchor="middle" fill="#667086">Year {{ i + 1 }} · {{ rows[i].cabinets }} firms</text>
      </g>
    </svg>
    <div style="margin-top: 4px">
      <span class="chip amber" style="font-size:11.5px;padding:1px 9px">Peak cumulative loss: €{{ f(-peak) }}k</span>
      <span class="chip blue" style="font-size:11.5px;padding:1px 9px">Run-rate break-even: {{ crossYear }}</span>
      <span class="chip" :class="askShort ? 'amber' : 'green'" style="font-size:11.5px;padding:1px 9px">{{ askText }}</span>
    </div>
  </div>
</template>
