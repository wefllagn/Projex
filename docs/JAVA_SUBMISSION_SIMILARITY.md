# Basic Java source similarity

## Chapter 1 · Scope and objective

Origin gives primary instructors and active co-instructors a review aid for official Java submissions in one programming activity. From **Submitted code**, select **Compare Submissions** to compare the open attempt with each other student's latest accepted attempt. The panel shows up to five ranked matches and links to their existing submission reviews. Code similarity does not establish plagiarism. Grades, feedback and assessment jobs are independent of the comparison.

## Chapter 2 · Comparison method and limitations

The method is lexical overlap, identified as `java-token-jaccard-v1`. The scanner ignores comments and formatting outside literals. It preserves identifiers, operators and literals. It removes leading package and import declarations, then collects unique sequences of five consecutive tokens. Sequences found in the published starter code or the supported common `main` scaffolds are excluded from both sides.

The percentage is 100 × the number of shared distinct sequences divided by the number of distinct sequences in the union. Both sides need at least 20 remaining distinct sequences. The interface shows the shared count and union alongside the percentage. The window size and minimum are implementation parameters for this review aid. They have no interpretation as plagiarism thresholds.

Similar independent solutions can overlap substantially on constrained exercises. Renaming or rearranging code can lower overlap. Starter exclusion can also remove genuine shared code. The scanner withholds scores for unsupported lexical forms such as Java Unicode escapes and text blocks, and for obvious incompleteness such as unclosed comments, literals or delimiters. It does not validate all Java syntax or compare program behavior.

Background reading includes [Java lexical structure](https://docs.oracle.com/javase/specs/jls/se17/html/jls-3.html), [token sequences and Jaccard overlap in source comparison](https://www.mdpi.com/2227-7102/13/1/54), and [common base code in JPlag](https://github.com/jplag/JPlag).

## Chapter 3 · Implementation and evaluation

The instructor-only API reads immutable official source for the selected activity in a read-only transaction. It selects the latest attempt number per peer, excludes the selected student's other attempts, and ranks eligible matches by exact overlap ratio with submission ID as the tie-breaker. A match response includes its identity, attempt and overlap counts. Opening a linked attempt goes through the existing review authorization.

Comparison is on demand and ephemeral. Each process allows two concurrent comparisons and the route allows six requests per instructor per minute. A request is limited to 100 peers, 512 KiB of source and starter input, and 50,000 lexical tokens. Workload-limit responses withhold the ranking. No database migration is required.

Use synthetic Java examples to demonstrate a formatting-equivalent match, a changed solution, an independently different solution, and a starter-only or short program. Verify the authorization matrix and that comparison leaves stored academic records intact. The automated checks cover scope, deterministic ranking, low-evidence states, and workload bounds. These checks validate the implemented indicator, rather than measuring real-world plagiarism detection accuracy.
