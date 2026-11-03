import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback: ReactNode
}

interface State {
  failed: boolean
}

/** Menangkap error WebGL/three agar halaman tidak kosong. */
export class SceneBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SceneBoundary] Adegan 3D gagal dirender:', error, info)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
