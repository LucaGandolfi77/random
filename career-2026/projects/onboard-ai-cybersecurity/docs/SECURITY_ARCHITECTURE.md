# Security architecture

Load path: allowlisted model_id+version -> manifest validation -> checksum (SHA-256) -> apply.
Update path: UpdateGate (pin, age window, monotonic timestamp) -> apply; rollback only to trusted
list; recovery from trusted checkpoint. Input path: range checks + timestamp freshness. No
deserialization of untrusted data; files resolved within root only; symlinks rejected.
