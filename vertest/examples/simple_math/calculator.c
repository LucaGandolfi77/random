#include <stdio.h>
#include <string.h>

/* External dependency - will be stubbed */
extern int get_user_input(void);
extern void log_message(const char* msg);

/* Functions under test */

int add(int a, int b) {
    return a + b;
}

int subtract(int a, int b) {
    return a - b;
}

int multiply(int a, int b) {
    return a * b;
}

int divide(int a, int b) {
    if (b == 0) {
        log_message("Division by zero attempted");
        return 0;
    }
    return a / b;
}

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int process_input(void) {
    int val = get_user_input();
    if (val < 0) {
        log_message("Negative input received");
        return -1;
    }
    return val * 2;
}

int is_even(int n) {
    return n % 2 == 0;
}

int max_of_three(int a, int b, int c) {
    int max = a;
    if (b > max) max = b;
    if (c > max) max = c;
    return max;
}

float calculate_average(int arr[], int size) {
    if (size <= 0) {
        log_message("Invalid array size");
        return 0.0f;
    }
    int sum = 0;
    for (int i = 0; i < size; i++) {
        sum += arr[i];
    }
    return (float)sum / size;
}
