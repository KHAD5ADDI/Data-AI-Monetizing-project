<script setup>
// Positionnement illustratif (appréciation de l'équipe, pas une mesure).
const dots = [
  { n: 'Google Patents, Lens', x: 70, y: 232, c: '#8d93a6' },
  { n: 'Patsnap, Questel, Derwent', x: 360, y: 90, c: '#8d93a6' },
  { n: 'IPRally', x: 330, y: 135, c: '#8d93a6' },
  { n: 'Patlytics', x: 285, y: 62, c: '#a8465a' },
]
</script>

<template>
  <div class="card" style="padding: 12px 14px">
    <h4 style="margin-bottom: 4px">Positioning map (team assessment, illustrative)</h4>
    <svg viewBox="0 0 470 300" style="width: 100%; height: auto; display: block">
      <rect x="40" y="10" width="420" height="250" rx="10" fill="#fffdf9" stroke="#e2dccf" />
      <line x1="250" y1="10" x2="250" y2="260" stroke="#ebe5d8" stroke-dasharray="4 4" />
      <line x1="40" y1="135" x2="460" y2="135" stroke="#ebe5d8" stroke-dasharray="4 4" />
      <rect x="60" y="28" width="170" height="92" rx="14" fill="#e8edf3" opacity="0.8" />
      <text x="72" y="50" style="font-size:11px" fill="#263f5e" font-weight="700">THE GAP</text>
      <text x="72" y="66" style="font-size:11px" fill="#35557a">claim-level, SME price</text>
      <g v-for="d in dots" :key="d.n">
        <circle :cx="d.x + 40" :cy="d.y" r="9" :fill="d.c" opacity="0.9" />
        <text :x="d.x + 40" :y="d.y + 24" style="font-size:10.5px" fill="#3a4459" text-anchor="middle">{{ d.n }}</text>
      </g>
      <circle cx="150" cy="92" r="14" fill="#35557a" />
      <circle cx="150" cy="92" r="21" fill="none" stroke="#35557a" stroke-width="2" stroke-dasharray="3 3" />
      <text x="150" y="132" style="font-size:12.5px" fill="#263f5e" font-weight="700" text-anchor="middle">Verbatim</text>
      <text x="250" y="288" style="font-size:11px" fill="#667086" text-anchor="middle">Price and set-up effort  →</text>
      <text x="12" y="135" style="font-size:11px" fill="#667086" text-anchor="middle" transform="rotate(-90 12 135)">Claim-by-claim depth  →</text>
    </svg>
  </div>
</template>
