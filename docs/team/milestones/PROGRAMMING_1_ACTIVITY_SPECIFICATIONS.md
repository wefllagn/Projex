# Programming 1 adapted activity specifications

Prepared for I2.1 validation; evidence updated 2026-09-18. These are newly worded specifications, not copies of the original handouts. All 26 pages across the nine original PDFs were previously rendered and visually inspected; ambiguous pages were rechecked. Originals remain unchanged outside Git. All 16 proposed entry programs now pass real-Java checks using 32 positive literal input/output fixtures. This does not settle academic ambiguities or authorize publication of the whole inventory. The subsequent bounded demo-preparation authorization and actual small demo class are recorded below.

Julius's subsequent clarification supersedes the former fixed-card Exercise 1 adaptation. The earlier 16-program/32-case evidence includes that superseded exact-output fixture; it does not validate the revised open-ended grading policy. Independent Instructor review reruns received bounded implementation approval on 2026-09-22 but remain unimplemented at this evidence snapshot; Exercise 1's comparison policy remains a separate implementation decision. Exercises 2-9 are unchanged.

## Common activity contract

### Authorized small demonstration subset, 2026-09-18

Following Julius's explicit authorization to prepare clear exercises for today's demonstration, the local synthetic Instructor created `Programming 1 Prelims Demo` through the existing class API. The existing synthetic Student accepted its class invitation through the existing acceptance API; no account was created or reset. Three presentation activities were configured and published: Exercise 3's `Circle2`, Exercise 5's `Exercise5`, and Exercise 7's `Dispenser`. A separate `REHEARSAL - Three-number arithmetic` activity isolates validation attempts from the main presentation records.

The selected activities state their prompt-free labeled output, two-decimal formatting, valid input domain, Java entry class and no-package contract explicitly. Their arithmetic requirements follow the source handouts; standardized console layout is disclosed as a demonstration adaptation, not claimed as the original handout's verbatim layout. No ambiguous triangle, checkout, quadratic-root or personalized calling-card decision was resolved by this preparation. Other candidates remain uncreated.

Each activity has 100 total points, 80 available automated points, up to 20 Instructor-reviewed points, three ordinary attempts and a deadline 30 days after creation. `Dispenser` uses HIGHEST; the circle and arithmetic activities use LATEST. Published starters contain an incomplete entry method, not a solution. Presenter-only reference Java files under untracked `output/prelims-demo/` are not activity starters; all three were independently compiled and executed against six existing literal cases using the bounded runner and temporary-only storage.

Use Run Visible Tests for repeat rehearsals without consuming official attempts. Validation used two official attempts on the rehearsal copy only; both were reviewed and released at 90/100. The three presentation activities have no submissions and retain all three attempts. Do not delete, reset or overwrite either rehearsal history or older records. Further official rehearsals need deliberate allocation of the remaining rehearsal attempt or separately authorized new copies.

Use Java 17, one public entry class with the listed name, and the matching UTF-8 `.java` filename. Omit package declarations. Include a `public static void main(String[] args)` method. Use meaningful variables and briefly explain the algorithm in comments without personal information. Output checks cannot prove use of appropriate types, `Scanner`, `Math`, or an algorithm: instructor source review remains necessary.

For deterministic Exercises 2-9, every output line below uses exactly one space after a colon, no trailing spaces, and no extra blank lines. Decimal results use a dot, exactly two fractional digits, and no grouping separators; use a fixed locale when formatting. Print only the specified output, without input prompts or echoed input. Numeric inputs are ordinary base-10 values. One final newline is optional under the current comparator; additional whitespace is significant. Initial tests avoid halfway rounding ambiguities. Exercise 1 has personalized output and is exempt from the shared exact-output layout.

These precision, whitespace, prompt-free and bounded-domain choices are explicit Projex adaptations. Each row is a separate activity record, preserving single-file assessment. Runtime input is introduced only where the original exercise requests it. Starter source should contain an empty entry method and original guidance, not complete solutions copied from the handouts.

## Exercise 1: console output and program structure

