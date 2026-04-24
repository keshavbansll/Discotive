import React from "react";
import * as Sentry from "@sentry/react";
import SystemFailure from "./SystemFailure";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Sentry MAANG-grade Telemetry
    Sentry.withScope((scope) => {
      scope.setExtras(errorInfo);
      const eventId = Sentry.captureException(error);
      this.setState({ eventId, errorInfo });
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <SystemFailure
          errorType="RUNTIME_EXCEPTION"
          errorMessage={this.state.error?.toString()}
          errorStack={
            this.state.errorInfo?.componentStack || this.state.error?.stack
          }
          eventId={this.state.eventId}
          resetBoundary={() =>
            this.setState({
              hasError: false,
              error: null,
              errorInfo: null,
              eventId: null,
            })
          }
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
