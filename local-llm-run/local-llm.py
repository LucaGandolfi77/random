import tkinter as tk
from tkinter import filedialog, scrolledtext, messagebox
import threading
import os

# Import dei motori di inferenza
try:
    from llama_cpp import Llama
except ImportError:
    Llama = None

try:
    from mlx_lm import load, generate
except ImportError:
    load = None

class ChatApp:
    def __init__(self, root):
        self.root = root
        self.root.title("AI Multi-Engine Chat (MLX / Llama-CPP)")
        self.root.geometry("800x600")

        self.model = None
        self.tokenizer = None
        self.model_type = None # 'gguf' o 'mlx'

        self.setup_ui()

        # Auto-load model if environment variables are present
        model_type = os.environ.get("LOCAL_LLM_MODEL_TYPE")
        model_path = os.environ.get("LOCAL_LLM_MODEL_PATH")
        if model_type and model_path:
            # schedule after a short delay so the UI finishes initializing
            self.root.after(200, lambda: self._auto_load(model_type, model_path))

    def _auto_load(self, model_type, model_path):
        try:
            self.log(f"[*] Auto-loading model: {model_path} (type: {model_type})", tag="meta")
            if model_type.lower() == "gguf":
                self.load_gguf(model_path)
            elif model_type.lower() == "mlx":
                self.load_mlx(model_path)
            else:
                self.log(f"[!] Unknown model type: {model_type}", tag="error")
        except Exception as e:
            self.log(f"[!] Auto-load failed: {e}", tag="error")

    def setup_ui(self):
        # Frame Superiore: Selezione Modello
        top_frame = tk.Frame(self.root)
        top_frame.pack(pady=10, fill=tk.X)

        self.btn_load_gguf = tk.Button(top_frame, text="Carica GGUF (Llama-CPP)", command=self.load_gguf)
        self.btn_load_gguf.pack(side=tk.LEFT, padx=10)

        self.btn_load_mlx = tk.Button(top_frame, text="Carica Cartella MLX (Safetensors)", command=self.load_mlx)
        self.btn_load_mlx.pack(side=tk.LEFT, padx=10)

        self.lbl_status = tk.Label(top_frame, text="Nessun modello caricato", fg="red")
        self.lbl_status.pack(side=tk.RIGHT, padx=10)

        # Area Chat
        self.chat_history = scrolledtext.ScrolledText(self.root, state='disabled', wrap=tk.WORD)
        self.chat_history.pack(padx=10, pady=10, fill=tk.BOTH, expand=True)

        # Configure tags for colored formatting (user / AI / system / errors)
        self.chat_history.tag_configure("user", foreground="#1f77b4", font=("Helvetica", 11, "bold"))
        self.chat_history.tag_configure("ai", foreground="#2ca02c", font=("Helvetica", 11))
        self.chat_history.tag_configure("system", foreground="gray40", font=("Helvetica", 10, "italic"))
        self.chat_history.tag_configure("error", foreground="red", font=("Helvetica", 11, "bold"))
        self.chat_history.tag_configure("meta", foreground="purple", font=("Helvetica", 9, "italic"))
        # Frame Inferiore: Input
        bottom_frame = tk.Frame(self.root)
        bottom_frame.pack(fill=tk.X, pady=10)

        self.entry_msg = tk.Entry(bottom_frame)
        self.entry_msg.pack(side=tk.LEFT, padx=10, fill=tk.X, expand=True)
        self.entry_msg.bind("<Return>", lambda e: self.send_message())

        self.btn_send = tk.Button(bottom_frame, text="Invia", command=self.send_message)
        self.btn_send.pack(side=tk.RIGHT, padx=10)

    def log(self, message, tag=None):
        """Insert a line into the chat area using optional tags for coloring.

        - `tag` is a tag name (e.g. 'user' or 'ai').
        - For backward compatibility, common color names map to tags.
        - If no tag provided, a best-effort auto-detection is used.
        """
        msg = message.rstrip("\n")
        if msg == "":
            return

        # Backwards-compatibility: map simple color names to tags
        color_map = {"blue": "ai", "green": "system", "red": "error", "black": None}
        if tag in color_map:
            tag = color_map[tag]

        # Auto-detect tag when not explicitly provided
        if tag is None:
            if msg.startswith("TU:"):
                tag = "user"
            elif msg.startswith("AI:") or msg.startswith("AI"):
                tag = "ai"
            elif msg.startswith("[!]") or "Errore" in msg or "Error" in msg:
                tag = "error"
            elif msg.startswith("[*]") or msg.startswith("[+]") or msg.startswith("[>"):
                tag = "system"

        self.chat_history.configure(state='normal')
        try:
            if tag:
                self.chat_history.insert(tk.END, msg + "\n", tag)
            else:
                self.chat_history.insert(tk.END, msg + "\n")
        finally:
            self.chat_history.configure(state='disabled')
            self.chat_history.see(tk.END)

    def load_gguf(self, file_path=None):
        if Llama is None:
            messagebox.showerror("Errore", "llama-cpp-python non installato!")
            return
        # Allow passing a file_path when called programmatically
        def _do_load(fp):
            if fp:
                self.log(f"[*] Caricamento GGUF: {os.path.basename(fp)}...")
                try:
                    self.model = Llama(model_path=fp, n_ctx=2048)
                    self.model_type = "gguf"
                    self.lbl_status.config(text=f"Modello: {os.path.basename(fp)}", fg="green")
                    self.log("[+] Modello GGUF pronto.")
                except Exception as e:
                    self.log(f"[!] Errore: {e}", tag="error")

        # Show dialog when invoked from the GUI if no path provided
        if not file_path:
            file_path = filedialog.askopenfilename(filetypes=[("GGUF files", "*.gguf")])
        _do_load(file_path)

    def load_mlx(self, dir_path=None):
        if load is None:
            messagebox.showerror("Errore", "mlx-lm non installato!")
            return
        # Allow passing a dir_path when called programmatically
        def _do_load(dp):
            if dp:
                self.log(f"[*] Caricamento MLX da: {dp}...")
                try:
                    self.model, self.tokenizer = load(dp)
                    self.model_type = "mlx"
                    self.lbl_status.config(text=f"Modello MLX: {os.path.basename(dp)}", fg="green")
                    self.log("[+] Modello MLX pronto.")
                except Exception as e:
                    self.log(f"[!] Errore: {e}", tag="error")

        # Prompt when invoked from GUI if no path provided
        if not dir_path:
            dir_path = filedialog.askdirectory()
        _do_load(dir_path)

    def send_message(self):
        user_text = self.entry_msg.get()
        if not user_text or not self.model:
            return
        # Log the user message with the `user` tag for colored display
        self.log(f"TU: {user_text}", tag="user")
        self.entry_msg.delete(0, tk.END)
        
        # Avvia l'inferenza in un thread separato per non bloccare la GUI
        threading.Thread(target=self.generate_response, args=(user_text,), daemon=True).start()

    def generate_response(self, prompt):
        # Show AI heading while generating, then append the response below
        self.log("AI:", tag="ai")
        try:
            if self.model_type == "gguf":
                # Call the llama-cpp binding and handle different return shapes.
                response = self.model(f"Q: {prompt} A: ", max_tokens=256, stop=["Q:", "\n"])

                # Debug: print raw response representation to the terminal for diagnosis
                try:
                    print("[DEBUG] raw response:", repr(response))
                except Exception:
                    pass

                # Extract text safely from known response shapes
                text = ""
                try:
                    if isinstance(response, dict):
                        # Typical shape: { 'choices': [ { 'text': '...'} ] }
                        choices = response.get('choices')
                        if choices and isinstance(choices, list):
                            first = choices[0]
                            if isinstance(first, dict):
                                if 'text' in first:
                                    text = first.get('text', '')
                                elif 'message' in first and isinstance(first['message'], dict):
                                    # openai-like shape
                                    text = first['message'].get('content', '')
                        # fallback: some versions return {'data': [{'text': ...}]}
                        if not text and 'data' in response:
                            parts = []
                            for d in response.get('data', []):
                                if isinstance(d, dict):
                                    parts.append(d.get('text', ''))
                            text = ''.join(parts)
                    elif isinstance(response, str):
                        text = response
                    else:
                        text = str(response)
                except Exception as e:
                    text = f"(error extracting text: {e})"

                text = (text or "").strip()
                if not text:
                    self.log("(no text returned)", tag="ai")
                else:
                    # Append the AI reply under the AI heading
                    self.log(text, tag="ai")

            elif self.model_type == "mlx":
                # MLX generate restituisce una stringa
                text = generate(self.model, self.tokenizer, prompt=prompt, verbose=False, max_tokens=256)
                text = (text or "").strip()
                if not text:
                    self.log("(no text returned)", tag="ai")
                else:
                    self.log(text, tag="ai")
        except Exception as e:
            self.log(f"\n[!] Errore durante la generazione: {e}", tag="error")

if __name__ == "__main__":
    root = tk.Tk()
    app = ChatApp(root)
    root.mainloop()