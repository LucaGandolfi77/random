#!/usr/bin/env python3
"""Simple launcher GUI to choose between `local-llm.py` and `local-llm-02.py`.

It sets optional environment overrides for model/cli paths and launches the
selected script in a detached subprocess (so the launcher can stay open).
"""

import os
import sys
import subprocess
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPT1 = os.path.join(BASE_DIR, "local-llm.py")
SCRIPT2 = os.path.join(BASE_DIR, "local-llm-02.py")
WRAPPER2 = os.path.join(BASE_DIR, "run-local-llm-02.sh")


def start_process(cmd, env=None):
    env = env or os.environ.copy()
    # start detached so launcher doesn't block
    try:
        p = subprocess.Popen(cmd, env=env, start_new_session=True)
        return p.pid
    except Exception as e:
        raise


class LauncherApp:
    def __init__(self, root):
        self.root = root
        root.title("Local LLM Launcher")
        root.geometry("560x220")

        frm = ttk.Frame(root, padding=12)
        frm.pack(fill="both", expand=True)

        ttk.Label(frm, text="Choose an app to launch:").grid(row=0, column=0, sticky="w")

        self.btn1 = ttk.Button(frm, text="Launch local-llm (bindings)", command=self.launch_local1)
        self.btn1.grid(row=1, column=0, sticky="ew", pady=(6, 6))

        self.btn2 = ttk.Button(frm, text="Launch local-llm-02 (llama-cli GUI)", command=self.launch_local2)
        self.btn2.grid(row=1, column=1, sticky="ew", padx=(8, 0), pady=(6, 6))

        # Model & CLI fields
        ttk.Label(frm, text="Optional model path:").grid(row=2, column=0, sticky="w", pady=(6, 0))
        self.model_var = tk.StringVar()
        ttk.Entry(frm, textvariable=self.model_var, width=48).grid(row=3, column=0, columnspan=2, sticky="ew")
        ttk.Button(frm, text="Browse…", command=self.browse_model).grid(row=3, column=2, padx=(8,0))

        ttk.Label(frm, text="Optional llama-cli path (for v02):").grid(row=4, column=0, sticky="w", pady=(8, 0))
        self.cli_var = tk.StringVar()
        ttk.Entry(frm, textvariable=self.cli_var, width=48).grid(row=5, column=0, columnspan=2, sticky="ew")
        ttk.Button(frm, text="Browse…", command=self.browse_cli).grid(row=5, column=2, padx=(8,0))

        self.status = tk.StringVar(value="Ready")
        ttk.Label(frm, textvariable=self.status).grid(row=6, column=0, columnspan=3, sticky="w", pady=(12,0))

        for c in range(3):
            frm.columnconfigure(c, weight=1)

    def browse_model(self):
        p = filedialog.askopenfilename(title="Select model (GGUF)", filetypes=[("GGUF","*.gguf"), ("All","*")])
        if p:
            self.model_var.set(p)

    def browse_cli(self):
        p = filedialog.askopenfilename(title="Select llama-cli binary")
        if p:
            self.cli_var.set(p)

    def launch_local1(self):
        if not os.path.isfile(SCRIPT1):
            messagebox.showerror("Missing", f"Script not found: {SCRIPT1}")
            return
        env = os.environ.copy()
        mp = self.model_var.get().strip()
        if mp:
            env["LOCAL_LLM_MODEL_PATH"] = mp
        # If model looks like a directory and user wants mlx you can set type later
        try:
            pid = start_process([sys.executable, SCRIPT1], env=env)
            self.status.set(f"Launched local-llm (PID {pid})")
        except Exception as e:
            messagebox.showerror("Launch failed", str(e))

    def launch_local2(self):
        if not os.path.isfile(SCRIPT2) and not os.path.isfile(WRAPPER2):
            messagebox.showerror("Missing", f"Neither {SCRIPT2} nor {WRAPPER2} were found.")
            return
        env = os.environ.copy()
        mp = self.model_var.get().strip()
        cli = self.cli_var.get().strip()
        if mp:
            env["LOCAL_LLM02_MODEL_PATH"] = mp
        if cli:
            env["LOCAL_LLM02_CLI_PATH"] = cli

        try:
            # prefer wrapper if executable
            if os.path.isfile(WRAPPER2) and os.access(WRAPPER2, os.X_OK):
                args = [WRAPPER2]
                if mp:
                    args.append(mp)
                    if cli:
                        args.append(cli)
                pid = start_process(args, env=env)
            else:
                pid = start_process([sys.executable, SCRIPT2], env=env)
            self.status.set(f"Launched local-llm-02 (PID {pid})")
        except Exception as e:
            messagebox.showerror("Launch failed", str(e))


def main():
    root = tk.Tk()
    ttk.Style().theme_use('clam')
    LauncherApp(root)
    root.mainloop()


if __name__ == '__main__':
    main()
