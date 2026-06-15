# /game/python/ai_engine.py
# Wrapper for a lightweight local language model (Transformers or llama.cpp).
# Provides generate_dialogue(prompt) to produce dynamic text.

try:
    # Attempt to use Hugging Face Transformers pipeline (e.g., gpt2)
    from transformers import pipeline
    _model = pipeline("text-generation", model="gpt2")  # placeholder model
except Exception:
    try:
        # Fallback to llama.cpp if installed
        from llama_cpp import Llama
        _model = Llama(model_path="models/whispering_ggml.bin")
    except Exception:
        _model = None

def generate_dialogue(prompt: str) -> str:
    """
    Send a prompt to the AI model and return the generated text.
    Handles missing dependencies gracefully.
    """
    if _model is None:
        return "[AI model not available]"
    try:
        # Generate up to 150 tokens with moderate randomness
        output = _model(prompt, max_length=150, temperature=0.8, n_return_sequences=1)
        # Extract generated text (varies by library)
        if isinstance(output, list) and len(output) > 0:
            return output[0]["generated_text"]
        else:
            return str(output)
    except Exception as e:
        return f"[Generation error: {e}]"