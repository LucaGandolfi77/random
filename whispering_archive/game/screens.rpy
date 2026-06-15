# /game/screens.rpy
# Custom screens for page‑turn animations using Pygame‑style transitions.
# Provides fade and slide transitions that can be used with show/hide.

# Fade transition screen (applies a fade‑in/out effect)
screen fade_transition:
    tag transition
    fade (0.5, color="#000000")  # 0.5‑second fade to black

# Slide transition screen (slides content from right to left)
screen slide_transition:
    tag transition
    slide (0.5, xoffset=100, color="#000000")  # slide over 0.5 s

# Example screen that uses a transition when shown
screen book_page:
    add "images/page_bg.png"
    # When this screen is shown, apply the slide transition
    on "show" action Show("book_page", transition=slide_transition)