import ast

def execute_functions(filename, function_names):
    with open(filename, 'r') as f:
        source = f.read()
    
    tree = ast.parse(source)
    env = {}
    
    # Extract only requested functions
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name in function_names:
            exec(compile(ast.Module(body=[node], type_ignores=[]), filename, 'exec'), env)
    
    return env

functions_to_load = [
    "append_unique_strings", "normalize_character_updates", "normalize_summary_list",
    "stringify_profile_value", "normalize_character_profile", "add_character_note",
    "merge_character_field", "merge_character_profiles", "merge_summary_into_memory"
]

env = execute_functions("openrouter_book_factory_framework.py", functions_to_load)

# Validation logic
try:
    # 1) existing character field is a list and update is a dict
    # merge_character_field(existing_val, update_val)
    # Based on the file content, let's test merge_character_field
    mcf = env['merge_character_field']
    
    test_1_existing = ["old_list_item"]
    test_1_update = {"new_key": "new_val"}
    res1 = mcf(test_1_existing, test_1_update)
    assert isinstance(res1, dict) or isinstance(res1, list), "Case 1 failed"
    print("Case 1: existing character field is a list and update is a dict - SUCCESS")

    # 2) existing character field is a dict and update is a list
    test_2_existing = {"old_key": "old_val"}
    test_2_update = ["new_list_item"]
    res2 = mcf(test_2_existing, test_2_update)
    print("Case 2: existing character field is a dict and update is a list - SUCCESS")

    # 3) merge_summary_into_memory handles the same list->dict transition without raising
    msim = env['merge_summary_into_memory']
    # Mocking memory structure for merge_summary_into_memory
    # merge_summary_into_memory(memory, summary_data)
    # usually summary_data has 'characters': {'Name': {...}}
    test_3_memory = {
        "characters": {
            "Protagonist": {
                "traits": ["brave"]
            }
        }
    }
    test_3_summary = {
        "characters": {
            "Protagonist": {
                "traits": {"personality": "brave"}
            }
        }
    }
    msim(test_3_memory, test_3_summary)
    print("Case 3: merge_summary_into_memory handles the same list->dict transition - SUCCESS")

except Exception as e:
    import traceback
    traceback.print_exc()
    exit(1)
