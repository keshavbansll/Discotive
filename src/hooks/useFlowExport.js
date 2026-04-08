/**
 * @fileoverview Discotive Flow Export Hook
 * * Handles high-DPI PNG and PDF exports.
 * * Implements dynamic pixel ratios to prevent mobile crashes.
 */

import { useCallback } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export const useFlowExport = (reactFlowInstance) => {
  const exportToPng = useCallback(async () => {
    if (!reactFlowInstance) return;

    const element = document.querySelector(".react-flow__viewport");
    if (!element) return;

    // Dynamic Pixel Ratio: High for desktop, lower for mobile to prevent iOS Safari crashes
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const pixelRatio = isMobile ? 1.5 : 3;

    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "#030303",
        pixelRatio,
        quality: 1,
      });

      const link = document.createElement("a");
      link.download = `discotive-execution-map-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("[Export Error]:", error);
    }
  }, [reactFlowInstance]);

  const exportToPdf = useCallback(async () => {
    if (!reactFlowInstance) return;

    const element = document.querySelector(".react-flow__viewport");
    if (!element) return;

    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "#030303",
        pixelRatio: 2,
      });

      const pdf = new jsPDF("l", "mm", "a4");
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`discotive-execution-map-${Date.now()}.pdf`);
    } catch (error) {
      console.error("[Export Error]:", error);
    }
  }, [reactFlowInstance]);

  return { exportToPng, exportToPdf };
};
