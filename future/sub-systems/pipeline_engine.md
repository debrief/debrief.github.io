# Pipeline Engine (RAP)

This document defines the `Pipeline Engine (RAP)` sub-system, part of the Debrief Rewrite under the **Shared Services** category.

## Infrastructure thoughts

### Pipeline Runner Decision Matrix

| Feature / Criteria       | Airflow  | Prefect | Dagster | Custom Runner (JS + Optional Python)      |
|---------------------------------------------|------------------------------|-----------------------------|-----------------------------|-------------------------------------------|
| In-browser support      | ❌ None  | ❌ None | ❌ None | ✅ JS-native steps run in-browser|
| Local container execution| ⚠️ Heavyweight     | ✅ Designed for this| ✅ Designed for this| ✅ With Node.js or Python backend|
| Future server-hosted scaling      | ✅ Battle-tested   | ✅ Native via Prefect Orion  | ✅ Native via Dagster Cloud | ⚠️ Requires work to scale server infra     |
| Step registry across JS + Python  | ❌ Python-only     | ⚠️ Python-only    | ⚠️ Python-first   | ✅ Explicit mapping in JS and Python       |
| Analyst-triggered runs  | ⚠️ Hard to streamline        | ✅ Simple in UI/API| ✅ Simple with GraphQL       | ✅ Direct UI integration|
| Lightweight local install/dev     | ❌ Requires DB + scheduler   | ✅ CLI or Docker Compose     | ⚠️ Slightly heavier| ✅ As lightweight as needed      |
| Visual pipeline debugging| ✅ Gantt UI        | ✅ Flow UI| ✅ Graph UI        | ⚠️ Basic unless built separately |
| Support for long-running steps    | ✅ Yes   | ✅ Yes   | ✅ Yes   | ❌ Not in-browser, only via server|
| Loop/branch/async support| ✅ Yes   | ✅ Yes   | ✅ Yes   | ⚠️ Requires explicit implementation        |
| Declarative JSON pipeline format  | ❌ Python DAGs only| ✅ JSON available  | ⚠️ YAML/Python focus| ✅ Designed to be JSON-native    |
| Extensibility (MCP / LLM support) | ⚠️ Limited| ✅ Python dynamic graphs     | ✅ Strongly typed graph model | ✅ Easily adapted to LLM-generated steps   |

### Recommended Strategy by Phase

| Phase       | Strategy     |
|-------------|--------------------------------------------------------------------------|
| **Now**     | Build a **Custom Runner** in JS with pluggable function registry|
| **Mid-term**| Add an optional **Python backend runner** (Flask + Celery/RQ or similar) |
| **Future**  | Evaluate **Prefect** or **Dagster** for hosted orchestration   |
| **Airflow?**| Only consider if tight scheduling, SLA enforcement, or legacy tie-ins arise |

## Purpose

_TBD_

## Interfaces

_TBD_

## Deployment Mode

_TBD_
