import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClickTooltipProps {
  content: string;
  className?: string;
  showOnLabelClick?: boolean;
  children?: React.ReactNode;
}

export function ClickTooltip({ 
  content, 
  className = "", 
  showOnLabelClick = false, 
  children 
}: ClickTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        triggerRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block">
      <div 
        ref={triggerRef}
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-1",
          showOnLabelClick && "cursor-default",
          className
        )}
      >
        {children}
        <Info className="h-3 w-3 text-muted-foreground" />
      </div>
      
      {isOpen && (
        <div
          ref={tooltipRef}
          className="absolute z-50 w-64 p-2 text-xs bg-popover text-popover-foreground border border-border rounded-md shadow-md mt-1 left-0"
        >
          <p>{content}</p>
        </div>
      )}
    </div>
  );
}