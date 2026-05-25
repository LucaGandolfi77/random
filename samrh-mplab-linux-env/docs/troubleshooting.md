# Troubleshooting

## `mdb.sh not found`

Symptoms:

The runner reports that `mdb.sh` could not be located.

Actions:

1. Run `./scripts/verify-tools.sh --require-mdb`.
2. Export `MDB_PATH=/absolute/path/to/mdb.sh`.
3. If only the installation root is known, export `MPLABX_DIR=/absolute/path/to/mplabx/version`.

## Wrong line endings

Symptoms:

Scripts fail with `/usr/bin/env: 'bash\r': No such file or directory`.

Actions:

1. Ensure the repository is checked out with LF endings.
2. Confirm `.gitattributes` is present.
3. Convert affected files with `sed -i 's/\r$//' <file>` or `dos2unix <file>` if available.

## Missing execute permissions

Symptoms:

Linux reports `Permission denied` when invoking a script.

Actions:

1. Run `chmod +x scripts/*.sh scripts/lib/*.sh`.
2. Re-check permissions in version control before committing.

## Wrong shell

Symptoms:

Scripts behave differently when launched with `sh`.

Actions:

1. Run scripts directly, for example `./scripts/run-tests.sh`.
2. Do not launch the repository scripts with `sh`; they require Bash.

## XC32 missing

Symptoms:

Target build fails because `xc32-gcc` cannot be found.

Actions:

1. Run `./scripts/verify-tools.sh --require-xc32`.
2. Export `XC32_DIR=/absolute/path/to/xc32/version`.
3. Re-run `./scripts/build-target.sh`.

## Unsupported simulator flow

Symptoms:

MDB launches, but the simulator does not halt cleanly or does not expose expected symbols.

Actions:

1. Inspect the generated log under `logs/runtime/`.
2. Verify the local MDB syntax in an interactive dry run.
3. Replace the template with a locally verified `.mdb` file and pass it with `--mdb-script`.
4. Fall back to host tests or hardware-backed tests for the scenario.