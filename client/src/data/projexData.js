export const roles = [
  {
    id: 'student',
    label: 'Student View',
    path: '/student',
    person: 'Alyssa Mendoza',
    description:
      'Work on programming activities, one locked submission, enrolled classes, and team repositories.',
  },
  {
    id: 'instructor',
    label: 'Instructor View',
    path: '/instructor',
    person: 'Engr. Marco Rivera',
    description:
      'Manage deadlines, rosters, invitations, checking, submissions, feedback, and project teams.',
  },
  {
    id: 'admin',
    label: 'Admin View',
    path: '/admin',
    person: 'SLU Academic Systems Admin',
    description:
      'Manage users, courses, enrollments, instructor assignments, repositories, storage, and archives.',
  },
]

export const courseOptions = [
  'CS 111 - Introduction to Programming',
  'CS 122 - Data Structures',
  'IT 212 - Web Systems and Technologies',
  'CS 321 - Software Engineering',
]

export const sectionOptions = ['BSCS 1A', 'BSIT 2A', 'BSCS 3B', 'Capstone 4A']

export const activitySummaries = [
  {
    id: 'act-loops-01',
    title: 'Loop Patterns and Input Validation',
    deadline: '2026-07-03 17:00',
    status: 'Published',
    dueStatus: 'Due Soon',
    submissionRule: 'One submission only',
    submittedAt: null,
    submitState: 'Open',
    mockTests: '2/3 visible tests passing',
    gradeStatus: 'Not graded',
    feedbackStatus: 'No feedback yet',
    studentReviewLabel: 'Under Review',
  },
  {
    id: 'act-arrays-02',
    title: 'Student Grade Analyzer',
    deadline: '2026-06-21 23:59',
    status: 'Grading',
    dueStatus: 'Submitted',
    submissionRule: 'One submission only',
    submittedAt: '2026-06-21 20:14',
    submitState: 'Submitted - Locked',
    mockTests: '3/3 visible tests passed',
    gradeStatus: 'Checked',
    feedbackStatus: 'Feedback released',
    studentReviewLabel: 'Checked',
  },
  {
    id: 'act-files-04',
    title: 'CSV Enrollment Parser',
    deadline: '2026-06-18 17:00',
    status: 'Closed',
    dueStatus: 'Missing',
    submissionRule: 'One submission only',
    submittedAt: null,
    submitState: 'Closed - Not Submitted',
    mockTests: 'No submitted code',
    gradeStatus: 'Missing',
    feedbackStatus: 'No feedback',
    studentReviewLabel: 'Needs Instructor Review',
  },
]

