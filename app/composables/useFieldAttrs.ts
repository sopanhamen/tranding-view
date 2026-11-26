import { useAttrs } from 'vue'

// Form controls set `inheritAttrs: false`: class/style go on the `.field` wrapper,
// everything else (type, step, placeholder, aria-*) goes on the native control.
// `attrs` isn't reactive, so these are read from the template on each render.
export function useFieldAttrs() {
  const attrs = useAttrs()
  return {
    rootAttrs: () => ({ class: attrs.class, style: attrs.style }),
    controlAttrs: () => {
      const rest: Record<string, unknown> = {}
      for (const key in attrs) if (key !== 'class' && key !== 'style') rest[key] = attrs[key]
      return rest
    },
  }
}
