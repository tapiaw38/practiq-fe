import { reactive } from 'vue'

interface ConfirmOptions {
  description?: string
  confirmLabel?: string
  danger?: boolean
}

export function useConfirm() {
  let resolver: ((value: boolean) => void) | null = null

  const confirmState = reactive({
    show: false,
    message: '',
    description: '',
    confirmLabel: 'Eliminar',
    danger: true,
  })

  function showConfirm(message: string, options?: ConfirmOptions): Promise<boolean> {
    confirmState.message = message
    confirmState.description = options?.description ?? ''
    confirmState.confirmLabel = options?.confirmLabel ?? 'Eliminar'
    confirmState.danger = options?.danger ?? true
    confirmState.show = true
    return new Promise(resolve => {
      resolver = resolve
    })
  }

  function onConfirm() {
    confirmState.show = false
    resolver?.(true)
    resolver = null
  }

  function onCancel() {
    confirmState.show = false
    resolver?.(false)
    resolver = null
  }

  return { confirmState, showConfirm, onConfirm, onCancel }
}