export const routeCatalog = [
  {
    ...roles[0],
    routes: [
      {
        path: 'classes',
        label: 'My Classes',
        group: 'Class Membership',
        status: 'Backend connected',
        summary:
          'Authorized active and archived classes use server-owned IDs and student-safe projections; join codes are never exposed.',
      },
      {
        path: 'todo',
        label: 'To-do',
        group: 'Student Shell',
        status: 'Shell ready',
        summary:
          'Standalone student to-do list grouped by due window with hardcoded activity, project, and repository work.',
      },
      {
        path: 'join-class',
        label: 'Join Class',
        group: 'Class Membership',
        status: 'Backend connected',
        summary: 'Student joins an active class through the server-owned class-code workflow.',
      },
      {
        path: 'invitations',
        label: 'Class Invitations',
        group: 'Class Membership',
        status: 'Deferred',
        summary:
          'Class invitations remain a recognized feature without an approved backend workflow.',
      },
      {
        path: 'people',
        label: 'People',
        group: 'Class Membership',
        status: 'Backend connected',
        summary:
          'Student-facing class people tab with instructors and classmates for the selected section.',
      },
      {
        path: 'activity',
        label: 'Activity Mode',
        group: 'Activity Mode',
        status: 'Backend connected',
        summary:
          'Authorized programming activities for the selected class with truthful lifecycle and deadline state.',
      },
      {
        path: 'activity/:activityId',
        label: 'Selected Activity',
        group: 'Activity Mode',
        status: 'Backend connected',
        summary:
          'Dynamic repository-backed activity detail with visible-test examples and no hidden-test leakage.',
      },
      {
        path: 'activity/:activityId/workspace',
        label: 'Coding Workspace',
        group: 'Activity Mode',
        status: 'Backend connected',
        summary:
          'Real activity-backed source editing, visible-test practice, and immutable official submission.',
      },
      {
        path: 'activity/:activityId/submissions',
        label: 'Activity Submissions',
        group: 'Activity Mode',
        status: 'Backend connected',
        summary:
          'Bounded per-activity attempt history using backend-provided attempt and replacement labels.',
      },
      {
        path: 'activity/:activityId/submissions/:submissionId',
        label: 'Submission Detail',
        group: 'Activity Mode',
        status: 'Backend connected',
        summary:
          'Canonical student-safe submission record with visible outcomes and released result when available.',
      },
      {
        path: 'activity/:activityId/submission-record',
        label: 'Submission Record',
        group: 'Activity Mode',
        status: 'Redirect',
        summary:
          'Legacy route redirected to canonical per-activity submission history.',
      },
      {
        path: 'submissions',
        label: 'My Submissions',
        group: 'Activity Mode',
        status: 'Shell ready',
        summary:
          'Submitted Activities across classes. Records are final, not repeated attempts.',
      },
      {
        path: 'activity/:activityId/feedback',
        label: 'Feedback and Grade',
        group: 'Activity Mode',
        status: 'Redirect',
        summary: 'Legacy route redirected to released feedback within a canonical submission record.',
      },
      {
        path: 'projects',
        label: 'Project Collaboration Mode',
        group: 'Project Collaboration Mode',
        status: 'Backend connected',
        summary:
          'Published and closed class project requirements with authorized repository summaries.',
      },
      {
        path: 'projects/:projectTaskId',
        label: 'Selected Group Project',
        group: 'Project Collaboration Mode',
        status: 'Backend connected',
        summary:
          'Selected project requirement with real deadline, team-size limit, lifecycle, and eligible repository creation.',
      },
      {
        path: 'projects/:projectTaskId/repository',
        label: 'Team Repository Workspace',
        group: 'Project Collaboration Mode',
        status: 'Compatibility route',
        summary:
          'Identifier-less route that directs the student to choose an authorized repository record.',
      },
      {
        path: 'projects/:projectTaskId/repositories/:repositoryId',
        label: 'Project Repository',
        group: 'Project Collaboration Mode',
        status: 'Backend connected',
        summary: 'Authorized repository metadata, collaboration, review, released feedback, and lifecycle state; Git inspection remains deferred.',
      },
      {
        path: 'projects/:projectTaskId/repositories/:repositoryId/contributions',
        label: 'Contribution Tracking',
        group: 'Project Collaboration Mode',
        status: 'Placeholder',
        summary: 'Personal and team contribution balance for the project repository.',
      },
      {
        path: 'repositories',
        label: 'My Repositories',
        group: 'Project Collaboration Mode',
        status: 'Backend connected',
        summary:
          'Authorized class-project and personal repository catalog with real received invitations, creation, and provisioning states.',
      },
      {
        path: 'repositories/:repositoryId',
        label: 'Repository Metadata',
        group: 'Project Collaboration Mode',
        status: 'Backend connected',
        summary: 'Canonical personal or class repository metadata, collaboration/review state, lifecycle controls, and server-owned provisioning state.',
      },
      {
        path: 'analytics',
        label: 'Learning Analytics',
        group: 'Learning',
        status: 'Deferred',
        summary: 'Topic progress, test pass rate, late work, feedback trend, and risk signals.',
      },
      {
        path: 'archive',
        label: 'Archived Projects',
        group: 'Preservation',
        status: 'Backend connected',
        summary: 'Authorized archived repository records; related project detail is shown only when the backend permits it.',
      },
      {
        path: 'settings',
        label: 'Settings',
        group: 'Student Shell',
        status: 'Placeholder',
        summary:
          'Student shell settings entry retained as a placeholder in the hardcoded prototype.',
      },
    ],
  },
  {
    ...roles[1],
    routes: [
      {
        path: 'classes',
        label: 'My Classes',
        group: 'Class Management',
        status: 'Backend connected',
        summary:
          'Owned active and archived classes use server-owned IDs; unsupported stream behavior is explicitly deferred.',
      },
      {
        path: 'people',
        label: 'People',
        group: 'Class Management',
        status: 'Backend connected',
        summary:
          'Detailed owned-class roster with server-authorized membership removal and reactivation.',
      },
      {
        path: 'class-info',
        label: 'Class Info',
        group: 'Class Management',
        status: 'Backend connected',
        summary:
          'Supported class metadata editing plus archive and restore lifecycle controls.',
      },
      {
        path: 'roster',
        label: 'Class Roster',
        group: 'Class Management',
        status: 'Backend connected',
        summary:
          'Detailed active and removed membership records for the selected owned class.',
      },
      {
        path: 'invite-students',
        label: 'Invite Students',
        group: 'Class Management',
        status: 'Deferred',
        summary: 'Invite-by-email is not implemented; instructors may share an active server-owned join code externally.',
      },
      {
        path: 'class-code',
        label: 'Class Code',
        group: 'Class Management',
        status: 'Backend connected',
        summary: 'View active state, copy only a usable code, rotate, and revoke the server-owned class join code.',
      },
      {
        path: 'review-queues',
        label: 'Review Queues',
        group: 'Activity Mode',
        status: 'Backend gap',
        summary:
          'Cross-class review aggregation requires a separately approved bounded read contract; no fake counts are shown.',
      },
      {
        path: 'activity',
        label: 'Activity Management',
        group: 'Activity Mode',
        status: 'Backend connected',
        summary:
          'Repository-backed activity authoring, validation, pagination, and lifecycle management for the selected class.',
      },
      {
        path: 'activity/:activityId/settings',
        label: 'Activity Settings',
        group: 'Activity Mode',
        status: 'Backend connected',
        summary:
          'Dynamic activity editing, atomic visible/hidden test-case replacement, and optimistic concurrency.',
      },
      {
        path: 'activity/new',
        label: 'Create Activity',
        group: 'Activity Mode',
        status: 'Backend connected',
        summary: 'Create a server-backed Java programming-activity draft.',
      },
      {
        path: 'activity/:activityId/monitor',
        label: 'Student Monitoring',
        group: 'Activity Mode',
        status: 'Canonical redirect',
        summary: 'Redirects to the real per-activity submission queue; unsupported presence and missing-student monitoring are not fabricated.',
      },
      {
        path: 'activity/:activityId/submissions',
        label: 'Submission Queue',
        group: 'Activity Mode',
        status: 'Backend connected',
        summary:
          'Authorized per-activity attempts with bounded pagination, lifecycle filtering, and canonical review links.',
      },
      {
        path: 'activity/:activityId/submissions/:submissionId',
        label: 'Submission Review',
        group: 'Activity Mode',
        status: 'Backend connected',
        summary:
          'Immutable source and assessment evidence, append-only correction, review, release, retry, and failure resolution.',
      },
      {
        path: 'submission-review',
        label: 'Legacy Submission Review',
        group: 'Activity Mode',
        status: 'Navigation required',
        summary:
          'Identifier-less legacy route directs instructors to choose an activity submission safely.',
      },
      {
        path: 'projects',
        label: 'Project Oversight',
        group: 'Project Collaboration Mode',
        status: 'Backend connected',
        summary:
          'Selected-class project requirements with lifecycle, team, repository, and review-state summaries.',
      },
      {
        path: 'projects/new',
        label: 'Create Project Requirement',
        group: 'Project Collaboration Mode',
        status: 'Backend connected',
        summary: 'Create a server-backed draft using supported title, instructions, deadline, and team-size fields.',
      },
      {
        path: 'projects/:projectTaskId',
        label: 'Project Monitoring',
        group: 'Project Collaboration Mode',
        status: 'Backend connected',
        summary: 'Project requirement monitoring with repository progress and team status.',
      },
      {
        path: 'projects/:projectTaskId/repository',
        label: 'Repository Review',
        group: 'Project Collaboration Mode',
        status: 'Compatibility route',
        summary: 'Identifier-less route that directs the instructor to choose a repository from the real project record.',
      },
      {
        path: 'projects/:projectTaskId/repositories/:repositoryId',
        label: 'Repository Metadata',
        group: 'Project Collaboration Mode',
        status: 'Backend connected',
        summary: 'Instructor-authorized repository membership, invitation correction, feedback, review, lifecycle, metadata, and provisioning state.',
      },
      {
        path: 'projects/:projectTaskId/settings',
        label: 'Project Settings',
        group: 'Project Collaboration Mode',
        status: 'Backend connected',
        summary: 'Supported project-task metadata editing and lifecycle transitions with optimistic concurrency.',
      },
      {
        path: 'projects/:projectTaskId/repositories/:repositoryId/contributions',
        label: 'Contribution Review',
        group: 'Project Collaboration Mode',
        status: 'Placeholder',
        summary: 'Commit balance, tasks closed, review activity, and collaboration risk.',
      },
      {
        path: 'projects/:projectTaskId/repositories/:repositoryId/similarity',
        label: 'Project Similarity',
        group: 'Project Collaboration Mode',
        status: 'Placeholder',
        summary: 'Full similarity reports framed as instructor review signals.',
      },
      {
        path: 'analytics',
        label: 'Learning Analytics',
        group: 'Learning',
        status: 'Placeholder',
        summary: 'Section, activity, topic, and student-level learning signals.',
      },
      {
        path: 'students/stu-alyssa',
        label: 'Student Coding Profile',
        group: 'Learning',
        status: 'Placeholder',
        summary: 'Student performance, submissions, contribution history, and intervention notes.',
      },
    ],
  },
  {
    ...roles[2],
    routes: [
      {
        path: 'users',
        label: 'User Management',
        group: 'Administration',
        status: 'Shell ready',
        summary: 'Students, instructors, admins, roles, account status, and section membership.',
      },
      {
        path: 'courses',
        label: 'Course Management',
        group: 'Administration',
        status: 'Shell ready',
        summary: 'Courses, activities, repositories, instructors, sections, and term status.',
      },
      {
        path: 'sections',
        label: 'Section Management',
        group: 'Administration',
        status: 'Placeholder',
        summary: 'Rosters, instructor assignments, activity counts, and repository counts.',
      },
      {
        path: 'enrollments',
        label: 'Enrollments',
        group: 'Administration',
        status: 'Shell ready',
        summary:
          'Enrollment records, class membership statuses, class code joins, and invitation outcomes.',
      },
      {
        path: 'instructor-assignments',
        label: 'Instructor Assignments',
        group: 'Administration',
        status: 'Shell ready',
        summary: 'Instructor assignments across courses, sections, and academic terms.',
      },
      {
        path: 'repositories',
        label: 'Repository Management',
        group: 'Repository Governance',
        status: 'Shell ready',
        summary: 'Ownership, visibility, size, last activity, policy, and archive status.',
      },
      {
        path: 'storage',
        label: 'System Storage',
        group: 'Repository Governance',
        status: 'Shell ready',
        summary: 'Storage by course, repository, archives, artifacts, logs, and growth.',
      },
      {
        path: 'archive',
        label: 'Archived Preservation',
        group: 'Preservation',
        status: 'Shell ready',
        summary: 'Searchable preserved projects, read-only snapshots, retention, and export status.',
      },
      {
        path: 'system',
        label: 'System Health',
        group: 'Administration',
        status: 'Placeholder',
        summary: 'Mock integration state, queues, audit events, and platform notices.',
      },
    ],
  },
]

