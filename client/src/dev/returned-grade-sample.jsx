import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { StudentSubmissionRecord } from '../submissions/StudentSubmissionViews.jsx'
import { projectStudentSubmission } from '../submissions/submission-projections.js'
import '../index.css'
import '../App.css'
import '../instructor-overhaul.css'
import '../design/academic-refinement.css'

// Standalone Vite development entry. Fictional display data, no API or mutation.
const record = projectStudentSubmission({
  id: 'design-sample-submission', activityId: 'design-sample-activity', activityTitle: 'Hello, Projex! · Graded practice',
  attemptLabel: 'Attempt 1', submittedAt: '2026-10-23T01:30:00.000Z', status: 'released', gradeStatus: 'released', gradingMode: 'GRADED',
  finalScore: 92, totalPoints: 100, isCreditedResult: true,
  feedback: 'Your program produces the correct greeting and uses a clear entry point. For your next activity, use consistent indentation and choose descriptive variable names.',
  sourceCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Projex!");\n    }\n}',
  visibleTestOutcomes: [{ name: 'Greeting example', order: 1, outcome: 'passed', expectedOutput: 'Hello, Projex!', actualOutput: 'Hello, Projex!', executionTimeMs: 12 }],
})

if (import.meta.env.DEV) createRoot(document.getElementById('root')).render(
  <MemoryRouter><main className="projex-academic-shell returned-grade-sample">
    <header><div><h1>Student · Returned activity</h1><p>Fictional UI sample. No submission, assessment, or grade was created.</p></div><a className="student-outline-action" href="/student">Back to Projex</a></header>
    <div className="student-class-content"><StudentSubmissionRecord record={record} activity={{ creditPolicy: 'LATEST' }} /></div>
  </main></MemoryRouter>,
)
