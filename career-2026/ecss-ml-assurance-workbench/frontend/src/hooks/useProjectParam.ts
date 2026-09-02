import { useParams } from "react-router-dom";

export function useProjectParam(): string {
  const { projectId = "" } = useParams();
  return projectId;
}
