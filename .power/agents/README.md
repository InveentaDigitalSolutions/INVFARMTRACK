# Power Platform Expert Agents

A team of nine specialized agents for Power Platform work, orchestrated by a single entry point.

## How it works

You talk to **Oscar**. Oscar talks to the specialists. You see one coherent answer.

```
You --> Oscar ---+--> Romeo  (requirements -- runs first on non-trivial tasks)
                +--> Sierra (architecture)
                +--> Mike   (data modeling)
                +--> Delta  (Dataverse)
                +--> Alpha  (Power Apps)
                +--> Bravo  (Power Automate)
                +--> Victor (Power BI)
                +--> Quebec (quality gate -- always last)
```

## Files

| File | Agent | Domain |
|---|---|---|
| `oscar-orchestrator.md` | **Oscar** | Routing, handoffs, synthesis |
| `romeo-requirements.md` | **Romeo** | Requirements engineering |
| `sierra-solution-architect.md` | **Sierra** | Solution architecture |
| `mike-data-modeling.md` | **Mike** | Data modeling |
| `delta-dataverse.md` | **Delta** | Dataverse implementation |
| `alpha-power-apps.md` | **Alpha** | Canvas & Model-driven apps |
| `bravo-power-automate.md` | **Bravo** | Cloud & desktop flows |
| `victor-visualisation.md` | **Victor** | Power BI & reporting |
| `quebec-quality.md` | **Quebec** | Quality, governance, review |

## Core principles

1. **Oscar is the only entry point.** Specialists are never invoked directly.
2. **Romeo runs first on every non-trivial task.** Romeo's Requirements Package is the single source of truth that travels with every downstream handoff.
3. **One agent owns each task.** No ambiguity about responsibility.
4. **Handoffs use a structured protocol** (defined in `oscar-orchestrator.md`) so context never gets lost.
5. **Quebec gates every delivery.** No exceptions without Sierra's override.
6. **Closer to the data wins** the tie-breaker when two agents could own a task.

## Standard chains

- **New solution:** Romeo -> Sierra -> Mike -> Delta -> (Alpha | Bravo | Victor) -> Quebec
- **App feature:** Romeo -> Alpha -> (Delta if schema) -> (Bravo if automation) -> Quebec
- **Broken flow:** Bravo -> (Romeo if requirements gap) -> (Delta if data layer) -> Quebec
- **New report:** Romeo -> Victor -> (Mike if model needs reshape) -> Quebec
- **Client proposal:** Romeo -> Sierra -> Quebec
- **Trivial single-agent task:** specialist -> Quebec (skip Romeo)

Full protocol, routing rules, and conflict resolution are in `oscar-orchestrator.md`.
