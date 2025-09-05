import { defineCustomElement } from 'vue'
import VuePlanets from './VuePlanets.vue'

// Define the custom element
const VuePlanetsElement = defineCustomElement(VuePlanets)

// Register the custom element
customElements.define('vue-planets', VuePlanetsElement)

// Export for manual registration if needed
export { VuePlanetsElement, VuePlanets }

// Auto-register when script is loaded
if (typeof window !== 'undefined') {
  // Mark as loaded
  window.__VUE_PLANETS_LOADED__ = true
  
  // Dispatch event for React components to listen
  window.dispatchEvent(new CustomEvent('vue-planets-loaded', {
    detail: { element: VuePlanetsElement }
  }))
}