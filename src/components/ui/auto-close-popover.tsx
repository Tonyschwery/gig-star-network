import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AutoClosePopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  align?: "start" | "center" | "end";
}

export function AutoClosePopover({ 
  trigger, 
  children, 
  onOpenChange,
  open,
  align = "start" 
}: AutoClosePopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const actualOpen = open !== undefined ? open : isOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  // Clone the children to add auto-close behavior
  const childrenWithAutoClose = React.Children.map(children, child => {
    if (React.isValidElement(child) && child.type === 'div' && child.props.className?.includes('calendar')) {
      return React.cloneElement(child as React.ReactElement<any>, {
        onClick: (e: React.MouseEvent) => {
          if (child.props.onClick) {
            child.props.onClick(e);
          }
          // Check if a date was clicked
          if (e.target instanceof HTMLElement && e.target.closest('[role="gridcell"]')) {
            setTimeout(() => {
              handleOpenChange(false);
            }, 100);
          }
        }
      });
    }
    return child;
  });

  return (
    <Popover open={actualOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        {childrenWithAutoClose}
      </PopoverContent>
    </Popover>
  );
}