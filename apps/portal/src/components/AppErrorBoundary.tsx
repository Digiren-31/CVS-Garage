import { Button, MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { Component, type ErrorInfo, type PropsWithChildren } from 'react';

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Portal render failure', error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="fatal-error">
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>The portal could not render this screen.</MessageBarTitle>
            {this.state.error.message}
          </MessageBarBody>
        </MessageBar>
        <Button appearance="primary" onClick={() => window.location.reload()}>
          Reload portal
        </Button>
      </main>
    );
  }
}
