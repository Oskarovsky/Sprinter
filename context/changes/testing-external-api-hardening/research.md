---
date: 2026-06-04T12:00:00Z
researcher: Gemini
git_commit: 61dbfd93af91728fc8f58aca4f665b17c14f9534
branch: m3l2
repository: Oskarovsky/Sprinter
topic: "OpenRouter Integration and Testing"
tags: [research, codebase, openrouter, testing]
status: complete
last_updated: 2026-06-04
last_updated_by: Gemini
---

# Research: OpenRouter Integration and Testing

**Date**: 2026-06-04T12:00:00Z
**Researcher**: Gemini
**Git Commit**: 61dbfd93af91728fc8f58aca4f665b17c14f9534
**Branch**: m3l2
**Repository**: Oskarovsky/Sprinter

## Research Question

The user wants to understand how OpenRouter is used in the codebase, ensuring that real user requests use the real OpenRouter, while tests can use a mix of mocked and real instances to control costs.

## Summary

The OpenRouter integration is designed to be robust and cost-conscious. Real user requests use the OpenRouter API only when an API key is provided in the environment. Otherwise, the system gracefully falls back to deterministic, mock implementations. The test suite is set up to use mocked data by default, preventing unexpected costs and ensuring test reliability. For tests that require the real OpenRouter API, a separate test configuration can be used to provide a real API key and bypass the default mocking.

## Detailed Findings

### OpenRouter Integration Points

The core of the OpenRouter integration is located in `src/lib/ai/`.

-   **`src/lib/ai/openrouter.ts`**: This is the main client for the OpenRouter API. It handles the construction of API requests, including authentication, and parses the responses. It is designed to be resilient, with a timeout and error handling that prevents it from crashing the application.
-   **`src/lib/ai/config.ts`**: This file manages the configuration for the AI features. It retrieves the `OPENROUTER_API_KEY` from the server-side environment variables (`astro:env/server`), ensuring that the key is not exposed to the client. The `isAiConfigured()` function is used throughout the application to determine if the AI features should be enabled.
-   **`src/lib/ai/types.ts`**: This file defines the TypeScript types for the data sent to and received from the OpenRouter API, ensuring type safety.
-   **`src/lib/ai/generate-*.ts` files**: Files like `generate-analyst.ts`, `generate-coach.ts`, and `generate-draft.ts` are the orchestrators that use the `openrouter.ts` client to perform specific AI tasks. They check if the AI is configured before making any API calls and handle the fallback logic.

### Testing Strategy

The testing strategy is designed to be flexible and cost-effective.

-   **Mocking by Default**: The project uses `msw` (Mock Service Worker) to mock the OpenRouter API in tests. The mock setup is located in `src/test/mocks/http.ts`, which intercepts requests to the OpenRouter API and returns predefined responses. This is the default behavior for all tests.
-   **Using Real API in Tests**: To use the real OpenRouter API in tests, you would need to create a separate test suite that does not use the global `msw` setup. In this suite, a real `OPENROUTER_API_KEY` must be provided through the environment (e.g., using a `.env.test` file). This allows for controlled end-to-end testing without affecting the main test suite.

### Real User Request Flow

The flow for a real user request that uses an AI feature is as follows:

1.  A feature-specific function (e.g., `generateAnalystVote` in `src/lib/ai/generate-analyst.ts`) is called.
2.  The function first checks if the AI is configured by calling `isAiConfigured()`.
3.  If configured, it builds a prompt and calls a function from `openrouter.ts` (e.g., `completeJsonWithMeta`).
4.  The `openrouter.ts` function retrieves the API key and makes a `fetch` request to the OpenRouter API.
5.  If the API call is successful, the response is parsed and returned.
6.  If the AI is not configured, or if there is any error during the API call, the function returns a `null` value or an error, and the application falls back to a deterministic, non-AI implementation.

## Code References

-   `src/lib/ai/openrouter.ts`: The core client for the OpenRouter API.
-   `src/lib/ai/config.ts`: Configuration for the AI features, including API key management.
-   `src/test/mocks/http.ts`: Mock setup for the OpenRouter API using `msw`.
-   `src/lib/ai/generate-analyst.ts`: Example of an orchestrator that uses the OpenRouter client.

## Open Questions

-   The process for running tests with a real API key is not explicitly documented. It would be beneficial to add a section to the `README.md` or a contributing guide that explains how to set up and run these tests.
