import { reactive } from 'vue'

interface ConfirmOptions {
  description?: string
  confirmLabel?: string
  danger?: boolean
}

export function useConfirm() {
  const confirmState = reactive({
    show: false,
    message: '',
    description: '',
    confirmLabel: 'Eliminar',
    danger: true,
    resolve: null as ((value: boolean) => void) | null,
  })

  function showConfirm(message: string, options?: ConfirmOptions): Promise<boolean> {
    confirmState.message = message
    confirmState.description = options?.description ?? ''
    confirmState.confirmLabel = options?.confirmLabel ?? 'Eliminar'
    confirmState.danger = options?.danger ?? true
    confirmState.show = true
    return new Promise(resolve => {
      confirmState.resolve = resolve
    })
  }

  function onConfirm() {
    confirmState.show = false
    confirmState.resolve?.(true)
    confirmState.resolve = null
  }

  function onCancel() {
    confirmState.show = false
    confirmState.resolve?.(false)
    confirmState.resolve = null
  }

  return { confirmState, showConfirm, onConfirm, onCancel }
}
