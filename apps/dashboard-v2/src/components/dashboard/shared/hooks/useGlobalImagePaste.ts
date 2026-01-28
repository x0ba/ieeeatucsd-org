import { useState, useCallback, useEffect } from 'react';

interface GlobalImagePasteConfig {
  modalType: string;
  enabled: boolean;
  onImagePaste: (file: File) => void;
  onPasteSuccess?: () => void;
}

export function useGlobalImagePaste(config: GlobalImagePasteConfig) {
  const [isPasting, setIsPasting] = useState(false);

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (!config.enabled) return;
    
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        setIsPasting(true);
        const blob = item.getAsFile();
        if (blob) {
          config.onImagePaste(blob);
          config.onPasteSuccess?.();
        }
        setIsPasting(false);
        return;
      }
    }
  }, [config]);

  useEffect(() => {
    if (config.enabled) {
      document.addEventListener('paste', handlePaste);
      return () => {
        document.removeEventListener('paste', handlePaste);
      };
    }
  }, [handlePaste, config.enabled]);

  return {
    isPasting,
    handlePaste
  };
}
