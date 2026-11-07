import { Component, type ReactNode } from 'react';
import { tr } from '../../i18n';

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
        <div className="dlg">
          <h2>{tr('common.errorTitle')}</h2>
          <p>{tr('common.errorText')}</p>
          <button type="button" className="btn" onClick={() => location.reload()}>{tr('common.errorReload')}</button>
        </div>
      </div>
    );
  }
}