export const dashboardStats = {
  student: [
    { label: 'Open activities', value: '3', detail: 'Each allows one submission only' },
    { label: 'Submitted activities', value: '6', detail: 'Final records, no attempts list' },
    { label: 'Class invitations', value: '1', detail: 'Pending accept or decline' },
    { label: 'Project repositories', value: '3', detail: '1 contribution watch' },
  ],
  instructor: [
    { label: 'Submissions to review', value: '28', detail: 'Final locked submissions' },
    { label: 'Published activities', value: '9', detail: '4 close this week' },
    { label: 'Class roster', value: '96', detail: '8 pending invitations' },
    { label: 'Similarity reviews', value: '6', detail: 'Instructor-only detail' },
  ],
  admin: [
    { label: 'Active users', value: '428', detail: 'Students, instructors, admins' },
    { label: 'Enrollments', value: '386', detail: '14 pending invitations' },
    { label: 'Instructor assignments', value: '32', detail: 'Across 28 active sections' },
    { label: 'Repositories', value: '186', detail: '31 archived snapshots' },
  ],
}

export const dashboardRows = {
  student: [
    {
      item: 'Loop Patterns and Input Validation',
      mode: 'Activity',
      status: 'Due Soon',
      signal: 'Deadline Jul 3, one submission only',
    },
    {
      item: 'Student Grade Analyzer',
      mode: 'Submitted Activity',
      status: 'Submitted',
      signal: 'Submitted Jun 21, locked, 3/3 visible tests',
    },
    {
      item: 'CS 122 - Data Structures invitation',
      mode: 'Class',
      status: 'Pending',
      signal: 'Accept or decline invitation',
    },
  ],
  instructor: [
    {
      item: 'CS 111 Loop Patterns',
      mode: 'Activity Settings',
      status: 'Published',
      signal: 'Deadline Jul 3, one submission only, 3 visible tests',
    },
    {
      item: 'BSIT 2A Submission Review',
      mode: 'Activity',
      status: 'Grading',
      signal: 'Hidden checks and similarity detail available',
    },
    {
      item: 'BSCS 1A Roster',
      mode: 'Class',
      status: 'Active',
      signal: 'Class code SLU-CS111-1A',
    },
  ],
  admin: [
    {
      item: 'BSCS 1A Enrollment Records',
      mode: 'Enrollment',
      status: 'Active',
      signal: '42 enrolled, 3 invited',
    },
    {
      item: 'Instructor Assignments',
      mode: 'Course',
      status: 'Active',
      signal: 'Lead and lab instructor assignments tracked',
    },
    {
      item: '2025-2026 Capstone Archive',
      mode: 'Archive',
      status: 'Preserved',
      signal: 'Integrity verified',
    },
  ],
}

