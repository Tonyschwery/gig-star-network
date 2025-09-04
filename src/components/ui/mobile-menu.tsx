import * as React from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Menu, X } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications"

interface MobileMenuProps {
  children: React.ReactNode
}

export function MobileMenu({ children }: MobileMenuProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()
  const { unreadCount } = useUnreadNotifications()

  // Only render on mobile
  if (!isMobile) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden relative">
          <Menu className="h-4 w-4" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full"></div>
          )}
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[400px]">
        <button 
          data-mobile-menu-close 
          className="absolute top-4 right-4 opacity-0 pointer-events-none"
          onClick={() => setOpen(false)}
        />
        <div className="flex flex-col space-y-4 py-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}