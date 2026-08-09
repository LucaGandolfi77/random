from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import os
import subprocess
import textwrap
import time

from .store import AgentConfig, ConfigStore


PROVIDER_ENV_KEYS = {
    "openrouter": "OPENROUTER_API_KEY",
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
}


class HermesRunner:
    def __init__(self, root: Path, hermes_binary: str = "hermes") -> None:
        self.root = root
        self.hermes_binary = hermes_binary

    def run(self, agent: AgentConfig, task: str, memory_excerpt: str, skill_catalog: dict[str, Any], timeout: int = 240) -> dict[str, Any]:
        prompt = self._build_prompt(agent, task, memory_excerpt, skill_catalog)
        command = [self.hermes_binary, "-z", prompt, "--provider", agent.provider, "-m", agent.model]
        env = os.environ.copy()

        env_var = agent.api_key_env or PROVIDER_ENV_KEYS.get(agent.provider.lower())
        if env_var and agent.api_key:
            env[env_var] = agent.api_key

        started = time.time()
        completed = subprocess.run(
            command,
            cwd=self.root,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )
        duration = round(time.time() - started, 2)

        if completed.returncode != 0:
            stderr = (completed.stderr or completed.stdout or "").strip()
            raise RuntimeError(stderr or f"Hermes failed for {agent.slug}")

        return {
            "command": command,
            "output": completed.stdout.strip(),
            "duration_seconds": duration,
        }

    def _build_prompt(self, agent: AgentConfig, task: str, memory_excerpt: str, skill_catalog: dict[str, Any]) -> str:
        prompt_path = self.root / agent.prompt_file
        prompt_text = prompt_path.read_text(encoding="utf-8") if prompt_path.exists() else ""
        skills_block = []
        known_skills = skill_catalog.get("skills", {})
        for skill in agent.enabled_skills:
            description = known_skills.get(skill, {}).get("description", "No description")
            skills_block.append(f"- {skill}: {description}")

        return textwrap.dedent(
            f"""
            Agent profile: {agent.display_name}
            Role: {agent.role}
            Specialty: {agent.specialty}
            Description: {agent.description}

            Workspace prompt:
            {prompt_text.strip()}

            Enabled skills:
            {os.linesep.join(skills_block) if skills_block else '- none'}

            Enabled tools:
            {', '.join(agent.enabled_tools) if agent.enabled_tools else 'none'}

            Shared memory excerpt:
            {memory_excerpt}

            Task:
            {task}

            Return a concise structured answer with:
            1. Analysis
            2. Proposed action
            3. Risks or blockers
            """
        ).strip()


