# Recoverable structural validation

`SequenceViewer`, `LinearViewer`, and `CircularViewer` now validate their input
at the component boundary. They use recoverable validation by default:

- Structurally invalid annotations are omitted from annotation rendering. The
  sequence remains visible beside a local, accessible diagnostic.
- Sequence data with an unsafe runtime shape is replaced by a local error
  placeholder. The viewer does not run stacking, sequence conversion, or
  consumer rendering callbacks against that data.
- Valid sequence strings, residues, case, indices, annotation coordinates,
  callback references, and caller metadata are preserved. The validation
  boundary does not apply a biological alphabet.

All three viewers accept the same option:

```tsx
<SequenceViewer validationMode="recover" {...props} />
<LinearViewer validationMode="strict" {...props} />
<CircularViewer validationMode="recover" {...props} />
```

`validationMode="recover"` is the default. `validationMode="strict"` throws a
`ViewerValidationError` when sequence or annotation structure is invalid so an
application error boundary can handle it.

## Migrating from `noValidate`

`noValidate` is deprecated. Existing viewer calls have this compatibility
mapping:

| Viewer options                                      | Effective mode |
| --------------------------------------------------- | -------------- |
| Neither option supplied                             | `recover`      |
| `noValidate={true}`                                 | `recover`      |
| `noValidate={false}`                                | `strict`       |
| `validationMode="recover"` with either legacy value | `recover`      |
| `validationMode="strict"` with either legacy value  | `strict`       |

An explicit `validationMode` always wins. Applications can replace
`noValidate` directly with the corresponding mode.

The exported parsing helpers remain strict by default because they do not have
a UI in which to report recoverable diagnostics. `getAnnotatedSequence` still
supports deprecated `noValidate`; `true` safely excludes malformed annotations
and `false` remains strict. Its explicit `validationMode` also takes precedence.
Recovery never returns an object that failed the annotated-sequence schema.

The existing public schemas, including `annotationSchema`, `nuclSchema`, and
`aaSchema`, remain exported. The alphabet schemas are available to applications
that want biological validation, but viewer rendering does not apply them.
