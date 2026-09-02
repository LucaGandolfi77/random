# careers-2026 — monorepo convention

Modules are autonomous but Workbench-integratable. Layout per convention:
apps/assurance-workbench (module registry + future app home), projects/<module>,
shared/, docs/, evidence-packages/, assurance-reports/, portfolio/.

The original assurance Workbench code remains in the sibling repository path
/career-2026/ecss-ml-assurance-workbench; apps/assurance-workbench currently
holds module registration manifests and integration notes (no git init here).
