# Programming 1 exercise intake

Updated assessment, 2026-09-18. All nine PDFs (26 pages) were previously rendered and visually reviewed; the ambiguous triangle, checkout and quadratic pages were visually rechecked during this continuation using the PDF-review workflow. Source PDFs remain unchanged outside Git; complete handouts and extracted text are excluded from the intended change set. See [PROGRAMMING_1_ACTIVITY_SPECIFICATIONS.md](PROGRAMMING_1_ACTIVITY_SPECIFICATIONS.md) for the newly worded, standardized contracts and explicit adaptations. All 16 proposed adapted entry programs have passing real-Java evidence for the earlier proposed contracts. Subsequent demo authorization was limited to sufficiently clear activities: Circle2 (Exercise 3), Exercise5 (Exercise 5) and Dispenser (Exercise 7) are now published in the synthetic local demo class, with a separate arithmetic rehearsal copy. Authenticated local API/worker and actual frontend workflow evidence is recorded in I2.1.md; this does not approve the remaining academic ambiguities or the superseded fixed-card policy.

## Adaptation policy

Use newly worded activity specifications preserving the programming objectives. Keep a reference to the original exercise number. Omit personal-name/date blanks, IDE setup, electronic-folder submission instructions and unrelated reading material. Retain mathematical assumptions and meaningful constraints.

Record changes explicitly. Do not silently change a hardcoded-value exercise into an input exercise, repair an ambiguous requirement, or replace an open-ended output task with a fixed answer.

For Projex copies:

- Keep the selected entry class and matching `.java` filename. Omit `package exercises.prelim;`: the current runner launches an unqualified class.
- Separate stdin values from stdout. Terminal-echoed keyboard input is not program output.
- Specify whether prompts belong in expected output; do not mix prompt-free cases with prompt-printing source.
- Specify numeric precision and whitespace in adapted activities. Existing comparison preserves spaces and internal blank lines; one final newline is tolerated, while an empty string and a blank line remain distinct.
- Fix input domains for normal valid cases before producing hidden cases. Do not penalize unspecified handling of zero divisors, invalid withdrawals, or non-real quadratic roots.
- Treat compiler/timeout/runtime failure probes as system-validation cases, distinct from the instructor's original exercise requirements.
- Verify PDF rendering before copying spacing-sensitive samples. Text extraction can lose alignment and mathematical notation.

## Candidate inventory

| Exercise | Observed topic | Suitable validation | Adaptation or question |
| --- | --- | --- | --- |
| 1 | Console output; customized calling card | Successful compilation/execution and nonempty output for the execution component; Instructor review for other objectives | Julius rejected the fixed-card adaptation; personalized output requires a new acceptance policy, pending implementation-boundary approval |
| 2 | Assigned values, types, geometry | Arithmetic and multiple independent activity records | Preserve assigned-value objective; separate circle, rectangle, square and triangle tasks |
| 3 | Math.PI and Math.sqrt | Floating-point arithmetic | Visually verified circle-radius and right-triangle-hypotenuse tasks; explicit two-decimal contracts |
| 4 | Scanner input and geometry | Multiple input cases, input ordering | Convert terminal transcripts to explicit stdin/stdout; retain chosen prompt convention |
| 5 | Three-number arithmetic | Integer versus floating division, formatted averages | Specify nonzero divisors and output labels for added statements |
| 6 | Store checkout, discount and change | Decimal formatting, zero discount, exact payment | Strong first end-to-end candidate; explicitly choose prompt-free adapted output |
| 7 | ATM denomination breakdown | Integer division and remainder | Table visually verified; replaced with explicit single-space fields; valid multiples of 100 |
| 8 | Quadratic roots | Math.sqrt, formatted results | Sample/starter inconsistency visually confirmed; explicit two-root output replaces both layouts; valid-domain restrictions recorded |
| 9 | Weighted grade average and threshold | Boundary cases below/at/above 85 | Use synthetic grade values; do not present the exercise's threshold as an institutional policy |

## First adapted candidate: checkout arithmetic

Adapted activity title: Store checkout calculation.

Entry class: `AlingNenaStore`.

Read five lines: product name, positive integer quantity, unit price, integer discount percentage from 0 to 100, and cash tendered. Compute gross purchase, discount amount, amount due and change. Cash covers the amount due. Print four labeled lines, each amount with two decimal places and a decimal point. No input prompts in this adapted version.

The prompt-free format and explicit decimal rendering are validation adaptations. They do not claim to reproduce the original console layout.

