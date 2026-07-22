import json
import logging
import os
import shutil
import subprocess
from typing import Optional

from dotenv import load_dotenv

logger = logging.getLogger(__name__)


class OpencodeClient:
    """Wrapper around the opencode CLI for subprocess calls.

    Reads config from .env (or env vars):
        OPENCODE_BIN      — path to opencode binary (default: "opencode")
        OPENCODE_MODEL    — model to use (default: "opencode/hy3-free")
        OPENCODE_AGENT    — agent to use (default: "general")
        OPENCODE_TIMEOUT  — timeout in seconds (default: 120)

    Usage:
        client = OpencodeClient()
        if client.is_available():
            resp = client.run("Describe 3 fashion trends for 2026")
    """

    def __init__(self, env_file: Optional[str] = None):
        load_dotenv(env_file)

        self.bin_path = os.getenv("OPENCODE_BIN", "opencode")
        self.model = os.getenv("OPENCODE_MODEL", "opencode/hy3-free")
        self.agent = os.getenv("OPENCODE_AGENT", "general")

        try:
            self.timeout = int(os.getenv("OPENCODE_TIMEOUT", "120"))
        except ValueError:
            self.timeout = 120

        self._available: Optional[bool] = None

    def is_available(self) -> bool:
        """Check whether the opencode CLI is installed and accessible."""
        if self._available is not None:
            return self._available
        self._available = shutil.which(self.bin_path) is not None
        if not self._available:
            logger.warning("opencode CLI not found at '%s'", self.bin_path)
        return self._available

    def run(
        self,
        prompt: str,
        *,
        model: Optional[str] = None,
        agent: Optional[str] = None,
    ) -> str:
        """Run opencode with a prompt and return the text response.

        Args:
            prompt: The prompt text to send.
            model:  Override the default model for this call.
            agent:  Override the default agent for this call.

        Returns:
            The generated text response.
        """
        if not self.is_available():
            raise RuntimeError(
                f"opencode CLI not found (checked: {self.bin_path}). "
                "Set OPENCODE_BIN in .env or install opencode."
            )

        cmd = [self.bin_path, "run", "--format", "default"]
        if model or self.model:
            cmd.extend(["-m", model or self.model])
        if agent or self.agent:
            cmd.extend(["--agent", agent or self.agent])
        cmd.append(prompt)

        logger.debug("Running: %s", " ".join(cmd))

        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=self.timeout
        )

        if result.returncode != 0:
            logger.error("opencode error (code %d): %s", result.returncode, result.stderr)
            return f"[Opencode error: {result.stderr.strip()}]"

        return result.stdout.strip()

    def run_structured(
        self,
        prompt: str,
        *,
        model: Optional[str] = None,
        agent: Optional[str] = None,
    ) -> dict:
        """Run opencode and try to parse the response as JSON.

        Falls back to ``{"text": response}`` if parsing fails.
        """
        text = self.run(prompt, model=model, agent=agent)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"text": text}
