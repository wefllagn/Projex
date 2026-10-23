# Adviser academic dataset contract

Exactly two active Classes, five individual Java Activities and one separate
Group Project. First Semester, school year 2026–2027. The original fixture due
date is 30 October 2026, 11:59 PM PHT. Each individual Activity is published,
graded out of 100, with at most three attempts under unchanged application rules.

## Computer Programming 1 — CS101

Introduction to Java programming fundamentals, variables, primitive data types,
expressions, conditional statements, strings and basic problem solving.

1. **Prelim Programming Exercise No. 2** — Variables, Primitive Data Types,
   and Identifiers: Circle Measurements. Assigned `int radius = 10` and
   `double pi = 3.1416`; no Scanner. Output exactly `Radius: 10`,
   `Circumference: 62.83`, and `Area: 314.16`, one newline-terminated line each.
   Use two fractional digits for double results. The deterministic executable
   check is 80 points; Instructor source review is 20. Review declarations,
   assignment statements, identifiers, PascalCase/camelCase and organization.
   This is an adapted presentation exercise, not a verbatim reproduction of the
   original SLU multi-program handout.
2. **Palindrome Checker** — Scanner, strings and conditionals. Print
   `Enter a word: ` without a newline, read one word, ignore letter case, and
   print `Result: Palindrome` or `Result: Not a palindrome` plus a newline.
   Visible inputs racecar, hello and Level carry 20 points each; one synthetic
   hidden case carries 20; source review carries 20. The automatic runner does
   not echo stdin; manual Run Code accepts input after the real process starts.
3. **Student Grade Calculator** — Read three numeric quiz scores separated by
   whitespace after `Enter three quiz scores: `. Print `Average: ` with exactly
   two fractional digits, then `Status: Passed` for unrounded average >=75 or
   `Status: Failed` otherwise. Visible passing, failing and exact-threshold
   cases carry 60 points; a decimal hidden case carries 20; source review 20.

## Computer Programming 2 — CS202

Introduction to object-oriented programming using Java classes, objects,
constructors, methods and encapsulation.

1. **Classes and Objects: Student Record** — Single `Main.java` containing
   public Main and non-public Student. Private ID/name/program attributes,
   constructor, object instantiation and instance `displayInfo`. Fictional
   output lines: `Student ID: 2026-1001`, `Name: Alex Morgan`,
   `Program: BS Information Technology`. Output check 80; structural OOP review 20.
2. **Fraction Class: Basic Operations** — Single Main/Fraction arrangement,
   numerator/denominator, constructor, addition, GCD reduction, positive
   denominator and zero-denominator rejection. Output lines `First: 1/2`,
   `Second: 1/3`, `Sum: 5/6`, `Reduced: 1/2`. Output check 80; actual model,
   construction/arithmetic/reduction source review 20.

The authoritative complete instructions, starter/reference programs, exact stdout
including prompt spacing/newlines, synthetic test inputs and point weights are
in `scripts/catalog.mjs`. Those synthetic hidden cases are fixture source for
operators, not a change to Student feedback/hidden-case visibility restrictions.
The Class model has no description field, so the Class descriptions are also
included in Activity instructions without changing the schema.

## Separate Group Project

**Prelim Group Project 1 — Fraction Arithmetic**, under CS202. Fictional
Alvarez–Bennett team: Sofia Alvarez is Maintainer; Noah Bennett is Developer.
Project name **CS202AlvarezBennettPrelimGroupProject** follows the required
class-code + alphabetically ordered surnames + exact `PrelimGroupProject` suffix,
without underscores. Required package: **edu.slu.prog2.pregroup01**.

Repository source is defined in `scripts/group-source.mjs`:

```text
README.md
src/edu/slu/prog2/pregroup01/Fraction.java
src/edu/slu/prog2/pregroup01/FractionArithmetic.java
```

The executable menu enters two fractions, adds/subtracts/multiplies/divides,
displays reduced fractions and decimal values, and quits. Construction reduces
fractions and rejects a zero denominator; division rejects zero-valued divisors.
Reference arithmetic uses modest classroom integer values.

The Maintainer initializes the repository and Fraction model, the Developer
commits the arithmetic menu on a feature branch, and the Maintainer reviews and
authorizes a real fast-forward into protected main. The existing server-owned
Git author identities must be preserved. Group editing is collaboration, not
individual Activity execution or official Group automated grading.

## Intended starting states and fictional identities

| Work | Primary Student starting state |
| --- | --- |
| Circle Measurements | Accepted, reviewed, released 100/100 |
| Palindrome | Published, zero official attempts; live demonstration path |
| Grade Calculator | Published, unsubmitted |
| Student Record | Accepted and automatically assessed, awaiting review |
| Fraction Class | Accepted, reviewed, released 100/100 |
| Group Project | Active two-person team with genuine Git history |

Five fictional login addresses: `instructor@origin.test`, `student@origin.test`,
`leader@origin.test`, `member@origin.test`, `admin@origin.test`. Display names:
Dr. Elena Cruz, Alex Morgan, Sofia Alvarez, Noah Bennett and Claire Reyes.
Passwords, populated account records, submission IDs, grades stored in the live
database and actual managed Git objects are excluded from this source bundle.

Completed examples must result from real compilation, accepted submission,
automatic assessment and Instructor review/release. Run Code, visible tests and
Save to Git remain independent and consume no official attempt. A submitted
Activity may be locked in the current Student UI; never bypass that rule to
stage another demonstration. Use a separate restore or another eligible account.
