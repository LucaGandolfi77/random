# TODO - ECSS ML Assurance Workbench

**Ultimo aggiornamento**: 2026-09-22 (Task Queue + Documentation)
**Versione attuale**: v1.0.0-rc.1
**Stato**: Release Candidate

---

## 1. Feature Critiche Non Implementate

### 1.1 ODD Editor (Roadmap Week 2)
- [ ] Editor grafico per Operational Design Domain
- [ ] Definizione vincoli ODD (meteo, geografia, lighting, etc.)
- [ ] Validazione automatica ODD vs scenario
- [ ] Visualizzazione copertura ODD nello scenario space

### 1.2 Model Registry (Roadmap Week 3)
- [ ] Registrazione modelli ML con metadata
- [ ] Versionamento modelli
- [ ] Metriche performance (accuracy, latency, memory)
- [ ] Model verification pipeline
- [ ] Confronto versioni modello

### 1.3 Safety Cage & Runtime Monitoring (Roadmap Week 6)
- [ ] Runtime safety constraints enforcement
- [ ] Real-time performance monitoring
- [ ] Anomaly detection durante inference
- [ ] Emergency shutdown triggers
- [ ] Safety metrics dashboard

### 1.4 Authentication & Authorization
- [x] JWT-based authentication
- [x] Role-based access control (RBAC)
- [ ] API key management
- [ ] Session management
- [ ] Audit logging per accessi

---

## 2. Funzionalità Tecniche

### 2.1 Background Task Queue
- [x] Celery/Redis integration per analysis async — implementato con `app/tasks/analysis.py`, `app/celery_app.py`, `app/main.py`
- [x] Task status tracking — `GET /analysis/{run_id}/status` endpoint implementato
- [x] Progress reporting — task aggiorna stato RUNNING/COMPLETED/FAILED nel DB
- [x] Retry logic per failed tasks — `max_retries=3, default_retry_delay=60` implementato
- [x] Priority queue per batch operations — configurato Celery con Redis broker
- [x] Test task queue (`tests/test_task_queue.py`) — 4 test implementati

### 2.2 Data Export
- [ ] CSV export dei findings con filtri
- [ ] PDF export per evidence packages
- [ ] Excel export per reports
- [ ] Bulk export operations

### 2.3 PWA & Offline Mode
- [x] Service Worker per offline access (vite-plugin-pwa + workbox)
- [x] IndexedDB per cache dati (offline-client.ts)
- [x] Sync automatica quando online (queueMutation + clearQueuedMutations)
- [x] Offline-first architecture (NetworkFirst + CacheFirst strategies)
- [x] Offline indicator UI component
- [x] Web app manifest + icons

### 2.4 Validate Project Enhancement
- [ ] Implementare --import mode in validate_project.py
- [ ] Batch validation support
- [ ] Custom validation rules

### 2.5 Performance Optimization
- [ ] Database query optimization
- [ ] API response caching
- [ ] Lazy loading per frontend
- [ ] Compressione response

---

## 3. Testing & Quality

### 3.1 Frontend Tests Mancanti
- [x] AssuranceAnalysisPage.tsx - test interazione utente
- [x] AssuranceRegistryPage.tsx - test listing e filtri
- [x] AssuranceProjectPage.tsx - test dettaglio progetto
- [x] DatasetPage.tsx - test upload e preview
- [x] FindingsPage.tsx - test findings listing
- [x] ReportsPage.tsx - test generazione report
- [x] SettingsPage.tsx - test configurazione
- [x] ProjectInfoPage.tsx - test info progetto
- [x] GuidedDemo.tsx - test wizard
- [x] WorkspaceNav.tsx - test navigazione
- [x] ScorePanel.tsx - test visualizzazione score

### 3.2 Backend Tests Mancanti
- [x] API routes per continuous assurance
- [x] Report file writing tests
- [x] Integration tests per evidence packages
- [x] Stress test per large datasets

### 3.3 Security Scanning
- [x] npm audit integration in CI
- [x] Python bandit security scan
- [x] Snyk vulnerability scanning
- [x] Dependency vulnerability alerts (dependabot.yml)

### 3.4 Accessibility Testing
- [x] axe-core automated testing (accessibility.test.tsx)
- [ ] Lighthouse CI integration
- [ ] Keyboard navigation tests
- [ ] Screen reader compatibility

### 3.5 Performance Testing
- [ ] Load testing con k6/artillery
- [ ] Memory profiling
- [ ] API response time benchmarks
- [ ] Database query performance tests

