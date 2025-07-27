import * as React from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Menu, X } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface MobileMenuProps {
  children: React.ReactNode
}

export function MobileMenu({ children }: MobileMenuProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  // Only render on mobile
  if (!isMobile) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[400px]">
        <div className="flex flex-col space-y-4 py-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}