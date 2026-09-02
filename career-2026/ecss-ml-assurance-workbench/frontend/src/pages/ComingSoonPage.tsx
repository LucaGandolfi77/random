import { useParams } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Rocket } from "lucide-react";

export function ComingSoonPage() {
  const { feature = "" } = useParams();
  return (
    <Card className="mx-auto mt-4 max-w-3xl">
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Rocket className="h-8 w-8 text-accent-400" />
        <h1 className="text-lg font-semibold text-slate-100">{decodeURIComponent(feature)}</h1>
        <p className="max-w-md text-sm text-slate-400">
          This module is planned for a later iteration and is intentionally not implemented in week 1 to avoid placeholder
          functionality. The backend and UI are structured so the module can be added without rework.
        </p>
      </div>
    </Card>
  );
}
