#include <stdio.h>
#include <stdlib.h>

/* These are the "real" implementations for external deps.
   They get replaced by stubs during unit testing. */

int get_user_input(void) {
    return rand() % 100;
}

void log_message(const char* msg) {
    fprintf(stdout, "LOG: %s\n", msg);
}
