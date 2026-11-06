import { Component, type ReactNode } from 'react';

// Saved data stays in the browser, so a reload is enough to recover from an unexpected error.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="ov" role="alert">
        <div className="card">
          <h2>صار خطأ من عندنا</h2>
          <p>مو منك. بياناتك محفوظة، جرّب تحدّث الصفحة.</p>
          <button type="button" className="btn" onClick={() => location.reload()}>تحديث الصفحة</button>
        </div>
      </div>
    );
  }
}
