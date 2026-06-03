/// <reference types="vite/client" />

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
}
