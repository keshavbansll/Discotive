// src/pages/Auth/components/AuthSteps.jsx
import { AnimatePresence } from "framer-motion";
// Assume you broke out each form block into these files:
import LoginStep from "../steps/LoginStep";
import InitProfileStep from "../steps/InitProfileStep";
import CoordinatesStep from "../steps/CoordinatesStep";
import LockedProtocol from "../steps/LockedProtocol";
import BaselineStep from "../steps/BaselineStep";
import VisionStep from "../steps/VisionStep";
import ArsenalStep from "../steps/ArsenalStep";
import ResourceStep from "../steps/ResourceStep";
import FootprintStep from "../steps/FootprintStep";
import FinalCanvasStep from "../steps/FinalCanvasStep";

export default function AuthSteps({ isLogin, step, ...props }) {
  return (
    <AnimatePresence mode="wait">
      {isLogin && <LoginStep key="login" {...props} />}
      {!isLogin && step === 1 && <InitProfileStep key="step1" {...props} />}
      {!isLogin && step === 2 && <CoordinatesStep key="step2" {...props} />}
      {!isLogin && step === "locked" && (
        <LockedProtocol key="locked" {...props} />
      )}
      {/* ... Render remaining steps ... */}
      {!isLogin && step === 8 && <FinalCanvasStep key="step8" {...props} />}
    </AnimatePresence>
  );
}
