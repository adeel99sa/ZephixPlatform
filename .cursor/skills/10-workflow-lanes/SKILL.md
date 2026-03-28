Name
workflow-lanes

Description
Use when work must be split into phases like lane 0, sequence 1 to 4, or when multiple subsystems are involved.

Instructions

Split work into lanes by risk and dependency.

Lane 0 is harness and docs only.

Lane 1 is tests and gates.

Lane 2 is route contract fixes.

Lane 3 is UI wiring.

Each lane must end with a green gate command.

Stop conditions

Any test fails.

Any route mismatch discovered.

Tenant header requirement unclear.
