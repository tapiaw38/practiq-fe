/// <reference types="vite/client" />

declare module '*.mp3' {
  const src: string
  export default src
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_AUTH_API_URL: string
  readonly VITE_PRACTIQ_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface PractiqAssistantCaptureResult {
  dataUrl: string
  filename?: string
  contentType?: string
}

interface PractiqAssistantMediaAttachment extends PractiqAssistantCaptureResult {
  field: "voice_content"
}

type PractiqAssistantStructuredContextValue =
  | string
  | number
  | boolean
  | null
  | PractiqAssistantStructuredContextValue[]
  | { [key: string]: PractiqAssistantStructuredContextValue }

interface PractiqAssistantStructuredContext {
  [key: string]: PractiqAssistantStructuredContextValue
}

interface Window {
  __practiqAssistantCapture?: () =>
    | PractiqAssistantCaptureResult
    | Promise<PractiqAssistantCaptureResult | null>
    | null
  __practiqAssistantContext?: () =>
    | PractiqAssistantStructuredContext
    | Promise<PractiqAssistantStructuredContext | null>
    | null
  __practiqAssistantMediaAttachments?: () =>
    | PractiqAssistantMediaAttachment[]
    | Promise<PractiqAssistantMediaAttachment[]>
}
