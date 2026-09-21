import { WarningBanner } from "../ui/Feedback";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus();

  if (isOnline && !wasOffline) return null;

  return (
    <WarningBanner>
      <span className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        {wasOffline
          ? "You were offline. Changes have been queued and will sync when reconnected."
          : "You are currently offline. Some features may be limited."}
      </span>
    </WarningBanner>
  );
}