Entry class: `Exercise1`. No stdin. Write a Java program that prints a personalized calling card using output statements. Students may choose text and layout; no identical fictional card or exact expected-output string is required. Synthetic personal details are acceptable for the demonstration. Keep the original emphasis on introductory program structure and case-sensitive Java syntax.

Approved product direction: full marks for the automated execution component when compilation succeeds, execution terminates successfully within existing limits, and stdout is nonempty. Compile errors, nonzero process exit, timeout, output overflow and empty stdout do not satisfy this component. This is not full marks for the entire activity. Whitespace-only output is an unresolved detail: Julius specified nonempty; rejecting whitespace-only output additionally requires his confirmation. Do not silently substitute a trimmed-output predicate.

| Original learning objective | Legitimate evidence |
| --- | --- |
| Create source using the prescribed IntelliJ IDEA IDE | Instructor observation or external demonstration; import/source alone cannot establish IDE use |
| Compile Java into bytecode using IntelliJ IDEA | Worker compilation proves compilability, not use of IntelliJ; IDE-specific skill remains Instructor-reviewed |
| Run the compiled program using IntelliJ IDEA | Worker execution proves runtime success, not use of IntelliJ; IDE-specific skill remains Instructor-reviewed |
| Describe executable Java program structure | Instructor asks for an explanation; compiling a main method is only partial evidence |
| Apply System.out.println | Instructor source review verifies use; output alone could come from other output methods |
| Explain Java case sensitivity | Instructor explanation/oral check; a successful run does not prove understanding |

Use the existing automated/instructor point split, review draft and explicit release workflow for the two components. The point allocation remains an Instructor configuration decision. Source review and oral/observed evidence may inform Instructor points and feedback; do not add claims that Projex automatically verifies those objectives. No new rubric engine, student explanation-upload feature or IDE telemetry is proposed.

Current implementation gap: existing test cases require exact expected output, and publication requires a visible case with a positive combined automated-point total. There is no successful-execution/nonempty-output grading mode or manual-only publication mode. Wildcards, empty expected output and fake common calling cards are not substitutes. A bounded comparison-policy extension must be approved before implementation and publication of this revised activity.

Retain introductory guidance or an incomplete entry-method starter without supplying the full calling-card solution. An intentionally missing semicolon remains a diagnostics probe, not an assignment requirement.

## Exercise 2: assigned values and primitive arithmetic

Keep values assigned in source; do not read stdin. Compute the requested values using variables. Each `;` in the output column below denotes a newline, not an output character.

| Entry class | Assigned values | Required stdout, in order |
| --- | --- | --- |
| `Circle` | integer radius 10; pi = 3.1416 | `Radius: 10`; `Circumference: 62.83`; `Area: 314.16` |
| `Rectangle` | length 8, width 5 | `Length: 8.00`; `Width: 5.00`; `Perimeter: 26.00`; `Area: 40.00` |
| `Square` | side 6 | `Side: 6.00`; `Perimeter: 24.00`; `Area: 36.00` |
| `RightTriangle` | base 3, height 4, hypotenuse 5 | `Base: 3.00`; `Height: 4.00`; `Hypotenuse: 5.00`; `Perimeter: 12.00`; `Area: 6.00` |

Use circumference = 2*pi*radius, area of circle = pi*radius*radius, rectangle perimeter = 2*(length+width), square perimeter = 4*side, triangle perimeter = base+height+hypotenuse, triangle area = base*height/2.0. Adaptations: radius 10 and pi 3.1416 come from the original example; the other assigned dimensions are synthetic choices where the original leaves values open. Decorative borders are replaced by labeled lines. Fixed two-decimal formatting resolves the original default floating-point rendering and optional Math.PI variation.

## Exercise 3: Math.PI and Math.sqrt

Preserve assigned values and use `Math` operations. No stdin.

| Entry class | Task | Required stdout |
| --- | --- | --- |
| `Circle2` | Assign area 100.0 and compute sqrt(area/Math.PI). | `Area: 100.00`; `Radius: 5.64` |
| `RightTriangle2` | Assign base 5 and height 12; compute sqrt(base*base+height*height). | `Base: 5.00`; `Height: 12.00`; `Hypotenuse: 13.00` |