Example input:

```text
notebook
4
12.50
20
100.00
```

Expected output:

```text
Total Purchase Amount: 50.00
Total Discount: 10.00
Amount To Be Paid: 40.00
Change: 60.00
```

Zero discount, exact cash, single item and full discount cases were independently calculated and all five passed through the existing Java runner with the synthetic reference in `server/tests/java/fixtures/AlingNenaStore.java`. Wrong arithmetic and unwanted prompts failed comparison; missing semicolon produced a sanitized class-specific compiler diagnostic; packaged source compiled but could not launch; a deliberate arithmetic exception was classified as runtime error. These are isolated runner results, not real Run/Submit/review/release evidence.

The rendered handout's prose says cash covers gross purchase, while its exact-payment example covers the discounted amount. The adapted contract explicitly follows the example. Exact domains and calculation/formatting conventions are in the specifications document.

## Visual review evidence

Page counts by exercise: 4, 6, 2, 3, 2, 2, 2, 2, 3 (26 total). Poppler rendered every page; the renderer emitted fallback-font warnings, but the reviewed mathematical expressions, exercise statements and relevant sample tables were legible. No alignment-sensitive original transcript was copied as a test oracle. The standalone `pdftotext` command was unavailable during this continuation; visual review used rendered pages rather than claiming a new extraction pass. Existing artifacts were preserved.

Other explicit findings: Exercise 4 prints a capitalized package keyword and typographic quotes; its triangle input omits the earlier given hypotenuse. The adaptation omits package syntax and derives the hypotenuse. Exercise 5's added statements have unspecified labels; the contract now defines them. Exercise 9 retains ten weighted grade/unit pairs and the threshold comparison, with neutral synthetic output.

## Source references

- `server/src/infrastructure/java/java-runner.ts`: source filename, compilation and class invocation.
- `server/src/modules/activities/activity.schemas.ts`: activity entry-class contract.
- `server/src/modules/submissions/submission.schemas.ts`: source length limit.

## Publication readiness

The reference solutions and literal output fixtures validate proposed adaptations, not unmodified original assignments. All need acceptance of the common prompt-free output, numeric precision, input-domain and package-removal conventions before publication. Coverage is representative, not exhaustive.

| Exercise | Real-Java positive cases | Readiness after common conventions are approved | Remaining decision |
| --- | --- | --- | --- |
| 1 | 1 superseded fixed-output fixture | Blocked on approved product extension | Personalized output accepted; implement execution/nonempty-output policy after approval and validate new cases; clarify whitespace-only stdout |
| 2 | 4 across four entry programs | Ready for draft preparation | Confirm synthetic assigned dimensions and labeled output |
| 3 | 2 across two entry programs | Ready for draft preparation | Confirm synthetic 5/12 triangle and labeled output |
| 4 | 8 across four entry programs | Circle/rectangle/square ready; triangle conditional | Approve deriving hypotenuse from base/height |
| 5 | 2 | Ready for draft preparation | Positive/negative division verified; initial nonzero-divisor domain |
| 6 | 5 | Conditional | Approve cash covering discounted due, following sample 3 rather than conflicting prose |
| 7 | 3 | Ready for draft preparation | Confirm simplified denomination table and valid-multiple domain |
| 8 | 3 | Conditional | Approve two labeled root lines replacing inconsistent sample/starter layouts; initial real-root domain |
| 9 | 4 | Ready for draft preparation | Below/at/above threshold and unequal weights verified; neutral synthetic output |

There are 32 positive cases across 16 entry programs. A separate authorized synthetic local demo class now contains the selected Circle2, Exercise5 and Dispenser activities plus an arithmetic rehearsal copy; the remaining candidates were not published. Instructor review is still required for learning objectives (types, Scanner, Math and algorithm choice) that output comparison alone cannot prove.

These counts describe the earlier fixture set, including the superseded fixed-card reference. They do not prove the revised Exercise 1 acceptance policy. Personalized calling-card content is now the accepted direction; automatic execution credit and independent Instructor reruns require a separately approved bounded product/schema extension. Exercises 2-9 remain unchanged.

## Acceptance evidence still needed

The selected synthetic demo and authenticated Instructor/Student browser walkthrough are complete, as recorded in [I2.1.md](I2.1.md). Publication approval for the remaining academic adaptations is still needed. API/queue/worker coverage, immutable attempt evidence, LATEST/HIGHEST, review/release privacy, close/reopen and deadline checks passed in guarded projex_test.
