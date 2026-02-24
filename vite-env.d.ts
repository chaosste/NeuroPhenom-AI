/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VOICE_PROVIDER_DEFAULT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
