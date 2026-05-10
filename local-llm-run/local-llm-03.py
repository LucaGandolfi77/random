import os
import sys
from mlx_lm import load, generate


def find_model_path(cli_arg=None):
	"""Return a path to the model if it exists, trying several likely locations."""
	tried = []
	candidates = []
	if cli_arg:
		candidates.append(cli_arg)
	# env override
	envp = os.environ.get("LOCAL_LLM03_MODEL_PATH")
	if envp:
		candidates.append(envp)

	# common mistaken mount point and a macOS /Volumes fallback
	candidates.append("/PortableSSD/LLM/gemma-4-E2B-it-MLX-8bit")
	candidates.append("/Volumes/PortableSSD/LLM/gemma-4-E2B-it-MLX-8bit")

	# relative fallback inside repo
	candidates.append(os.path.join(os.getcwd(), "models", "gemma-4-E2B-it-MLX-8bit"))

	for p in candidates:
		if not p:
			continue
		tried.append(p)
		if os.path.exists(p):
			return p, tried
	return None, tried


if __name__ == "__main__":
	arg = sys.argv[1] if len(sys.argv) > 1 else None
	model_path, tried = find_model_path(arg)
	if not model_path:
		print("Model path not found. Tried the following locations:")
		for t in tried:
			print(" -", t)
		print("\nPlease provide the correct path as the first argument or set LOCAL_LLM03_MODEL_PATH.")
		sys.exit(1)

	print("Loading model from:", model_path)
	model, tokenizer = load(model_path)

	response = generate(model, tokenizer, prompt="hello", verbose=True)
	print(response)