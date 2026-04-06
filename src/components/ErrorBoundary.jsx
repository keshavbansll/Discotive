import React from "react";
import * as Sentry from "@sentry/react";
import SystemFailure from "./SystemFailure";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, eventId: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      "[System Fault] Discotive Error Boundary Caught:",
      error,
      errorInfo,
    );

    // MAANG-Grade Telemetry Injection
    Sentry.withScope((scope) => {
      scope.setExtras(errorInfo);
      const eventId = Sentry.captureException(error);
      this.setState({ eventId });
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <SystemFailure
          errorType="RUNTIME_EXCEPTION"
          errorMessage={this.state.error?.toString()}
          // If you update SystemFailure, you can display this eventId to the user
          // so they can include it in their support tickets.
          eventId={this.state.eventId}
          resetBoundary={() =>
            this.setState({ hasError: false, eventId: null })
          }
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