Adaptations: area 100.0 is retained. Base 5 and height 12 are synthetic assigned values; output labels and precision replace an open output layout. Do not introduce Scanner input into these activities.

## Exercise 4: Scanner input and geometry

Read the listed values, each on its own line, through `Scanner`. Positive integer dimensions are limited to 1..1000 for initial validation. Use `Math.PI` for the circle and `Math.sqrt` for a triangle hypotenuse derived from its two input legs.

| Entry class | Stdin order | Required stdout labels, in order | Sample stdin | Sample stdout values in label order |
| --- | --- | --- | --- | --- |
| `Circle3` | radius | Radius (integer), Circumference, Area | `2` | 2, 12.57, 12.57 |
| `Rectangle3` | length, width | Length, Width, Perimeter, Area | `8;5` | 8.00, 5.00, 26.00, 40.00 |
| `Square3` | side | Side, Perimeter, Area | `6` | 6.00, 24.00, 36.00 |
| `RightTriangle3` | base, height | Base, Height, Hypotenuse, Perimeter, Area | `3;4` | 3.00, 4.00, 5.00, 12.00, 6.00 |

Each label uses `Label: value`; semicolons in sample stdin mean newlines. Adaptations: prompts and decorative blank lines/borders are removed; typed input belongs only to stdin. Circle's original integer radius is retained. Other dimensions receive explicit integer domains. The original triangle instruction requests only base and height while inheriting an earlier three-dimension perimeter calculation; deriving the hypotenuse with Math.sqrt explicitly resolves that omission. The printed capitalized `Package` and typographic quotes are not retained as Java syntax.

## Exercise 5: integer and floating-point arithmetic

Entry class: `Exercise5`. Read three integers n1, n2, n3, one per line, in -100..100. Require n2 and n3 nonzero. Calculate sum, integer and floating n1/n2, product, integer and floating (n1+n2)/n3, average of all three, and each square. Integer division truncates toward zero; cast before division for decimal results.

For stdin `7`, `2`, `3` on separate lines, exact stdout is:

```text
Numbers: 7 2 3
Sum: 12
Integer quotient: 3
Decimal quotient: 3.50
Product: 42
Sum integer quotient: 3
Sum decimal quotient: 3.00
Average: 4.00
Squares: 49 4 9
```

Adaptations: all original arithmetic tasks are retained. Unified labels replace the starter's prose and unspecified labels for added statements. Two decimal places are retained for the average and newly specified for both decimal quotients. Valid domains avoid zero divisors and integer overflow; unspecified invalid-input handling is not graded.

## Exercise 6: store checkout (first execution case)

Entry class: `AlingNenaStore`. Read five lines: product description (1..80 characters), integer quantity (1..1000), unit price (0.01..1000.00), integer discount percentage (0..100), and cash tendered (0..1000000.00). Prices and cash have at most two decimals. One product type is purchased. Cash must cover the discounted amount due. Calculate gross = quantity*price, discount = gross*percentage/100, due = gross-discount, change = cash-due. Calculate without intermediate rounding; format the four outputs to two decimal places. Initial cases have exact cent-valued results.

For stdin `notebook`, `4`, `12.50`, `20`, `100.00` on separate lines:

```text
Total Purchase Amount: 50.00
Total Discount: 10.00
Amount To Be Paid: 40.00
Change: 60.00
```

Use those four labels in that order for every case. Further independently calculated fixtures:

| Purpose | Product / quantity / price / discount / cash | Gross / discount / due / change |
| --- | --- | --- |
| No discount | pencil / 3 / 2.25 / 0 / 10.00 | 6.75 / 0.00 / 6.75 / 3.25 |
| Exact payment | folder / 2 / 15.00 / 10 / 27.00 | 30.00 / 3.00 / 27.00 / 0.00 |
| Single item | eraser / 1 / 8.00 / 25 / 10.00 | 8.00 / 2.00 / 6.00 / 4.00 |
| Full discount | paper / 5 / 2.00 / 100 / 0.00 | 10.00 / 10.00 / 0.00 / 0.00 |

