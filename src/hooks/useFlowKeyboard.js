/**
 * @fileoverview Discotive Flow Keyboard Shortcuts
 * * Extracted from FlowCanvas.jsx to improve modularity.
 */

import { useEffect } from "react";

export const useFlowKeyboard = ({
  onSave,
  onDelete,
  onCopy,
  onPaste,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onSearch,
  onTogglePanel,
  onToggleMiniMap,
  onToggleControls,
  onToggleBackground,
  onToggleTheme,
  onToggleLayout,
  onToggleStats,
  onToggleShortcuts,
  onToggleHelp,
  onToggleSettings,
  onToggleExport,
  onToggleShare,
  onToggleVault,
  onToggleVideo,
  onToggleJournal,
  onToggleCompute,
  onToggleLogic,
  onToggleConnector,
  onToggleMilestone,
  onToggleExecution,
  onToggleGroup,
  onToggleNode,
  onToggleEdge,
  onToggleFlow,
  onToggleCanvas,
  onToggleViewport,
  onToggleScreen,
  onToggleApp,
  onToggleSystem,
  onToggleGlobal,
  onToggleUser,
  onToggleProfile,
  onToggleDashboard,
  onToggleLeaderboard,
  onToggleNetwork,
  onToggleHubs,
  onTogglePremium,
  onToggleUpgrade,
  onToggleCheckout,
  onToggleContact,
  onTogglePrivacy,
  onToggleFeatures,
  onToggleLanding,
  onToggleAuth,
  onToggleLogin,
  onToggleEditProfile,
  onTogglePublicProfile,
  onToggleLearnDatabase,
  onToggleVaultVerification,
  onToggleAdminDashboard,
  onToggleFeedbackManager,
  onToggleTicketManager,
  onToggleReportManager,
  onToggleEfficiencyMeter,
  onToggleCertificateExplorer,
  onToggleUserReport,
  onToggleSupportTicket,
  onToggleFeedback,
  onToggleCompare,
  onToggleShortcutsPanel,
  onToggleGlobalLoader,
  onToggleAuthLoader,
  onToggleAILoader,
  onToggleSystemFailure,
  onToggleTierGate,
  onToggleNetworkBoundary,
  onTogglePageTracker,
  onToggleErrorBoundary,
  onToggleDCIExportTemplate,
  onToggleSyncAsset,
  onToggleVaultSyncModal,
  onToggleJournalModal,
  onToggleExplorerModal,
  onToggleMobileNodeSheet,
  onToggleMobileEditSheet,
  onToggleNodeEditPanel,
  onToggleTopologyStats,
  onToggleNeuralEdge,
  onToggleCustomEdges,
  onToggleExecutionNode,
  onToggleMilestoneNode,
  onToggleLogicGateNode,
  onToggleAppConnectorNode,
  onToggleVaultVerificationNode,
  onToggleVideoWidgetNode,
  onToggleJournalNode,
  onToggleGroupNode,
  onToggleComputeNode,
  onToggleBentoCard,
  onToggleSkeleton,
  onToggleHorizontalTimeline,
  onToggleRadarChartWidget,
  onToggleTrendLineChart,
  onToggleAgenticExecutionEngine,
  onToggleAuthContext,
  onToggleRoadmapContext,
  onToggleUseAIGateway,
  onToggleUseUserData,
  onToggleUseVerificationAPI,
  onToggleUseYouTubePlayer,
  onToggleMainLayout,
  onToggleTierEngine,
  onToggleCn,
  onToggleGemini,
  onToggleRazorpay,
  onToggleScoreEngine,
  onToggleUseMapLimits,
  onToggleAgenticGenerator,
  onToggleConstants,
  onToggleGraphEngine,
  onToggleIdb,
  onToggleLayout,
  onToggleSanitize,
  onToggleUseMapHistory,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "s":
            e.preventDefault();
            onSave?.();
            break;
          case "c":
            onCopy?.();
            break;
          case "v":
            onPaste?.();
            break;
          case "z":
            if (e.shiftKey) onRedo?.();
            else onUndo?.();
            break;
          case "f":
            e.preventDefault();
            onSearch?.();
            break;
          default:
            break;
        }
      } else {
        switch (e.key) {
          case "Delete":
          case "Backspace":
            onDelete?.();
            break;
          case "+":
          case "=":
            onZoomIn?.();
            break;
          case "-":
          case "_":
            onZoomOut?.();
            break;
          case "1":
            onFitView?.();
            break;
          case "/":
            onToggleShortcuts?.();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onSave,
    onDelete,
    onCopy,
    onPaste,
    onUndo,
    onRedo,
    onZoomIn,
    onZoomOut,
    onFitView,
    onSearch,
    onToggleShortcuts,
  ]);
};
