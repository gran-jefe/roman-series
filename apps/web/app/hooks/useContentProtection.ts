import { useEffect } from "react";

export function useContentProtection() {
  useEffect(() => {
    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable Ctrl/Cmd+C (copy), Ctrl/Cmd+X (cut), Ctrl/Cmd+A (select all)
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "c" || e.key === "x" || e.key === "a")
      ) {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl/Cmd+S (save)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl/Cmd+P (print)
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl/Cmd+Shift+S (screenshot on some browsers)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "s") {
        e.preventDefault();
        return false;
      }

      // Disable Print Screen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        return false;
      }

      // Disable F12 (dev tools)
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl/Cmd+Shift+I (dev tools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "i") {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl/Cmd+Shift+C (inspect element)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "c") {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl/Cmd+Shift+J (console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "j") {
        e.preventDefault();
        return false;
      }

      return true;
    };

    // Prevent text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Prevent drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Detect screenshot attempts via visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - might indicate screenshot or screen recording
        // You can add logging or alerts here if needed
        console.log("Screen capture attempt detected");
      }
    };

    // Prevent copy paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("contextmenu", handleContextMenu, false);
    document.addEventListener("keydown", handleKeyDown, false);
    document.addEventListener("selectstart", handleSelectStart, false);
    document.addEventListener("dragstart", handleDragStart, false);
    document.addEventListener("visibilitychange", handleVisibilityChange, false);
    document.addEventListener("copy", handleCopy, false);
    document.addEventListener("cut", handleCut, false);

    // Disable printing
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        body {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, false);
      document.removeEventListener("keydown", handleKeyDown, false);
      document.removeEventListener("selectstart", handleSelectStart, false);
      document.removeEventListener("dragstart", handleDragStart, false);
      document.removeEventListener("visibilitychange", handleVisibilityChange, false);
      document.removeEventListener("copy", handleCopy, false);
      document.removeEventListener("cut", handleCut, false);
      document.head.removeChild(style);
    };
  }, []);
}