---

## 4. ECSS Compliance

> **Nota**: Il progetto è dichiaratamente un tool di supporto ingegneristico, non uno strumento di certificazione ECSS.

### 4.1 Process Conformance
- [ ] Formal ECSS process evidence generation
- [ ] ECSS clause traceability matrix
- [ ] Independent Verification & Validation (IV&V)
- [ ] Formal change management board

### 4.2 Documentation
- [ ] ECSS-Q-ST-70C compliant documentation
- [ ] ECSS document templates
- [ ] Formal safety assessment reports
- [ ] Configuration item management (ECSS-M-ST-40C)

### 4.3 Certification Support
- [ ] ECSS compliance checklist generator
- [ ] Audit trail ECSS format export
- [ ] Certification evidence package
- [ ] ECSS assessment report generator

---

## 5. Sicurezza

### 5.1 Security Headers
- [x] Content Security Policy (CSP) headers
- [x] X-Frame-Options
- [x] X-Content-Type-Options
- [x] Referrer-Policy
- [x] Permissions-Policy

### 5.2 Input Validation
- [ ] SQL injection prevention (addito a SQLAlchemy)
- [ ] XSS prevention headers
- [ ] CSRF protection
- [ ] Rate limiting

### 5.3 Data Protection
- [ ] Encryption at rest
- [ ] Encryption in transit (HTTPS enforcement)
- [ ] PII data handling
- [ ] Data retention policies

---

## 6. Infrastruttura & DevOps

### 6.1 Version Consistency
- [ ] Aggiornare pyproject.toml da 0.1.0 a 1.0.0-rc.1
- [ ] Aggiornare image tags in docker-compose.yml
- [ ] Sincronizzazione versioni tra componenti

### 6.2 CI/CD Improvements
- [ ] Automated release pipeline
- [ ] Staging environment
- [ ] Blue-green deployment
- [ ] Rollback automation

### 6.3 Monitoring & Observability
- [ ] Application performance monitoring (APM)
- [ ] Error tracking (Sentry/similar)
- [ ] Log aggregation
- [ ] Alerting system

### 6.4 Container Improvements
- [ ] Multi-stage Docker builds optimization
- [ ] Container health checks
- [ ] Resource limits
- [ ] Docker Scout integration

---

## 7. Documentation

### 7.1 API Documentation
- [ ] OpenAPI/Swagger UI improvements
- [ ] API changelog
- [ ] Migration guides
- [ ] Postman collection

### 7.2 User Guides
- [ ] Getting started tutorial
- [ ] Advanced usage guide
- [ ] Troubleshooting guide
- [ ] FAQ

### 7.3 Developer Documentation
- [ ] Architecture decision records (continuazione)
- [ ] Code contribution guidelines
- [ ] Development environment setup
- [ ] Testing strategy documentation

---

## 8. Portfolio Site

### 8.1 Evidence Packages
- [ ] Expanded evidence packages con più artefatti
- [ ] HIL (Hardware-in-Loop) demos
- [ ] Interactive demos
- [ ] Video walkthroughs

### 8.2 Content
- [ ] Screenshot/GIF automation per top 10 projects
- [ ] Demo videos per 5 complex projects
- [ ] Blog posts (2 minimum)
- [ ] Technical portfolio PDF

### 8.3 SEO & Marketing
- [ ] Meta tags optimization
- [ ] Open Graph tags
- [ ] Structured data (JSON-LD)
- [ ] Sitemap generation

---

## 9. Quick Wins (Facili da implementare)

- [x] Fix version inconsistency in pyproject.toml
- [x] Add CSP headers in nginx.conf
- [x] Enable npm audit in CI
- [x] Add axe-core accessibility tests
- [x] Create Postman collection for API
- [x] Add API changelog

---

## 10. Icebox (Future Considerations)

- [ ] Multi-tenant support
- [ ] Plugin system per custom analyzers
- [ ] Webhook notifications
- [ ] GraphQL API
- [ ] Mobile app (React Native)
- [ ] Kubernetes deployment
- [ ] Terraform IaC
- [ ] MLflow integration
- [ ] Kubeflow pipeline support

---

**Note**:
- Items con [ ] sono da implementare
- Priorità: Alta (Sicurezza, Testing, Feature Critiche), Media (Infrastruttura, Export), Bassa (Documentation, Portfolio)
- Per ogni item, creare un issue dedicata con acceptance criteria
- Aggiornare questo file man mano che gli items vengono completati
