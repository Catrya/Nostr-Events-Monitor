import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';

interface UseCopyToClipboardReturn {
  copyToClipboard: (text: string) => Promise<void>;
  isCopying: boolean;
  copySuccess: boolean;
}

export function useCopyToClipboard(): UseCopyToClipboardReturn {
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = useCallback(async (text: string) => {
    setIsCopying(true);
    setCopySuccess(false);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopySuccess(true);
      toast({
        title: 'Copied!',
        description: 'Event copied to clipboard',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy text: ', error);
      toast({
        title: 'Copy failed',
        description: 'Unable to copy to clipboard',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsCopying(false);
      
      // Reset success state after a short delay
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    }
  }, [toast]);

  return {
    copyToClipboard,
    isCopying,
    copySuccess,
  };
}