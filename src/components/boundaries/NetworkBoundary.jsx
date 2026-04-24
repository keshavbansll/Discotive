import React, { useState, useEffect } from "react";
import * as Sentry from "@sentry/react";
import SystemFailure from "./SystemFailure";

const NetworkBoundary = ({ children }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      Sentry.addBreadcrumb({
        category: "network",
        message: "Client lost network connection",
        level: "warning",
      });
    };

    const handleOnline = () => {
      setIsOffline(false);
      Sentry.addBreadcrumb({
        category: "network",
        message: "Client regained network connection",
        level: "info",
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (isOffline) {
    return (
      <SystemFailure
        errorType="Connection Severed"
        errorMessage="The engine was unable to establish a secure link. Awaiting network realignment."
        resetBoundary={() => {
          if (navigator.onLine) {
            setIsOffline(false);
          }
        }}
      />
    );
  }

  return children;
};

export default NetworkBoundary;
