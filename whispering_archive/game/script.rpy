# /game/script.rpy
# Main script for "The Whispering Archive".
# Defines characters, relationship meters, and story flow.
# Demonstrates calling the AI engine to generate dynamic dialogue.

define l = Character("Librarian", color="#c0c0ff")
define a = Character("Archivist", color="#ffb0b0")
define s = Character("Book Spirit", color="#b0ffb0")

default librarian_friendship = 0
default archivist_friendship = 0
default spirit_friendship = 0

label start:
    scene bg library with fade
    "Welcome to the Forbidden Library. Choose your first book to open."
    menu:
        "Open the Ancient Tome":
            jump ancient_tome
        "Open the Whispering Grimoire":
            jump whispering_grimoire
        "Open the Hidden Ledger":
            jump hidden_ledger

label ancient_tome:
    $ prompt = "You open the Ancient Tome. The book whispers: 'Seek the truth, but beware the cost.' What do you do?"
    $ ai_response = generate_dialogue(prompt)
    "The book says: [ai_response]"
    "Relationship with Librarian: [librarian_friendship]"
    menu:
        "Ask more":
            $ librarian_friendship += 1
            jump ask_more
        "Close the book":
            "You close the book. The library feels quieter."
            jump after_choice

label whispering_grimoire:
    $ prompt = "You open the Whispering Grimoire. It asks: 'What secret do you seek?'"
    $ ai_response = generate_dialogue(prompt)
    "The grimoire replies: [ai_response]"
    menu:
        "Reveal your desire":
            $ spirit_friendship += 1
            jump reveal_desire
        "Stay silent":
            "You keep quiet. The grimoire glows faintly."
            jump silence

label hidden_ledger:
    $ prompt = "The Hidden Ledger opens to a blank page. It writes: 'Your choices shape fate.'"
    $ ai_response = generate_dialogue(prompt)
    "The ledger writes: [ai_response]"
    menu:
        "Copy the text":
            $ archivist_friendship += 1
            jump copy_text
        "Burn the page":
            "You set the page ablaze. Ashes rise like whispers."
            jump burn_page

label ask_more:
    "You ask the book for more details."
    "The Librarian smiles."
    "Relationship with Librarian: [librarian_friendship]"
    jump after_choice

label reveal_desire:
    "You reveal your deepest desire."
    "The Book Spirit nods."
    "Relationship with Book Spirit: [spirit_friendship]"
    jump after_choice

label copy_text:
    "You copy the text into your notebook."
    "Relationship with Archivist: [archivist_friendship]"
    jump after_choice

label silence:
    "You remain silent."
    "The grimoire dims."
    jump after_choice

label burn_page:
    "The ashes fade."
    jump after_choice

label after_choice:
    "The library hums with new possibilities."
    return

# AI engine integration
init python:
    import os
    # Import the AI engine module located in game/python/
    from python import ai_engine
    def generate_dialogue(prompt: str) -> str:
        """Call the AI engine and return the generated dialogue."""
        return ai_engine.generate_dialogue(prompt)