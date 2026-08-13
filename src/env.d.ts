/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_GITHUB_OAUTH_PROXY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