export const studentActivityDetails = [
  {
    ...activitySummaries[0],
    course: 'CS 111 - Introduction to Programming',
    section: 'BSCS 1A',
    language: 'Java',
    points: 100,
    instructions:
      'Read integer input until a sentinel value is entered. Validate non-negative values, count valid entries, and print the computed average using two decimal places.',
    expectedOutput: 'Count: 4 | Average: 82.50',
    files: ['src/Main.java', 'src/InputStats.java', 'README.md'],
    visibleTests: [
      { name: 'Accepts valid scores', status: 'Passed' },
      { name: 'Rejects negative input', status: 'Passed' },
      { name: 'Formats average to two decimals', status: 'Failed' },
    ],
    compilerOutput:
      'Mock compile completed with warnings.\n2/3 visible tests passed.\nCheck average formatting before final submission.',
    code:
      'public class InputStats {\n  public static double average(int[] scores) {\n    int total = 0;\n    for (int score : scores) {\n      total += score;\n    }\n    return (double) total / scores.length;\n  }\n}',
  },
  {
    ...activitySummaries[1],
    course: 'CS 111 - Introduction to Programming',
    section: 'BSCS 1A',
    language: 'Java',
    points: 100,
    instructions:
      'Process a list of student grades, compute the highest score, lowest score, and class average, then display a short academic summary.',
    expectedOutput: 'Highest: 96 | Lowest: 71 | Average: 84.20',
    files: ['src/GradeAnalyzer.java', 'src/Main.java', 'README.md'],
    visibleTests: [
      { name: 'Computes high score', status: 'Passed' },
      { name: 'Computes low score', status: 'Passed' },
      { name: 'Computes average', status: 'Passed' },
    ],
    compilerOutput: 'Mock compile completed.\n3/3 visible tests passed.\nSubmission is locked.',
    code:
      'public class GradeAnalyzer {\n  public Summary summarize(int[] grades) {\n    return Summary.from(grades);\n  }\n}',
  },
  {
    ...activitySummaries[2],
    course: 'IT 212 - Web Systems and Technologies',
    section: 'BSIT 2A',
    language: 'Python',
    points: 80,
    instructions:
      'Parse a CSV roster export and print validated enrollment rows grouped by section.',
    expectedOutput: 'BSIT 2A: 38 valid rows',
    files: ['parser.py', 'sample/enrollment.csv', 'README.md'],
    visibleTests: [],
    compilerOutput: 'No submitted code. Deadline has passed.',
    code: '# Submission closed before code was submitted.',
  },
]