Adaptations: prompts, console echo, inconsistent sample spacing and personal boilerplate are removed. Zero discount is explicitly supported by the original. The original prose says cash covers the total purchase, but its third sample pays exactly the discounted amount; this specification follows that sample and records the discrepancy. The numeric bounds, product length and rounding convention are added. Full-discount zero-payment tests follow the adapted discounted-amount rule.

## Exercise 7: ATM denomination arithmetic

Entry class: `Dispenser`. Read one integer amount, a positive multiple of 100 no greater than 1000000. Dispense the smallest number of bills using denominations 1000, 500 and 100, with enough bills available. Calculate counts through integer division and remainder, then show each denomination's amount and totals.

For stdin `2700`, stdout is:

```text
1000: 2 2000.00
500: 1 500.00
100: 2 200.00
Total: 5 2700.00
```

Adaptations: the original aligned table is replaced by exact one-space fields: denomination, count, amount; then total count and total amount. Prompts and table rules are removed. The domain excludes unsupported denominations, negative withdrawals and invalid input rather than inventing penalties for them.

## Exercise 8: quadratic roots

Entry class: `QuadraticSolver`. Read coefficients a, b, c on separate lines. Initial cases use integers in -100..100, a != 0, b*b-4*a*c >= 0, and nonzero roots (avoiding signed-zero formatting ambiguity). Compute root1 = (-b+sqrt(b*b-4*a*c))/(2*a), then root2 using minus. Do not sort the roots.

For stdin `1`, `-5`, `6` on separate lines:

```text
Root 1: 3.00
Root 2: 2.00
```

Also cover repeated roots: 1, -4, 4 produces 2.00 for both. Adaptations: the rendered sample includes a quadratic expression, whereas the starter format omits parts of that expression and formats coefficients differently. Two labeled root lines resolve this discrepancy explicitly. Introductory output and prompts are removed. Coefficient/domain bounds are new; complex, linear and signed-zero cases are excluded from this initial contract.

## Exercise 9: weighted average and a synthetic threshold

Entry class: `GradeAverage1`. Read exactly ten pairs of integer grade and units, grade then units, each value on its own line. Grades are 0..100 and units 1..6. Compute sum(grade*units)/sum(units) using floating-point division. Compare the unrounded average with 85. This is the exercise's synthetic threshold, not a statement of institutional grading policy.

Print `Average: value` with two decimal places, then `Threshold met: yes` when average >= 85, otherwise `Threshold met: no`. Ten pairs of 85 and 1 produce:

```text
Average: 85.00
Threshold met: yes
```

Test below/at/above 85 and unequal unit weights. A useful weighting case is nine pairs of 80 and 1 plus one pair of 100 and 3: average 85.00, threshold met. Adaptations: prompts, personal context and congratulatory/apologetic prose are replaced by neutral output. Ten subjects, weighting and the >=85 condition remain. Two-decimal display, valid ranges and comparison-before-rounding are now explicit. The handout's repeated input approach remains acceptable; loops are not required for this introductory if-statement activity.

## Historical validation and publication plan

The initial plan was to use Exercise 6 first to prove the assessment path, then sample fixed-output, geometry, division, weighted threshold and quadratic cases. Later authorization instead selected a smaller deterministic demo: Circle2, Exercise5 and Dispenser, plus a rehearsal copy. Separate system probes cover wrong output, compile error, runtime error, timeout and whitespace behavior; they do not become hidden requirements for student assignments. Further normal database actions require their own authorization.

For the live workflow: create an adapted draft with visible cases, set three attempts and LATEST, publish with a future deadline, run without consuming an attempt, submit successive correct/wrong variants, review and release out of chronological order, and verify the credited result uses attempt chronology. Repeat with HIGHEST, including a tie; verify unreleased grades remain concealed. Close, confirm Run/Submit rejection, reopen without resetting attempts or changing the deadline, then validate expired-deadline behavior. Record actual outcomes in I2.1; this document alone is not execution evidence.

