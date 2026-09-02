import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { useToast } from "../hooks/useToast";
import { qk } from "./useProjectData";

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Request failed";
}

/** Mutations used across pages, all wired to query invalidation + toasts. */
export function useProjectMutations() {
  const client = useQueryClient();
  const toast = useToast();

  const invalidateProject = (projectId: string) => {
    void client.invalidateQueries({ queryKey: qk.project(projectId) });
    void client.invalidateQueries({ queryKey: ["projects"] });
  };

  const createProject = useMutation({
    mutationFn: endpoints.createProject,
    onSuccess: (p) => {
      void client.invalidateQueries({ queryKey: ["projects"] });
      toast.success(`Project "${p.name}" created`);
    },
    onError: (e) => toast.error(`Create failed: ${errorMessage(e)}`),
  });

  const updateProject = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof endpoints.updateProject>[1] }) =>
      endpoints.updateProject(id, payload),
    onSuccess: (_data, vars) => {
      invalidateProject(vars.id);
      toast.success("Project updated");
    },
    onError: (e) => toast.error(`Update failed: ${errorMessage(e)}`),
  });

  const uploadDataset = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => endpoints.uploadDataset(id, file),
    onSuccess: (_data, vars) => {
      invalidateProject(vars.id);
      void client.invalidateQueries({ queryKey: qk.dataset(vars.id) });
      void client.invalidateQueries({ queryKey: qk.preview(vars.id) });
      toast.success("Dataset uploaded");
    },
    onError: (e) => toast.error(`Upload failed: ${errorMessage(e)}`),
  });

  const deleteDataset = useMutation({
    mutationFn: (projectId: string) => endpoints.deleteDataset(projectId),
    onSuccess: (_d, projectId) => {
      invalidateProject(projectId);
      void client.invalidateQueries({ queryKey: qk.dataset(projectId) });
      void client.invalidateQueries({ queryKey: qk.preview(projectId) });
      void client.invalidateQueries({ queryKey: qk.score("none") });
      toast.success("Dataset deleted");
    },
    onError: (e) => toast.error(`Delete failed: ${errorMessage(e)}`),
  });

  const updateConfig = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof endpoints.updateConfig>[1] }) =>
      endpoints.updateConfig(id, payload),
    onSuccess: (_d, vars) => {
      void client.invalidateQueries({ queryKey: qk.config(vars.id) });
      toast.success("Analysis configuration saved");
    },
    onError: (e) => toast.error(`Config save failed: ${errorMessage(e)}`),
  });

  const runAnalysis = useMutation({
    mutationFn: endpoints.runAnalysis,
    onSuccess: (_run, projectId) => {
      invalidateProject(projectId);
      void client.invalidateQueries({ queryKey: qk.latestRun(projectId) });
      void client.invalidateQueries({ queryKey: qk.score("all") });
      toast.success("Analysis completed");
    },
    onError: (e) => toast.error(`Analysis failed: ${errorMessage(e)}`),
  });

  const generateReport = useMutation({
    mutationFn: endpoints.generateReport,
    onSuccess: (_r, runId) => {
      void client.invalidateQueries({ queryKey: ["reports"] });
      void client.invalidateQueries({ queryKey: ["project"] });
      void client.invalidateQueries({ queryKey: ["audit"] });
      void client.invalidateQueries({ queryKey: ["projects"] });
      void runId;
      toast.success("Report generated");
    },
    onError: (e) => toast.error(`Report failed: ${errorMessage(e)}`),
  });

  const deleteProject = useMutation({
    mutationFn: endpoints.deleteProject,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: (e) => toast.error(`Delete failed: ${errorMessage(e)}`),
  });

  return { createProject, updateProject, uploadDataset, deleteDataset, updateConfig, runAnalysis, generateReport, deleteProject };
}