class WorkspaceOrchestrator:
    def __init__(self, root: Path | None = None) -> None:
        self.store = ConfigStore(root)
        system = self.store.system()
        self.root = self.store.root
        self.hermes_binary = str(system.get("hermes_binary", "hermes"))
        self.max_parallel_agents = int(system.get("max_parallel_agents", 3))

    def dispatch(
        self,
        task: str,
        *,
        live: bool = False,
        target_agents: list[str] | None = None,
        timeout: int = 240,
    ) -> dict[str, Any]:
        agents = [self.store.load_agent(slug) for slug in target_agents] if target_agents else self.store.list_agents()
        memory = self.store.shared_memory()
        skill_catalog = self.store.skill_catalog()
        memory.append(
            "orchestrator",
            task,
            category="task",
            tags=["dispatch", "live" if live else "preview"],
            metadata={"agents": [agent.slug for agent in agents]},
        )
        memory_excerpt = memory.excerpt(limit=6)
        started_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

        results: list[dict[str, Any]] = []
        with ThreadPoolExecutor(max_workers=min(self.max_parallel_agents, max(1, len(agents)))) as executor:
            future_map = {
                executor.submit(self._run_agent, agent, task, memory_excerpt, skill_catalog, live, timeout): agent
                for agent in agents
            }
            for future in as_completed(future_map):
                agent = future_map[future]
                try:
                    result = future.result()
                    memory.append(
                        agent.slug,
                        result["output"],
                        category="agent_output",
                        tags=[agent.slug, "live" if live else "preview"],
                        metadata={"status": result["status"], "mode": result["mode"]},
                    )
                    results.append(result)
                except Exception as exc:
                    error_result = {
                        "agent": agent.slug,
                        "display_name": agent.display_name,
                        "status": "failed",
                        "mode": "live" if live else "preview",
                        "output": "",
                        "error": str(exc),
                        "duration_seconds": 0.0,
                    }
                    memory.append(
                        agent.slug,
                        str(exc),
                        category="agent_error",
                        tags=[agent.slug, "error"],
                        metadata={"status": "failed"},
                    )
                    results.append(error_result)

        order = {agent.slug: index for index, agent in enumerate(agents)}
        results.sort(key=lambda item: order.get(item["agent"], 999))
        return {
            "task": task,
            "mode": "live" if live else "preview",
            "started_at": started_at,
            "agent_count": len(agents),
            "shared_memory_path": str(self.store.shared_memory_path()),
            "results": results,
        }

    def _run_agent(
        self,
        agent: AgentConfig,
        task: str,
        memory_excerpt: str,
        skill_catalog: dict[str, Any],
        live: bool,
        timeout: int,
    ) -> dict[str, Any]:
        started = time.time()
        if live:
            if not agent.allow_live_runs:
                raise RuntimeError(f"Agent {agent.slug} does not allow live runs")
            runner = HermesRunner(self.root, hermes_binary=self.hermes_binary)
            live_result = runner.run(agent, task, memory_excerpt, skill_catalog, timeout=timeout)
            return {
                "agent": agent.slug,
                "display_name": agent.display_name,
                "status": "completed",
                "mode": "live",
                "output": live_result["output"],
                "error": None,
                "duration_seconds": live_result["duration_seconds"],
                "command": live_result["command"],
            }

        output = self._preview_response(agent, task, memory_excerpt)
        return {
            "agent": agent.slug,
            "display_name": agent.display_name,
            "status": "completed",
            "mode": "preview",
            "output": output,
            "error": None,
            "duration_seconds": round(time.time() - started, 2),
            "command": None,
        }

    def _preview_response(self, agent: AgentConfig, task: str, memory_excerpt: str) -> str:
        task_line = task.strip().rstrip(".")
        preview_plans = {
            "ricercatore": [
                "mappo fonti e segnali utili collegati al task",
                "estraggo dati o pattern da confrontare",
                "segnalo assunzioni, limiti e verifiche ancora aperte",
            ],
            "sviluppatore": [
                "trasformo il task in interventi tecnici verificabili",
                "isolo bug o gap implementativi",
                "propongo patch minime e test rapidi",
            ],
            "revisore": [
                "controllo coerenza, chiarezza e presentazione del risultato",
                "evidenzio rischi, regressioni o buchi di qualita",
                "chiudo con decisione ship o no-ship",
            ],
            "storico": [
                "ricostruisco il contesto e la cronologia rilevante",
                "distinguo fatti documentati, precedenti e interpretazioni",
                "segnalo fonti da verificare o lacune storiche",
            ],
            "economista": [
                "esplicito incentivi, costi e trade-off economici",
                "modello scenari alternativi e effetti di breve o medio periodo",
                "segnalo limiti del modello e variabili mancanti",
            ],
            "giurista": [
                "individuo obblighi, vincoli e aree di compliance rilevanti",
                "preparo un memo di rischio con cautele operative",
                "segnalo dove serve validazione professionale esterna",
            ],
            "statistico": [
                "verifico campioni, metriche e assunzioni dell'analisi",
                "controllo robustezza, inferenza e possibilita di bias",
                "propongo verifiche quantitative o disegni sperimentali migliori",
            ],
            "architetto": [
                "mappo componenti, interfacce e confini del sistema",
                "valuto trade-off tra semplicita, scalabilita e manutenibilita",
                "propongo decisioni architetturali e rischi tecnici di lungo periodo",
            ],
            "docente": [
                "scompongo il tema in una sequenza didattica chiara",
                "trasformo contenuti tecnici in spiegazioni progressive ed esempi",
                "evidenzio pre-requisiti e punti che richiedono chiarimenti ulteriori",
            ],
        }
        plan = preview_plans.get(
            agent.slug,
            [
                "analizzo il task nel mio dominio specialistico",
                "preparo output strutturati e riusabili",
                "segnalo rischi, ipotesi e prossime azioni utili",
            ],
        )

        bullet_block = "\n".join(f"- {item}" for item in plan)
        return textwrap.dedent(
            f"""
            {agent.display_name}

            Task ricevuto: {task_line}.
            Ruolo: {agent.role}
            Skill attive: {', '.join(agent.enabled_skills)}
            Tool configurati: {', '.join(agent.enabled_tools)}

            Piano immediato:
            {bullet_block}

            Memoria condivisa disponibile:
            {memory_excerpt}
            """
        ).strip()