export const studentSubmissionRecords = [
  {
    item: 'Student Grade Analyzer',
    activityId: 'act-arrays-02',
    course: 'CS 111',
    status: 'Submitted',
    submittedAt: '2026-06-21 20:14',
    lockedStatus: 'Submitted - Locked',
    mockTests: '3/3 visible tests passed',
    reviewStatus: 'Checked',
    gradeStatus: 'Graded',
    grade: '94/100',
    feedback:
      'Strong decomposition and clear variable names. Add one more boundary test next time.',
    academicReview: 'Checked',
  },
  {
    item: 'Library Item Class Model',
    activityId: 'act-oop-03',
    course: 'CS 122',
    status: 'Submitted',
    submittedAt: '2026-06-16 18:42',
    lockedStatus: 'Submitted - Locked',
    mockTests: '4/5 visible tests passed',
    reviewStatus: 'Waiting for Review',
    gradeStatus: 'Pending',
    grade: 'Not released',
    feedback: 'Instructor feedback not available yet.',
    academicReview: 'Under Review',
  },
  {
    item: 'CSV Enrollment Parser',
    activityId: 'act-files-04',
    course: 'IT 212',
    status: 'Missing',
    submittedAt: 'Not submitted',
    lockedStatus: 'Closed - Not Submitted',
    mockTests: 'No submitted code',
    reviewStatus: 'Needs Instructor Review',
    gradeStatus: 'Missing',
    grade: '0/80 pending review',
    feedback: 'No submission was received before the deadline.',
    academicReview: 'Needs Instructor Review',
  },
]

