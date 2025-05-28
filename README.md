# fluent-results

[![Build and Test - Main](https://github.com/pnagoorkar/fluent-results/actions/workflows/main.yml/badge.svg)](https://github.com/pnagoorkar/fluent-results/actions/workflows/main.yml)

[![codecov](https://codecov.io/gh/pnagoorkar/fluent-results/branch/main/graph/badge.svg)](https://codecov.io/gh/pnagoorkar/fluent-results)


*A tiny, dependency‑free **generic** helper for composing success/failure pipelines in JavaScript & TypeScript; with first‑class **sync & async** fluent APIs. Heavily inspired by the .NET [FluentResults](https://github.com/altmann/FluentResults) pattern.*

---

## ✨ Why?

JavaScript exceptions work, but once business logic starts branching, nested `try / catch` blocks become hard to follow. **fluent‑results** lets you:

* Compose operations **fluently** (chain calls like `.bind(…)`).
* Keep **data and errors together** in a single object.
* **Short‑circuit** automatically after the first failure.
* Pass the **current state** between steps without global variables.
* Mix synchronous **and** Promise‑returning steps in the same chain.
* Stay on the **happy path** while you can and swith to a **contingent path** when you can't.

If you enjoy functional pipelines or railway‑oriented programming, you’ll feel at home.

---

## 🚀 Installation

```bash
npm i fluent-results
# or
yarn add fluent-results
```

The package ships ES modules **and** `.d.ts` typings so TypeScript *and* plain‑JavaScript editors get IntelliSense out‑of‑the‑box.

---

## ⏱ Quick start (sync)

```ts
import { Result } from 'fluent-results';

const result =
  Result.try(() => 42)                 // start a pipeline – succeeds, state=42
        .bind(n => n + 1)              // state becomes 43
        .okIf(state => state < 50,     // predicate true → stays Success
              new MyError('Too big'))
        .bind(() => {
            throw new Error('Boom');   // failure captured, pipeline stops
        });

if (result.isSuccess) {
   console.log('Yay 🎉', result.currentState);
} else {
   console.error('Failed:', result.errors);
}
```

## ⏱ Quick start (async)

```ts
const userResult = await Result.tryAsync(() => fetch('/user/7').then(r => r.json()))        // Result<User>
.then(result => result.okIfAsync(u => u.active, new AuthError('Inactive user'))    // guard
.then(result => result.bindAsync(user => saveAudit(user.id)));                      // Result<AuditRow>

if (userResult.isSuccess) {
  console.log('Audit id:', userResult.currentState.id);
} else {
  console.error(userResult.errors);
}
```

---

## 🛠 API surface (sync & async)

| Member | Purpose | Example |
| ------ | ------- | ------- |
| `Result.try(action, routineName)` | Kick off a **sync** pipeline; thrown exceptions are wrapped in `ExceptionalError`. | `Result.try(() => doWork(), "My primary routine")` |
| `Result.tryAsync(action, routineName)` | Kick off an **async** pipeline; rejected promises become `PromiseRejection`. | `Result.tryAsync(() => fetch('/api').then(r => r.json()), "My primary routine")` |
| `.bind(fn)` | Chain a **synchronous** step; skipped when the pipeline is already failed. | `.bind(n => n + 1)` |
| `.bindAsync(fn)` | Chain an **async** step that returns a Promise. | `.bindAsync(async n => n * 2)` |
| `.okIf(pred, err)` | Keep success *only if* predicate returns `true`; otherwise push `err`. | `.okIf(x => x < 50, new RangeError())` |
| `.okIfAsync(pred, err)` | Async predicate version. | `.okIfAsync(async x => await isValid(x), new ValidationError())` |
| `.failIf(pred, err, contingency)` | Turn pipeline into failure *only if* predicate returns `true`. Optionally define a contingent routine that will be execute if the predicate evaluates to true | `.failIf(() => isDuplicate(), new ConflictError())` |
| `.failIfAsync(pred, err, contingency)` | Async predicate version. Optionally define a contingent routine that will be execute if the predicate evaluates to true | `.failIfAsync(async () => await exists(), new ConflictError())` |
| **Getters** | Inspect pipeline state and trace execution path | `result.isSuccess`, `result.currentState`, `result.errors`, `result.child`, `result.parent` |

Async variants return `Promise<Result<…>>`; you can freely interleave them with the sync ones.

---

## 🐛 Built-in error wrappers — errors as *first-class objects*

A big advantage of the fluent-results pattern is that **every failure is represented by a real object** instead of a brittle string or numeric code.  
That lets you pattern-match on error *types*, attach extra fields (status codes, correlation IDs, etc.), and serialize the whole `Result` for telemetry - while keeping the pipeline fluent.

| Wrapper class | Added when… | Typical use |
| ------------- | ----------- | ----------- |
| `ExceptionalError` | A synchronous delegate **throws**. | Preserve the original stack trace & message while converting the exception into a typed reason the pipeline understands. |
| `PromiseRejection` | A Promise inside `tryAsync`, `bindAsync`, `okIfAsync`, or `failIfAsync` **rejects**. | Surface async failures in exactly the same, type-safe way as sync ones. |

Because failures are objects, you can easily branch on domain-specific subclasses:

```ts
const result = await Result.tryAsync(() => fetch("/myControlledAccessEndpoint"));
                           .then(result => result.failIf(response => response.status === 403, new AuthError(response)))
                           .then(result => result.bind(...))
                           .then(result => result.okIf(...))
                           .then(result => result.bind(...));
if (result.isFailed) {
  const authIssues = result.errors.filter(e => e instanceof AuthError);
  if (authIssues.length) {
    console.log(`user not authorized to access endpoint: ${authIssues[0].response.url}`);
  }
}
```
Extend **`AError`** to introduce your own domain‑specific failures.

---
## 🛣 Detouring on contingencies (child ↔ parent)
Stay on the happy path while you can; continue executing on a contingent path if you can't
```ts
const result = Result.try(() => loadCache(), "Load from cache")
                     .failIf(cache => cache === null,                                   // contingency trigger
                             new CacheMissError(),                                      // error pushed onto the main Result
                             {func: fetchFromServer, routineName: "Load from server"})  // contingency
                     .bind(cache => cache.getData());                                   // will never run
  const data = result.isSuccess ? result.currentState : result.child.currentState;

// ── relationships ─────────────────────────────────────────────
//  result.child  → Result fetched from server
//  result.child.parent === result  ✅

```

---

## 🧪 Developing locally

```bash
git clone https://github.com/pnagoorkar/fluent-results.git
cd fluent-results
npm ci           # exact dev dependencies
npm test         # Jest suite
npm run build    # emits ES modules + type declarations into /dist
```


---

## 🤝 Contributing

1. **Bug** – open an issue & add a failing test in your PR.  
2. **Feature** – start with an issue so we can discuss naming and scope.

PRs are welcome!

---

## 📜 Licence

[MIT](LICENSE) – do whatever you want; attribution appreciated but not required.

---

## 🙏 Credits

Pattern & naming inspired by [FluentResults for .NET](https://github.com/altmann/FluentResults).  
Built with ❤️ by [@pnagoorkar](https://github.com/pnagoorkar).

Happy fluent coding!
