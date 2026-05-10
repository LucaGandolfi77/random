"""
Gemma4 GUI — llama-cli wrapper
Compatibile con macOS, Windows e Linux.
"""

import tkinter as tk
from tkinter import ttk, filedialog, scrolledtext, messagebox
import subprocess
import threading
import shutil
import os
import sys
import tempfile
import platform

IS_WIN = sys.platform == "win32"
IS_MAC = sys.platform == "darwin"

DEFAULT_MODEL_PATH = os.environ.get("LOCAL_LLM02_MODEL_PATH", os.path.expanduser("~/models/gemma4.gguf"))
DEFAULT_CTX       = 8192
DEFAULT_GPU_LAYERS = 99
DEFAULT_TEMP      = 0.7
DEFAULT_MAX_TOKENS = 2048
DEFAULT_SYSTEM    = "You are a helpful assistant."

MONO_FONT = ("Menlo", 12) if IS_MAC else (("Consolas", 12) if IS_WIN else ("DejaVu Sans Mono", 11))
BODY_FONT = ("Helvetica", 12) if not IS_WIN else ("Segoe UI", 11)


# ── Ricerca llama-cli ────────────────────────────────────────────────────────

def _search_paths():
    """Restituisce una lista di path dove cercare llama-cli."""
    paths = []
    if IS_WIN:
        # Cartelle tipiche su Windows
        for base in [
            os.path.expandvars(r"%LOCALAPPDATA%\llama.cpp"),
            os.path.expandvars(r"%PROGRAMFILES%\llama.cpp"),
            os.path.expandvars(r"%PROGRAMFILES(X86)%\llama.cpp"),
            os.path.expanduser(r"~\llama.cpp"),
            os.path.expanduser(r"~\llama.cpp\build\bin\Release"),
            os.path.expanduser(r"~\llama.cpp\build\bin\Debug"),
            os.path.expanduser(r"~\llama.cpp\build\Release"),
            r"C:\llama.cpp",
            r"C:\llama.cpp\build\bin\Release",
        ]:
            for name in ["llama-cli.exe", "main.exe"]:
                paths.append(os.path.join(base, name))
    else:
        for base in [
            "/opt/homebrew/bin",
            "/usr/local/bin",
            "/usr/bin",
            os.path.expanduser("~/llama.cpp"),
            os.path.expanduser("~/llama.cpp/build/bin"),
        ]:
            for name in ["llama-cli", "main"]:
                paths.append(os.path.join(base, name))
    return paths


def find_llama_cli() -> str:
    """Cerca llama-cli nel PATH e in cartelle tipiche."""
    for name in (["llama-cli.exe", "main.exe"] if IS_WIN else ["llama-cli", "main"]):
        found = shutil.which(name)
        if found:
            return found
    for p in _search_paths():
        if os.path.isfile(p):
            return p
    return "llama-cli.exe" if IS_WIN else "llama-cli"


# ── Subprocess helper ─────────────────────────────────────────────────────────

def _make_popen_kwargs():
    """Kwargs extra per nascondere la console su Windows."""
    kwargs = {}
    if IS_WIN:
        kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
    return kwargs


def _normalize_path(p: str) -> str:
    """Normalizza il path per il sistema operativo corrente."""
    return str(os.path.normpath(p))


# ── GUI ───────────────────────────────────────────────────────────────────────

class GemmaGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Gemma4 — llama-cli GUI")
        self.root.geometry("980x860")
        self.root.configure(bg="#1e1e2e")
        self.process: subprocess.Popen | None = None
        self._tmp_prompt_file: str | None = None
        self._build_ui()

    # ── UI ────────────────────────────────────────────────────────────────────

    def _build_ui(self):
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TLabel",      background="#1e1e2e", foreground="#cdd6f4", font=BODY_FONT)
        style.configure("TButton",     font=(*BODY_FONT[:1], BODY_FONT[1], "bold"), padding=6)
        style.configure("TEntry",      fieldbackground="#313244", foreground="#cdd6f4", font=BODY_FONT)
        style.configure("TFrame",      background="#1e1e2e")
        style.configure("TLabelframe", background="#1e1e2e", foreground="#89dceb", font=(*BODY_FONT[:1], BODY_FONT[1], "bold"))
        style.configure("TLabelframe.Label", background="#1e1e2e", foreground="#89dceb")
        style.configure("TSpinbox",    fieldbackground="#313244", foreground="#cdd6f4", font=BODY_FONT)

        # ── Impostazioni ──────────────────────────────────────────
        sf = ttk.LabelFrame(self.root, text="  Impostazioni  ", padding=(12, 8))
        sf.pack(fill="x", padx=14, pady=(14, 4))

        ttk.Label(sf, text="Modello GGUF:").grid(row=0, column=0, sticky="w", padx=(0, 6))
        self.model_var = tk.StringVar(value=DEFAULT_MODEL_PATH)
        ttk.Entry(sf, textvariable=self.model_var, width=54).grid(row=0, column=1, padx=(0, 6))
        ttk.Button(sf, text="Sfoglia…", command=self._browse_model).grid(row=0, column=2)

        ttk.Label(sf, text="llama-cli:").grid(row=1, column=0, sticky="w", padx=(0, 6), pady=(6, 0))
        cli_default = os.environ.get("LOCAL_LLM02_CLI_PATH") or find_llama_cli()
        self.cli_var = tk.StringVar(value=cli_default)
        ttk.Entry(sf, textvariable=self.cli_var, width=54).grid(row=1, column=1, pady=(6, 0))
        ttk.Button(sf, text="Sfoglia…", command=self._browse_cli).grid(row=1, column=2, pady=(6, 0))

        pf = ttk.Frame(sf)
        pf.grid(row=2, column=0, columnspan=3, sticky="w", pady=(8, 0))

        ttk.Label(pf, text="Context:").pack(side="left")
        self.ctx_var = tk.IntVar(value=DEFAULT_CTX)
        ttk.Spinbox(pf, from_=512, to=131072, increment=512, textvariable=self.ctx_var, width=8).pack(side="left", padx=(4, 18))

        ttk.Label(pf, text="GPU Layers:").pack(side="left")
        self.gpu_var = tk.IntVar(value=DEFAULT_GPU_LAYERS)
        ttk.Spinbox(pf, from_=0, to=200, increment=1, textvariable=self.gpu_var, width=6).pack(side="left", padx=(4, 18))

        ttk.Label(pf, text="Temp:").pack(side="left")
        self.temp_var = tk.DoubleVar(value=DEFAULT_TEMP)
        ttk.Spinbox(pf, from_=0.0, to=2.0, increment=0.05, textvariable=self.temp_var, width=6, format="%.2f").pack(side="left", padx=(4, 18))

        ttk.Label(pf, text="Max tokens:").pack(side="left")
        self.maxtok_var = tk.IntVar(value=DEFAULT_MAX_TOKENS)
        ttk.Spinbox(pf, from_=64, to=16384, increment=128, textvariable=self.maxtok_var, width=8).pack(side="left", padx=(4, 18))

        # checkboxes flag opzionali
        self.no_prompt_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(pf, text="--no-display-prompt", variable=self.no_prompt_var).pack(side="left", padx=(4, 10))
        self.log_dis_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(pf, text="--log-disable", variable=self.log_dis_var).pack(side="left")

        # ── System prompt ─────────────────────────────────────────
        syf = ttk.LabelFrame(self.root, text="  System Prompt  ", padding=(10, 6))
        syf.pack(fill="x", padx=14, pady=4)
        self.system_text = tk.Text(
            syf, height=3, wrap="word", font=BODY_FONT,
            bg="#313244", fg="#cdd6f4", insertbackground="#cdd6f4",
            relief="flat", padx=8, pady=6,
        )
        self.system_text.insert("1.0", DEFAULT_SYSTEM)
        self.system_text.pack(fill="x")

        # ── Input utente ──────────────────────────────────────────
        inf = ttk.LabelFrame(self.root, text="  Il tuo messaggio  (Ctrl+Enter per inviare)  ", padding=(10, 6))
        inf.pack(fill="both", padx=14, pady=4, expand=False)
        self.input_text = tk.Text(
            inf, height=7, wrap="word", font=("Helvetica", 13),
            bg="#313244", fg="#cdd6f4", insertbackground="#cdd6f4",
            relief="flat", padx=10, pady=8,
        )
        self.input_text.pack(fill="both", expand=True)
        self.input_text.bind("<Control-Return>", lambda e: self._run())

        # ── Bottoni ───────────────────────────────────────────────
        bf = ttk.Frame(self.root)
        bf.pack(fill="x", padx=14, pady=4)

        self.run_btn = tk.Button(
            bf, text="▶  Invia", command=self._run,
            bg="#a6e3a1", fg="#1e1e2e", activebackground="#94d083",
            font=(*BODY_FONT[:1], BODY_FONT[1] + 1, "bold"), relief="flat", padx=16, pady=6,
        )
        self.run_btn.pack(side="left", padx=(0, 10))

        self.stop_btn = tk.Button(
            bf, text="⏹  Stop", command=self._stop,
            bg="#f38ba8", fg="#1e1e2e", activebackground="#e06080",
            font=BODY_FONT, relief="flat", padx=14, pady=6, state="disabled",
        )
        self.stop_btn.pack(side="left", padx=(0, 10))

        tk.Button(
            bf, text="🗑  Pulisci", command=self._clear_output,
            bg="#585b70", fg="#cdd6f4", activebackground="#45475a",
            font=BODY_FONT, relief="flat", padx=12, pady=6,
        ).pack(side="left", padx=(0, 10))

        tk.Button(
            bf, text="ℹ  Verifica llama-cli", command=self._check_cli,
            bg="#45475a", fg="#cdd6f4", activebackground="#313244",
            font=BODY_FONT, relief="flat", padx=12, pady=6,
        ).pack(side="left")

        self.status_var = tk.StringVar(value="Pronto.")
        tk.Label(bf, textvariable=self.status_var, bg="#1e1e2e", fg="#a6adc8", font=BODY_FONT).pack(side="right")

        # ── Output ────────────────────────────────────────────────
        outf = ttk.LabelFrame(self.root, text="  Risposta del modello  ", padding=(10, 6))
        outf.pack(fill="both", expand=True, padx=14, pady=(4, 14))
        self.output_text = scrolledtext.ScrolledText(
            outf, wrap="word", state="disabled",
            font=MONO_FONT, bg="#181825", fg="#cdd6f4",
            insertbackground="#cdd6f4", relief="flat", padx=10, pady=8,
        )
        self.output_text.pack(fill="both", expand=True)
        # tag per errori stderr in rosso
        self.output_text.tag_configure("err", foreground="#f38ba8")

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _browse_model(self):
        p = filedialog.askopenfilename(title="Seleziona modello GGUF",
                                       filetypes=[("GGUF", "*.gguf"), ("Tutti", "*.*")])
        if p:
            self.model_var.set(p)

    def _browse_cli(self):
        ft = [("EXE", "*.exe"), ("Tutti", "*.*")] if IS_WIN else [("Tutti", "*.*")]
        p = filedialog.askopenfilename(title="Seleziona llama-cli", filetypes=ft)
        if p:
            self.cli_var.set(p)

    def _clear_output(self):
        self.output_text.configure(state="normal")
        self.output_text.delete("1.0", "end")
        self.output_text.configure(state="disabled")

    def _append_output(self, text: str, tag: str = ""):
        self.output_text.configure(state="normal")
        if tag:
            self.output_text.insert("end", text, tag)
        else:
            self.output_text.insert("end", text)
        self.output_text.see("end")
        self.output_text.configure(state="disabled")

    def _set_status(self, msg: str):
        self.status_var.set(msg)

    def _stop(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            self._set_status("Interrotto.")
        self.run_btn.configure(state="normal")
        self.stop_btn.configure(state="disabled")

    def _check_cli(self):
        cli = _normalize_path(self.cli_var.get().strip())
        if os.path.isfile(cli):
            messagebox.showinfo("OK", f"Trovato:\n{cli}")
        else:
            found = shutil.which(os.path.basename(cli))
            if found:
                messagebox.showinfo("Trovato nel PATH", found)
                self.cli_var.set(found)
            else:
                messagebox.showerror("Non trovato",
                    f"llama-cli non trovato.\n\nPercorso impostato:\n{cli}\n\n"
                    "Installa llama.cpp e imposta il path corretto con 'Sfoglia…'.")

    # ── Esecuzione ────────────────────────────────────────────────────────────

    def _run(self):
        user_input = self.input_text.get("1.0", "end").strip()
        if not user_input:
            self._set_status("⚠ Inserisci un messaggio.")
            return

        model_path = _normalize_path(self.model_var.get().strip())
        if not os.path.isfile(model_path):
            self._set_status(f"⚠ Modello non trovato: {model_path}")
            messagebox.showerror("Modello non trovato",
                f"Il file GGUF non esiste:\n{model_path}\n\n"
                "Usa 'Sfoglia…' per selezionare il modello corretto.")
            return

        cli = _normalize_path(self.cli_var.get().strip())
        system = self.system_text.get("1.0", "end").strip()

        # ── Scrivi il prompt in un file temporaneo ──────────────
        # Su Windows passare <> via --prompt è rischioso;
        # usare --file evita qualsiasi problema di escaping.
        full_prompt = (
            f"<start_of_turn>system\n{system}<end_of_turn>\n"
            f"<start_of_turn>user\n{user_input}<end_of_turn>\n"
            "<start_of_turn>model\n"
        )
        try:
            tmp = tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", suffix=".txt",
                delete=False, prefix="gemma_prompt_",
            )
            tmp.write(full_prompt)
            tmp.flush()
            tmp.close()
            self._tmp_prompt_file = tmp.name
        except Exception as ex:
            self._set_status(f"⚠ Errore file temporaneo: {ex}")
            return

        cmd = [
            cli,
            "--model", model_path,
            "--ctx-size", str(self.ctx_var.get()),
            "--n-gpu-layers", str(self.gpu_var.get()),
            "--temp", f"{self.temp_var.get():.2f}",
            "--n-predict", str(self.maxtok_var.get()),
            "--file", self._tmp_prompt_file,   # ← prompt da file, non da argomento
        ]
        if self.no_prompt_var.get():
            cmd.append("--no-display-prompt")
        if self.log_dis_var.get():
            cmd.append("--log-disable")

        self.run_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")
        self._set_status("⏳ Elaborazione…")
        self._append_output(f"\n{'─'*60}\n🧑 {user_input}\n\n🤖 Gemma4:\n")

        def worker():
            stderr_lines = []
            try:
                kwargs = _make_popen_kwargs()
                self.process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    encoding="utf-8",
                    errors="replace",
                    bufsize=1,
                    **kwargs,
                )

                # Leggi stdout riga per riga (streaming)
                for line in self.process.stdout:
                    clean = line.replace("<end_of_turn>", "")
                    self.root.after(0, self._append_output, clean)

                # Raccogli stderr (solo dopo che stdout è chiuso)
                stderr_out = self.process.stderr.read()
                if stderr_out.strip():
                    stderr_lines = stderr_out.strip().splitlines()

                self.process.wait()
                rc = self.process.returncode

                if stderr_lines:
                    self.root.after(0, self._append_output,
                                    "\n\n⚠ stderr llama-cli:\n" + "\n".join(stderr_lines) + "\n",
                                    "err")

                status = "✅ Completato." if rc == 0 else f"⚠ Exit code {rc}"

            except FileNotFoundError:
                msg = (
                    f"\n⚠ Eseguibile non trovato: {cli}\n"
                    f"   Su Windows installa llama.cpp e imposta il path con 'Sfoglia…'.\n"
                    f"   Su macOS: brew install llama.cpp\n"
                )
                self.root.after(0, self._append_output, msg, "err")
                status = "⚠ llama-cli non trovato"

            except Exception as ex:
                self.root.after(0, self._append_output, f"\n⚠ Errore: {ex}\n", "err")
                status = f"⚠ {ex}"

            finally:
                # Rimuovi file temporaneo
                if self._tmp_prompt_file and os.path.exists(self._tmp_prompt_file):
                    try:
                        os.unlink(self._tmp_prompt_file)
                    except Exception:
                        pass
                    self._tmp_prompt_file = None

                self.root.after(0, self._set_status, status)
                self.root.after(0, lambda: self.run_btn.configure(state="normal"))
                self.root.after(0, lambda: self.stop_btn.configure(state="disabled"))

        threading.Thread(target=worker, daemon=True).start()


def main():
    root = tk.Tk()
    GemmaGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