## Historical broader demo-class proposal (not fully created)

The later authorized small class is named **Programming 1 Prelims Demo** and contains only the four activities listed above. The following 16-activity plan is retained as a proposal, not a description of current database state. Use only explicitly approved synthetic accounts and supported UI/API workflows; do not change real-looking users or copy historical submissions.

### Proposed future expansion after separate academic approval

1. Resolve the remaining decisions below, approve implementation of the revised Exercise 1 execution policy, and approve the common deterministic adaptations, including synthetic values and output labels. Do not silently treat an adapted requirement as the professor's exact assignment.
2. Create one dedicated class through the normal instructor UI, and invite/join the approved synthetic student through the supported flow. Never seed normal records with direct SQL or manual Prisma edits.
3. Prepare 16 draft activities: E1; E2 circle/rectangle/square/triangle; E3 circle-radius/triangle; E4 Scanner circle/rectangle/square/triangle; E5 arithmetic; E6 checkout; E7 ATM; E8 quadratic; E9 weighted average. Prefix titles with exercise number so the catalog is easy to scan.
4. Enter newly worded instructions, empty entry-method starters, explicit stdin/stdout cases, future deadlines and appropriate point totals through supported activity/test-case forms. Do not place complete reference solutions in student starters. Choose a small representative visible/hidden case split; fixed-output activities cannot provide meaningful secret input variation, and this limitation should be explained.
5. Verify each configured draft against its reviewed specification and literal fixtures. Reuse approved reference source files through the import UI; Run Visible Tests verifies visible cases only. Use a separate rehearsal activity where an official submission is needed to validate the hidden/full grading path.
6. Publish only checked activities. Keep an untouched presentation activity for the live Submit/review/release demonstration. Use existing source snapshots and released results for repeat explanation instead of repeatedly consuming presentation attempts.
7. Record created resource IDs and preparation evidence in this milestone only after actual preparation. No success claims before those records exist.

### Rehearsal versus presentation

- Use Run Visible Tests for repeated editor/import/output demonstrations; it does not consume official attempts, but remains rate/concurrency limited.
- Use separately titled **Rehearsal - Checkout LATEST** and **Rehearsal - Checkout HIGHEST** activities if both credit policies need live demonstrations. These are proposed additional records, not part of the 16-exercise catalog until approved.
- Official Submit deliberately consumes an attempt. Review/release is persistent, and RELEASED attempts cannot be rewritten. Preserve them as evidence.
- Do not reset counts, delete attempts, create academic exceptional grants, or use infrastructure replacement grants to replenish rehearsal attempts.
- Reopen preserves the original deadline and attempt history; it is not a reset or a late window. Any later rehearsals use a newly approved activity copy created through normal supported forms rather than altering old evidence.
- Plan presentation deadlines before publication. Do not let the demo depend on a past-due activity or a prepared final submission with no remaining allowance.
- A pre-reviewed released sample is useful backup evidence, but label it as prepared data. Keep at least one presentation activity/student pairing with allowance remaining for the live workflow.

### Academic approval required

1. E1 personalized output is Julius's accepted direction, not a pending fixed-card choice. Approve the bounded implementation/schema extension for successful-execution/nonempty-output grading; clarify whether whitespace-only stdout qualifies.
2. E4 triangle: derive hypotenuse from the entered base and height using Math.sqrt?
3. E6: require cash to cover discounted amount due, following the exact-payment sample, rather than the conflicting gross-purchase prose?
4. E8: use two labeled root lines and the declared real-root domain instead of choosing between inconsistent original output layouts?

The selected small demo class and credential-authenticated walkthrough were separately authorized and completed, as recorded in I2.1.md. No additional accounts were created. Expanding to the remaining activities still requires academic decisions and explicit normal-data authorization. Revised Exercise 1 grading cannot be delivered through configuration alone. Independent Instructor reruns received bounded implementation approval on 2026-09-22 and will stop at their pre-commit review gate; neither feature is already implemented in this document's evidence snapshot.
