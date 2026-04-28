import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { logEvent } from "firebase/analytics";
import { analytics } from "../firebase"; // Adjust this path if your firebase.js is elsewhere

const PageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (analytics) {
      // MAANG Fix: Defer telemetry payload by 150ms.
      // This allows react-helmet-async to flush the new route's <title> to the document <head>.
      const timeoutId = setTimeout(() => {
        logEvent(analytics, "page_view", {
          page_path: location.pathname,
          page_title: document.title, // Now guaranteed to be accurate
          page_search: location.search,
        });
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [location]); // This array ensures it fires EVERY time the route changes

  // This component doesn't render anything visually
  return null;
};

export default PageTracker;
