import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { logEvent } from "firebase/analytics";
import { analytics } from "../firebase"; // Adjust this path if your firebase.js is elsewhere

const PageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // If analytics is initialized (and not blocked by an adblocker)
    if (analytics) {
      logEvent(analytics, "page_view", {
        page_path: location.pathname,
        page_title: document.title,
        page_search: location.search,
      });
    }
  }, [location]); // This array ensures it fires EVERY time the route changes

  // This component doesn't render anything visually
  return null;
};

export default PageTracker;
