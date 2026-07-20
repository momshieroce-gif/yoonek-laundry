<template>
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FF69B4" />
        <stop offset="60%" stop-color="#E91E8C" />
        <stop offset="100%" stop-color="#C2185B" />
      </linearGradient>
    </defs>

    <!-- Outer badge ring with gradient -->
    <circle cx="100" cy="100" r="96" fill="url(#pinkGrad)" />

    <!-- Thin white separator ring -->
    <circle cx="100" cy="100" r="86" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.7" />

    <!-- White inner face -->
    <circle cx="100" cy="100" r="80" fill="#FFFFFF" />

    <!-- Soft decorative bubbles inside the face -->
    <circle cx="52" cy="62" r="14" fill="#E91E8C" opacity="0.08" />
    <circle cx="150" cy="120" r="18" fill="#1E5AA8" opacity="0.07" />
    <circle cx="140" cy="52" r="5" fill="#E91E8C" opacity="0.25" />
    <circle cx="148" cy="64" r="3" fill="#1E5AA8" opacity="0.3" />
    <circle cx="54" cy="130" r="4" fill="#E91E8C" opacity="0.25" />
    <circle cx="46" cy="118" r="2.5" fill="#1E5AA8" opacity="0.3" />

    <!-- Large washing machine as focal point -->
    <g transform="translate(72, 50)">
      <!-- Shadow/depth effect -->
      <rect x="2.5" y="2.5" width="56" height="60" rx="5" fill="#1E5AA8" opacity="0.2" />

      <!-- Machine body - taller than wide like a real washer -->
      <rect x="0" y="0" width="56" height="60" rx="5" fill="#E91E8C" stroke="#FFFFFF" stroke-width="2" />

      <!-- Top control panel strip -->
      <rect x="0" y="0" width="56" height="13" rx="5" fill="#C2185B" />
      <rect x="0" y="8" width="56" height="5" fill="#C2185B" />

      <!-- Detergent drawer (left of panel) -->
      <rect x="5" y="4" width="12" height="6" rx="1.5" fill="#FFFFFF" />

      <!-- Program dial (knob) -->
      <circle cx="27" cy="7" r="3.5" fill="#FFFFFF" />
      <rect x="26.4" y="4" width="1.2" height="3" fill="#C2185B" />

      <!-- Small buttons -->
      <circle cx="37" cy="7" r="1.8" fill="#FFFFFF" opacity="0.9" />
      <circle cx="43" cy="7" r="1.8" fill="#FFFFFF" opacity="0.9" />
      <circle cx="49" cy="7" r="1.8" fill="#FFFFFF" opacity="0.9" />

      <!-- Round front-load door: outer ring -->
      <circle cx="28" cy="37" r="17" fill="#FFFFFF" />
      <!-- Door rubber seal -->
      <circle cx="28" cy="37" r="13.5" fill="none" stroke="#E91E8C" stroke-width="2" />
      <!-- Glass with water inside -->
      <circle cx="28" cy="37" r="11.5" fill="#1E5AA8" />
      <!-- Water wave inside drum -->
      <path d="M 18.5 39 Q 23 35.5 28 39 T 37.5 39 L 37.5 44 Q 28 49.5 18.5 44 Z" fill="#5B8FD9" />
      <!-- Glass shine -->
      <circle cx="23.5" cy="32" r="3" fill="#FFFFFF" opacity="0.5" />
      <!-- Bubbles in the drum -->
      <circle cx="33" cy="33" r="1.4" fill="#FFFFFF" opacity="0.8" />
      <circle cx="30" cy="30" r="0.9" fill="#FFFFFF" opacity="0.7" />

      <!-- Door hinge dots (right edge) -->
      <circle cx="49.5" cy="33" r="1.3" fill="#FFFFFF" opacity="0.85" />
      <circle cx="49.5" cy="41" r="1.3" fill="#FFFFFF" opacity="0.85" />

      <!-- Feet -->
      <rect x="6" y="60" width="6" height="4" rx="1.5" fill="#C2185B" />
      <rect x="44" y="60" width="6" height="4" rx="1.5" fill="#C2185B" />
    </g>
    
    <!-- YOONEK brand name -->
    <text x="100" y="138" text-anchor="middle" fill="#E91E8C" font-size="20" font-weight="bold" font-family="Arial, sans-serif" style="letter-spacing: 3px;">
      YOONEK
    </text>

    <!-- LAUNDRY SHOP tagline -->
    <text x="100" y="150" text-anchor="middle" fill="#1E5AA8" font-size="8" font-weight="bold" font-family="Arial, sans-serif" style="letter-spacing: 2.5px;">
      LAUNDRY SHOP
    </text>

    <!-- EST. 2024 with elegant flanking lines -->
    <g transform="translate(100, 161)">
      <rect x="-38" y="-1" width="14" height="1.6" rx="0.8" fill="#1E5AA8" opacity="0.8" />
      <text x="0" y="2.5" text-anchor="middle" fill="#1E5AA8" font-size="7.5" font-weight="bold" font-family="Arial, sans-serif" style="letter-spacing: 1px;">EST. 2024</text>
      <rect x="24" y="-1" width="14" height="1.6" rx="0.8" fill="#1E5AA8" opacity="0.8" />
    </g>

  </svg>
</template>

<script setup>
</script>

<style scoped>
svg {
  width: 100%;
  height: 100%;
}
</style>