export const studentFeedback = {
  activity: 'Student Grade Analyzer',
  status: 'Graded',
  submittedAt: '2026-06-21 20:14',
  grade: '94/100',
  reviewStatus: 'Checked',
  automatedChecking: '3/3 visible tests passed. Hidden checks are not shown to students.',
  instructorFeedback:
    'Your solution is readable and handles the required grade ranges. Improve the summary output formatting for long class names.',
  rubric: [
    { item: 'Correctness', score: '40/40', status: 'Checked' },
    { item: 'Input validation', score: '18/20', status: 'Checked' },
    { item: 'Code readability', score: '20/20', status: 'Checked' },
    { item: 'Output formatting', score: '16/20', status: 'Needs Revision' },
  ],
}

export const studentProject = {
  id: 'repo-campus-nav',
  name: 'Campus Navigation Assistant',
  course: 'CS 321 - Software Engineering',
  section: 'BSCS 3B',
  status: 'Active',
  academicReview: 'Under Review',
  archiveStatus: 'Snapshot scheduled',
  description:
    'Team repository for a campus route planner with building lookup, accessible path notes, and classroom search.',
  members: [
    { name: 'Alyssa Mendoza', role: 'Frontend and route cards', contribution: 'Balanced' },
    { name: 'Nico Santos', role: 'Map data parser', contribution: 'Watch' },
    { name: 'Mira Bautista', role: 'Testing and documentation', contribution: 'Balanced' },
  ],
  files: [
    { item: 'src/App.jsx', type: 'React component', status: 'Active', signal: 'Updated today' },
    { item: 'src/data/buildings.js', type: 'Dataset', status: 'Active', signal: '42 buildings' },
    { item: 'docs/route-notes.md', type: 'Documentation', status: 'Active', signal: 'Accessibility notes' },
    { item: 'tests/navigation.test.js', type: 'Mock tests', status: 'Review', signal: '2 failing route cases' },
  ],
  commits: [
    { item: 'Add building search filter', mode: 'main', status: 'Active', signal: 'Alyssa, Jun 25 14:08' },
    { item: 'Normalize campus path dataset', mode: 'data-cleanup', status: 'Review', signal: 'Nico, Jun 24 19:20' },
    { item: 'Document accessible entrance notes', mode: 'docs', status: 'Active', signal: 'Mira, Jun 24 10:11' },
  ],
  tasks: [
    { item: 'Connect search to route cards', mode: 'Frontend', status: 'Active', signal: 'Assigned to Alyssa' },
    { item: 'Fix duplicate building aliases', mode: 'Data', status: 'Review', signal: 'Assigned to Nico' },
    { item: 'Prepare milestone demo script', mode: 'Documentation', status: 'Open', signal: 'Assigned to Mira' },
  ],
  contributions: [
    { item: 'Alyssa Mendoza', mode: 'Commits 14', status: 'Balanced', signal: '42 files touched, 6 tasks closed' },
    { item: 'Nico Santos', mode: 'Commits 7', status: 'Watch', signal: 'Data work concentrated in one branch' },
    { item: 'Mira Bautista', mode: 'Commits 11', status: 'Balanced', signal: 'Testing and docs steady' },
  ],
}

