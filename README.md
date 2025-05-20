# fluent-results

*A tiny, dependency‑free helper for propagating success/failure without `try / catch` soup—heavily inspired by the .NET [FluentResults](https://github.com/altmann/FluentResults) pattern.*

---

## ✨  Why?

JavaScript exceptions work—but once business logic starts branching, nested `try` blocks and thrown errors quickly snowball. `fluent-results` lets you:

* Compose operations **fluently** (much like array chaining).
* Keep **data and errors together** in a single object.
* **Short‑circuit** downstream actions automatically after the first failure.
* Pass the “current state” between steps without external variables.

If you like functional pipelines or railway‑oriented programming, you’ll feel at home.

---

## 🚀  Installation

```bash
npm i fluent-results
# or
yarn add fluent-results
```

The build outputs ES‑targeted JS and `.d.ts` typings (see `dist/` in the published package).

---

## ⏱  Quick start

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

The same pattern drives the unit tests shipped with the repo.

---

## 🛠  API surface

| Member                      | Purpose                                                                                                                                      | Example                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `Result.try(action)`        | Kick off a pipeline, capturing any thrown exception as an `ExceptionalError`.                                                                | `Result.try(() => doWork())`                        |
| `.bind(fn)`                 | Chain another operation. If the pipeline is currently failed, `fn` is **skipped**. The return value (if any) becomes the new `currentState`. | `.bind(prev => prev + 1)`                           |
| `.okIf(predicate, error)`   | **Keep success** *only if* `predicate` returns `true`; otherwise add the provided `error`.                                                   | `.okIf(x => x !== 0, new DivideByZeroError())`      |
| `.failIf(predicate, error)` | **Fail** *only if* `predicate` returns `true`; otherwise stay as‑is.                                                                         | `.failIf(() => isDuplicate(), new ConflictError())` |
| Getters                     | `isSuccess`, `isFailed`, `currentState`, `reasons`, `errors`                                                                                 |                                                     |

All errors extend `AError`; informational messages can inherit from `AReason`.

---

## 🧪  Developing locally

```bash
git clone https://github.com/pnagoorkar/fluent-results.git
cd fluent-results
npm ci            # install exact dev deps
npm test          # Jest unit tests
npm run build     # emits ES module + d.ts into /dist
```

The project uses **TypeScript 5**, **Jest 29** and no runtime deps, keeping the bundle footprint minimal.

Formatting is left to your editor’s prettier/eslint setup; no strict lint config is enforced yet.

---

## 🤝  Contributing

Pull requests welcome! If you have:

1. **A bug fix** – add or expand a unit test reproducing the issue.
2. **A new feature** – open an issue first so we can discuss naming & scope.

---

## 📜  Licence

[MIT](LICENSE) – do whatever you want; attribution appreciated but not required.

---

## 🙏  Credits

* Pattern & naming lifted from **altmann/FluentResults** – thanks for the inspiration.
* Built with ❤️ by [@pnagoorkar](https://github.com/pnagoorkar).

Happy fluent coding!
