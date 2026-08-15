declare module 'react' {
  export type ReactNode = unknown
  export type Dispatch<T> = (value: T) => void
  export type SetStateAction<T> = T | ((current: T) => T)
  export function useState<T>(initial: T): [T, Dispatch<SetStateAction<T>>]
  export function useMemo<T>(factory: () => T, deps: unknown[]): T
  export function useCallback<T extends (...args: any[]) => unknown>(
    callback: T,
    deps: unknown[],
  ): T
  export function useEffect(
    callback: () => void | (() => void),
    deps: unknown[],
  ): void
  export function useRef<T>(initial: T | null): { current: T | null }
}

declare namespace React {
  type ReactNode = unknown
  type Dispatch<T> = (value: T) => void
  type SetStateAction<T> = T | ((current: T) => T)
}

declare module 'react/jsx-runtime' {
  export const Fragment: unknown
  export function jsx(type: unknown, props: unknown): unknown
  export function jsxs(type: unknown, props: unknown): unknown
}

declare namespace JSX {
  interface ElementChildrenAttribute {
    children: unknown
  }

  interface IntrinsicElements {
    [name: string]: {
      [property: string]: unknown
      children?: unknown
      onChange?: (event: {
        target: HTMLInputElement & HTMLTextAreaElement
      }) => void
    }
  }
}

declare module 'lucide-react' {
  export const Bell: any
  export const BookOpenText: any
  export const CheckCircle2: any
  export const ChevronRight: any
  export const CircleAlert: any
  export const ExternalLink: any
  export const FilePlus2: any
  export const FileText: any
  export const FolderKanban: any
  export const Github: any
  export const Home: any
  export const KeyRound: any
  export const LayoutDashboard: any
  export const Link2: any
  export const LoaderCircle: any
  export const LogOut: any
  export const Mail: any
  export const Menu: any
  export const PanelLeftClose: any
  export const RefreshCw: any
  export const Rss: any
  export const Save: any
  export const Search: any
  export const ShieldCheck: any
  export const Trash2: any
  export const UserRound: any
  export const Users: any
  export const X: any
}