export const studentAnalytics = [
  { label: 'Activity completion', value: '82%', detail: '6 final submissions recorded' },
  { label: 'Visible test pass rate', value: '78%', detail: 'Based on mock student-visible tests' },
  { label: 'Feedback turnaround', value: '2.4d', detail: 'Average instructor response' },
  { label: 'Contribution balance', value: 'Good', detail: '1 project needs watch' },
]

export const studentTopicRows = [
  { item: 'Loops and validation', mode: 'CS 111', status: 'Due Soon', signal: 'Formatting test still failing' },
  { item: 'Arrays and summaries', mode: 'CS 111', status: 'Checked', signal: 'Feedback released' },
  { item: 'File parsing', mode: 'IT 212', status: 'Missing', signal: 'Deadline passed without submission' },
  { item: 'Repository collaboration', mode: 'CS 321', status: 'Active', signal: 'Balanced contribution trend' },
]

export const studentArchives = [
  {
    item: 'Peer Review Tracker',
    mode: 'CS 321 - 2025',
    status: 'Preserved',
    signal: 'Read-only snapshot, 184 MB, integrity verified',
  },
  {
    item: 'Library Kiosk Manager',
    mode: 'IT 212 - 2025',
    status: 'Preserved',
    signal: 'Final project archive retained until 2031',
  },
  {
    item: 'Enrollment Queue Simulator',
    mode: 'CS 122 - 2024',
    status: 'Preserved',
    signal: 'Repository snapshot and final evaluation preserved',
  },
]

export const instructorActivities = [
  {
    item: 'Loop Patterns and Input Validation',
    mode: 'Java',
    status: 'Published',
    signal: 'Deadline 2026-07-03 17:00 | One submission only | 3 tests',
  },
  {
    item: 'Student Grade Analyzer',
    mode: 'Java',
    status: 'Grading',
    signal: 'Deadline 2026-06-21 23:59 | 32 submitted records | 5 tests',
  },
  {
    item: 'CSV Enrollment Parser',
    mode: 'Python',
    status: 'Closed',
    signal: 'Deadline 2026-06-18 17:00 | 8 missing | 4 tests',
  },
  {
    item: 'Campus Events API Client',
    mode: 'JavaScript',
    status: 'Draft',
    signal: 'Deadline not published | Checking setup in progress',
  },
]

export const instructorActivitySettings = {
  title: 'Loop Patterns and Input Validation',
  language: 'Java',
  deadline: '2026-07-03 17:00',
  publishStatus: 'Published',
  closeStatus: 'Open until deadline',
  submissionRule: 'One submission only',
  testCaseCount: '3 visible, 2 hidden',
  checkingSetup: 'Compile Java, run visible tests, run hidden instructor checks',
  rubric: [
    { item: 'Correctness', mode: '40 pts', status: 'Configured', signal: 'Visible and hidden tests inform review' },
    { item: 'Input validation', mode: '20 pts', status: 'Configured', signal: 'Negative values and sentinel handling' },
    { item: 'Readability', mode: '20 pts', status: 'Configured', signal: 'Naming and method structure' },
    { item: 'Output formatting', mode: '20 pts', status: 'Configured', signal: 'Two decimal places required' },
  ],
}

export const instructorProjects = [
  {
    item: 'Campus Navigation Assistant',
    mode: 'repo-campus-nav',
    status: 'Active',
    signal: '3 members | 12 tasks | archive snapshot scheduled',
  },
  {
    item: 'Library Kiosk Manager',
    mode: 'repo-library-kiosk',
    status: 'Watch',
    signal: 'Uneven contribution balance | 2 stale branches',
  },
  {
    item: 'Peer Review Tracker',
    mode: 'repo-peer-review',
    status: 'Grading',
    signal: 'Final milestone submitted | similarity review open',
  },
]

