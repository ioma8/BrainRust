# Frontend Hexagonal Architecture Refactor Plan

## Goal
Make the frontend follow **strict hexagonal architecture**:
- **Domain** (`src/app/domain`): pure business rules, no framework/IO.
- **Application** (`src/app/application`): orchestration via **ports**, no direct UI/IO libs.
- **Infrastructure** (`src/app/infrastructure`): adapters for Tauri/Supabase/browser APIs.
- **Presentation** (`src/app/presentation`): Preact UI + hooks, no direct infrastructure imports, minimal state mutations.

Also ensure **business logic is fully unit-tested** (Domain + Application).

## Current State (What’s Already Good)
- Folder structure already aligns with hex layers.
- Domain logic is mostly pure and already covered by tests.
- Application use-cases exist and many have tests.

## Layering Violations / Risks (To Fix)
1. **Presentation imports infrastructure directly**
   - `src/app/presentation/hooks/useCloudState.ts` imports `src/app/infrastructure/supabase/cloudApi.ts`.
   - `src/app/presentation/hooks/useFileOperations.ts` imports `src/app/infrastructure/supabase/cloudApi.ts`.
   This allows UI to bypass the application layer and makes business rules harder to test.

2. **Persistence workflow decisions live in presentation**
   - Save/open target decision logic (local vs cloud, offline fallback, “existing cloud resave”) is implemented in `useFileOperations`.
   - These are business/application rules and should be moved to Application use-cases.

3. **Presentation mutates application state directly for viewport offset**
   - `src/app/presentation/hooks/useCanvasInteraction.ts` calls `updateTab(...)` directly.
   This is acceptable pragmatically, but it’s not “strict hex”.

## Refactor Strategy (Minimal, High-Impact First)

### Phase 1 — Introduce Cloud Port (Stop Infra Imports from UI)
**Objective:** Presentation stops importing Supabase infrastructure directly.

1. Add a port:
   - `src/app/application/ports/cloudPort.ts`
   - Expose methods needed by the app: `getSession`, `onAuthChange`, `signIn`, `signUp`, `signOut`, `listMaps`, `loadMap`, `saveMap`.

2. Wire it into application dependencies:
   - Extend `src/app/application/usecases/types.ts` (`AppDependencies`) to include `cloud: CloudPort`.

3. Implement adapter:
   - `src/app/infrastructure/supabase/cloudPortAdapter.ts` (wrap the existing `cloudApi.ts`).
   - Keep `cloudApi.ts` as the low-level module if desired, but UI should not import it.

4. Update composition root / dependency builder:
   - `src/app/presentation/hooks/useAppDependencies.ts` provides `deps.cloud` via the adapter.

5. Update presentation hooks:
   - Replace direct `cloudApi.*` calls with `deps.cloud.*` in:
     - `src/app/presentation/hooks/useCloudState.ts`
     - `src/app/presentation/hooks/useFileOperations.ts`

**Acceptance criteria**
- `rg "infrastructure/supabase" src/app/presentation` returns nothing.
- All tests pass.

### Phase 2 — Move Persistence Workflows into Application Use-cases (Testable Rules)
**Objective:** “Save/Open” rules become Application code covered by unit tests; UI only renders dialogs and forwards user choices.

1. Add an application use-case module (name TBD):
   - `src/app/application/usecases/persistence.ts`

2. Define use-cases that return either:
   - a state update + render payload (when action is fully executable), or
   - a typed “UI intent” describing which dialog to open and what data to show.

Example intents:
- `RequestSaveTarget` (local vs cloud)
- `RequestCloudSaveMeta` (title + “save as new”)
- `RequestCloudOpenDialog` (with sorting)

3. Update presentation:
   - `useFileOperations` becomes thin: it triggers the use-case, then either executes the intent (open dialog) or applies result.
   - All business rules live in `persistence.ts`.

**Acceptance criteria**
- No decision logic in UI beyond rendering/collecting input.
- New/changed use-cases covered by unit tests.

### Phase 3 — Decide Where Viewport Offset Belongs
**Objective:** Pick a strict layering approach and standardize it.

Option A (strict): offset is application state
- Add a use-case like `setTabOffset` / `panActiveTab`.
- `useCanvasInteraction` calls the use-case instead of `updateTab`.

Option B (strict): offset is presentation-only view state
- Remove `offset` from `TabState` and store per-tab offset in presentation state.
- Application/domain become fully viewport-agnostic.

**Recommendation:** Option A is the smaller change; Option B is purer but larger.

## Unit Test Coverage Targets
Add direct unit tests for missing application modules:
- `src/app/application/usecases/cloud.ts`
- `src/app/application/usecases/layout.ts`
- (Optional) `src/app/application/usecases/title.ts`

Port contracts (types-only) do not need tests; implementations can be covered via hook tests or integration tests.

## Suggested Execution Order (Few Steps, Fast Completion)
1. Phase 1 (CloudPort + wiring + hook updates) + adjust existing hook tests.
2. Add missing application unit tests (`cloud.ts`, `layout.ts`, optionally `title.ts`).
3. Phase 2 (persistence use-cases + tests) and simplify `useFileOperations`.
4. Phase 3 (offset decision) based on preference for strictness vs change size.

