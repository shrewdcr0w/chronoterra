
#### `CONTRIBUTING.md`
```markdown
# Contributing to Chronoterra

Contributions are welcome provided they uphold Chronoterra's core engineering and epistemic rules:

1. **Preserve the `PlanetaryState` Contract**: Extend `src/types/planetaryState.ts` and `PlanetaryStateSchema` cleanly; never bypass the store with isolated component state for shareable parameters.
2. **Enforce Epistemic Classification**: Every new layer or model must be registered in `src/data/metadata/datasetRegistry.ts` and `docs/attributions.md` as `observed`, `reconstructed`, `projected`, or `hypothetical`. Never label procedural or user-defined outputs as `observed` or `projected`.
3. **No Fake Controls**: Every enabled UI control must affect the simulation or renderer. Unfinished features must be visibly disabled and labeled `(Planned)`.
4. **Respect Integrated-GPU Budgets**: Gate new geometry segments, shader samples, or instanced mesh counts behind `GRAPHICS_PRESETS` (`low`, `balanced`, `high`, `ultra`).
5. **Test Before Submitting**: Ensure `npm run lint` and `npm run test` pass with Vitest unit test coverage for any new store actions or data loaders.