export const instructorProjectDetail = {
  members: [
    { item: 'Alyssa Mendoza', mode: 'Frontend', status: 'Balanced', signal: '14 commits | 6 tasks closed' },
    { item: 'Nico Santos', mode: 'Data parser', status: 'Watch', signal: '7 commits | low review activity' },
    { item: 'Mira Bautista', mode: 'Testing/docs', status: 'Balanced', signal: '11 commits | 5 tests added' },
  ],
  tasks: [
    { item: 'Connect search to route cards', mode: 'Frontend', status: 'Active', signal: 'Due Jun 28' },
    { item: 'Fix duplicate building aliases', mode: 'Data', status: 'Review', signal: 'Linked to commit 8fa31' },
    { item: 'Prepare milestone demo script', mode: 'Docs', status: 'Open', signal: 'Due Jul 1' },
  ],
  commits: [
    { item: 'Add building search filter', mode: 'main', status: 'Active', signal: 'Alyssa | Jun 25 14:08 | +82 -14' },
    { item: 'Normalize campus path dataset', mode: 'data-cleanup', status: 'Review', signal: 'Nico | Jun 24 19:20 | +143 -33' },
    { item: 'Document accessible entrance notes', mode: 'docs', status: 'Active', signal: 'Mira | Jun 24 10:11 | +51 -2' },
  ],
  archive: [
    { item: 'Repository snapshot', mode: 'Preservation', status: 'Ready', signal: 'Snapshot label 2026-CS321-BSCS3B-final' },
    { item: 'Metadata completeness', mode: 'Archive', status: 'Ready', signal: 'Course, section, team, and members captured' },
    { item: 'Retention policy', mode: 'Archive', status: 'Review', signal: 'Retain until 2032-07-01' },
  ],
}

export const instructorSimilarityReports = [
  {
    item: 'Nico Santos - Student Grade Analyzer',
    mode: 'Submission',
    status: 'Needs Review',
    signal: '48% similarity | matched source: Prior CS111 sample solution',
    decision: 'Open',
  },
  {
    item: 'Peer Review Tracker final milestone',
    mode: 'Project',
    status: 'High',
    signal: '67% similarity | matched submission: repo-peer-review-team-02',
    decision: 'Escalate for review',
  },
  {
    item: 'Campus Navigation Assistant route parser',
    mode: 'Project',
    status: 'Moderate',
    signal: '34% similarity | matched source: team utility branch',
    decision: 'Request explanation',
  },
]

export const instructorAnalytics = [
  { label: 'Completion', value: '84%', detail: 'CS 111 activities completed' },
  { label: 'Compiler pass rate', value: '71%', detail: 'First mock compile run' },
  { label: 'Weak topic', value: 'Files', detail: 'CSV parsing and validation' },
  { label: 'Interventions', value: '12', detail: 'Students needing follow-up' },
]

export const instructorAnalyticsRows = [
  { item: 'Loop validation', mode: 'Topic', status: 'Due Soon', signal: '11 students have failing formatting tests' },
  { item: 'CSV parsing', mode: 'Topic', status: 'Risk', signal: 'Highest missing rate this week' },
  { item: 'Project contribution', mode: 'Collaboration', status: 'Watch', signal: '4 teams show imbalance' },
  { item: 'Similarity review', mode: 'Academic review', status: 'Needs Review', signal: '6 instructor-only reports open' },
]

export const instructorStudentProfile = {
  name: 'Alyssa Mendoza',
  section: 'BSCS 1A',
  status: 'Good standing',
  rows: [
    { item: 'Submitted activities', mode: 'Activity', status: 'Checked', signal: '6 final records, no repeated attempts' },
    { item: 'Average grade', mode: 'Feedback', status: 'Graded', signal: '91.5 across released rubrics' },
    { item: 'Compiler trend', mode: 'Checking', status: 'Active', signal: 'Visible test pass rate 86%' },
    { item: 'Project contribution', mode: 'Repository', status: 'Balanced', signal: '14 commits, 6 tasks closed' },
  ],
}
