import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useState } from "react";

export const PWAInstallPrompt = () => {
  const { isInstallable, isPWA, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if already installed as PWA
  if (!isInstallable || isDismissed || isPWA) return null;

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setIsDismissed(true);
    }
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 shadow-2xl border-primary/30 bg-card/95 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Install Qtalent App</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Get the full app experience with offline access, push notifications, and instant loading
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleInstall} className="flex-1">
                Install
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
