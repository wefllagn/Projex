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

export const classMembership = {
  enrolledClasses: [
    {
      section: 'BSCS 1A',
      course: 'CS 111 - Introduction to Programming',
      instructor: 'Engr. Marco Rivera',
      enrollmentStatus: 'Enrolled',
      classCode: 'SLU-CS111-1A',
    },
    {
      section: 'BSIT 2A',
      course: 'IT 212 - Web Systems and Technologies',
      instructor: 'Prof. Dana Reyes',
      enrollmentStatus: 'Enrolled',
      classCode: 'SLU-IT212-2A',
    },
  ],
  pendingInvitations: [
    {
      id: 'invite-cs122-01',
      course: 'CS 122 - Data Structures',
      section: 'BSCS 2B',
      invitedBy: 'Dr. Helena Cruz',
      status: 'Pending',
      sentAt: '2026-06-24 09:30',
    },
  ],
  roster: [
    { name: 'Alyssa Mendoza', email: 'alyssa.mendoza@slu.example', status: 'Enrolled' },
    { name: 'Nico Santos', email: 'nico.santos@slu.example', status: 'Invited' },
    { name: 'Mira Bautista', email: 'mira.bautista@slu.example', status: 'Enrolled' },
  ],
  instructorAssignments: [
    {
      instructor: 'Engr. Marco Rivera',
      course: 'CS 111 - Introduction to Programming',
      section: 'BSCS 1A',
      assignmentRole: 'Lead Instructor',
      status: 'Active',
    },
    {
      instructor: 'Prof. Dana Reyes',
      course: 'IT 212 - Web Systems and Technologies',
      section: 'BSIT 2A',
      assignmentRole: 'Lab Instructor',
      status: 'Active',
    },
  ],
}

export const routeCatalog = [
  {
    ...roles[0],
    routes: [
      {
        path: 'classes',
        label: 'My Classes',
        group: 'Class Membership',
        status: 'Shell ready',
        summary:
          'Enrolled classes, section membership, instructor names, and class codes are visible here.',
      },
      {
        path: 'join-class',
        label: 'Join Class',
        group: 'Class Membership',
        status: 'Placeholder',
        summary: 'Student joins a class using a class code. This remains hardcoded for now.',
      },
      {
        path: 'invitations',
        label: 'Class Invitations',
        group: 'Class Membership',
        status: 'Placeholder',
        summary:
          'Pending class invitations can later be accepted or declined in local UI state.',
      },
      {
        path: 'people',
        label: 'People',
        group: 'Class Membership',
        status: 'Shell ready',
        summary:
          'Student-facing class people tab with instructors and classmates for the selected section.',
      },
      {
        path: 'activity',
        label: 'Activity Mode',
        group: 'Activity Mode',
        status: 'Shell ready',
        summary:
          'Programming activities with deadlines, due status, one-submission-only labels, mock checks, grades, and feedback.',
      },
      {
        path: 'activity/act-loops-01',
        label: 'Activity Workspace',
        group: 'Activity Mode',
        status: 'Placeholder',
        summary:
          'Detailed workspace later: instructions, deadline, file tree, code editor, mock tests, and locked submit state.',
      },
      {
        path: 'activity/act-loops-01/submission-record',
        label: 'Submission Record',
        group: 'Activity Mode',
        status: 'Placeholder',
        summary:
          'Final submitted activity record with submitted date/time, review status, mock test result, grade status, and feedback.',
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
        path: 'activity/act-loops-01/feedback',
        label: 'Feedback and Grade',
        group: 'Activity Mode',
        status: 'Placeholder',
        summary: 'Rubric feedback, revision status, and released grade details.',
      },
      {
        path: 'projects',
        label: 'Project Collaboration Mode',
        group: 'Project Collaboration Mode',
        status: 'Shell ready',
        summary:
          'Team repositories, commits, tasks, contribution tracking, instructor-facing similarity signals, and archive state.',
      },
      {
        path: 'projects/repo-campus-nav',
        label: 'Repository Overview',
        group: 'Project Collaboration Mode',
        status: 'Placeholder',
        summary: 'Repository health, team members, files, commits, tasks, and preservation state.',
      },
      {
        path: 'projects/repo-campus-nav/contributions',
        label: 'Contribution Tracking',
        group: 'Project Collaboration Mode',
        status: 'Placeholder',
        summary: 'Personal and team contribution balance for the project repository.',
      },
      {
        path: 'analytics',
        label: 'Learning Analytics',
        group: 'Learning',
        status: 'Placeholder',
        summary: 'Topic progress, test pass rate, late work, feedback trend, and risk signals.',
      },
      {
        path: 'archive',
        label: 'Archived Projects',
        group: 'Preservation',
        status: 'Placeholder',
        summary: 'Read-only previous term repositories and preserved project records.',
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
        path: 'roster',
        label: 'Class Roster',
        group: 'Class Management',
        status: 'Shell ready',
        summary:
          'Instructor view of enrolled, invited, and pending students in the selected section.',
      },
      {
        path: 'invite-students',
        label: 'Invite Students',
        group: 'Class Management',
        status: 'Placeholder',
        summary: 'Invite students to a class using hardcoded invitation records.',
      },
      {
        path: 'class-code',
        label: 'Class Code',
        group: 'Class Management',
        status: 'Placeholder',
        summary: 'Generate and view the selected section class code.',
      },
      {
        path: 'activity',
        label: 'Activity Management',
        group: 'Activity Mode',
        status: 'Shell ready',
        summary:
          'Activity authoring with deadline, one-submission-only rule, checking setup, test count, and publish/close status.',
      },
      {
        path: 'activity-settings',
        label: 'Activity Settings',
        group: 'Activity Mode',
        status: 'Shell ready',
        summary:
          'Deadline, Draft/Published/Closed/Grading status, one-submission-only rule, and mock checking setup.',
      },
      {
        path: 'activity/new',
        label: 'Create Activity',
        group: 'Activity Mode',
        status: 'Placeholder',
        summary: 'Mock creation flow for programming activity setup.',
      },
      {
        path: 'activity/act-loops-01/monitor',
        label: 'Student Monitoring',
        group: 'Activity Mode',
        status: 'Placeholder',
        summary: 'Progress, compiler state, submission state, idle flags, and intervention signals.',
      },
      {
        path: 'activity/act-loops-01/submissions',
        label: 'Submission Queue',
        group: 'Activity Mode',
        status: 'Placeholder',
        summary:
          'Review queue with final submissions, grade, compiler, feedback, and instructor-only similarity filters.',
      },
      {
        path: 'submission-review',
        label: 'Submission Review',
        group: 'Activity Mode',
        status: 'Shell ready',
        summary:
          'Full mock checking results, hidden test summaries, detailed similarity review, feedback, and grade control.',
      },
      {
        path: 'projects',
        label: 'Project Oversight',
        group: 'Project Collaboration Mode',
        status: 'Shell ready',
        summary:
          'Course repositories, project health, team contribution balance, similarity, and archive readiness.',
      },
      {
        path: 'projects/repo-campus-nav/contributions',
        label: 'Contribution Review',
        group: 'Project Collaboration Mode',
        status: 'Placeholder',
        summary: 'Commit balance, tasks closed, review activity, and collaboration risk.',
      },
      {
        path: 'projects/repo-campus-nav/similarity',
        label: 'Project Similarity',
        group: 'Project Collaboration Mode',
        status: 'Placeholder',
        summary: 'Full similarity reports framed as instructor review signals.',
      },
      {
        path: 'projects/repo-campus-nav/archive',
        label: 'Archive Readiness',
        group: 'Project Collaboration Mode',
        status: 'Placeholder',
        summary: 'Preservation metadata, snapshot status, and retention notes.',
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

export const instructorRoster = [
  {
    item: 'Alyssa Mendoza',
    mode: 'BSCS 1A',
    status: 'Enrolled',
    signal: 'Last active today | 6 submitted activities',
  },
  {
    item: 'Nico Santos',
    mode: 'BSCS 1A',
    status: 'Enrolled',
    signal: 'Needs intervention | 2 missing activities',
  },
  {
    item: 'Mira Bautista',
    mode: 'BSCS 1A',
    status: 'Enrolled',
    signal: 'Project contributor | feedback current',
  },
  {
    item: 'Luis Carino',
    mode: 'BSCS 1A',
    status: 'Invited',
    signal: 'Invitation sent 2026-06-24',
  },
]

export const instructorClassCode = {
  course: 'CS 111 - Introduction to Programming',
  section: 'BSCS 1A',
  code: 'SLU-CS111-1A',
  generatedAt: '2026-06-24 09:00',
  expiresAt: '2026-07-10 23:59',
  status: 'Active',
}

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

export const instructorMonitoringRows = [
  {
    item: 'Alyssa Mendoza',
    mode: 'Editing',
    status: 'Due Soon',
    signal: '2/3 visible tests passing | last active 5 min ago',
  },
  {
    item: 'Nico Santos',
    mode: 'Not started',
    status: 'Risk',
    signal: 'No compiler run | deadline in 3 days',
  },
  {
    item: 'Mira Bautista',
    mode: 'Submitted',
    status: 'Checked',
    signal: '3/3 visible tests | feedback ready',
  },
  {
    item: 'Luis Carino',
    mode: 'Compiling',
    status: 'Watch',
    signal: 'Syntax error repeated 4 times',
  },
]

export const instructorSubmissions = [
  {
    item: 'Alyssa Mendoza',
    activity: 'Student Grade Analyzer',
    status: 'Checked',
    submittedAt: '2026-06-21 20:14',
    compiler: 'Compiled',
    tests: '3/3 visible, 2/2 hidden',
    grade: '94/100',
    feedback: 'Released',
    similarity: '12%',
    decision: 'No action',
  },
  {
    item: 'Nico Santos',
    activity: 'Student Grade Analyzer',
    status: 'Pending',
    submittedAt: '2026-06-21 22:41',
    compiler: 'Compiled',
    tests: '2/3 visible, 1/2 hidden',
    grade: 'Draft',
    feedback: 'Not released',
    similarity: '48%',
    decision: 'Needs review',
  },
  {
    item: 'Mira Bautista',
    activity: 'Loop Patterns and Input Validation',
    status: 'Needs Revision',
    submittedAt: '2026-06-25 18:05',
    compiler: 'Warnings',
    tests: '2/3 visible, hidden pending',
    grade: 'Draft',
    feedback: 'Drafted',
    similarity: '18%',
    decision: 'Review comments',
  },
]

export const instructorReview = {
  student: 'Nico Santos',
  activity: 'Student Grade Analyzer',
  submittedAt: '2026-06-21 22:41',
  status: 'Pending',
  compilerOutput:
    'Mock compile succeeded.\nVisible tests: 2/3 passed.\nHidden tests: 1/2 passed.\nFormatting check failed for empty grade list.',
  code:
    'public class GradeAnalyzer {\n  public Summary summarize(int[] grades) {\n    int total = 0;\n    for (int grade : grades) total += grade;\n    return new Summary(total / grades.length);\n  }\n}',
  tests: [
    { item: 'Computes high score', mode: 'Visible', status: 'Passed', signal: 'Student-visible' },
    { item: 'Handles empty grade list', mode: 'Hidden', status: 'Failed', signal: 'Instructor-only check' },
    { item: 'Formats summary text', mode: 'Visible', status: 'Failed', signal: 'Output mismatch' },
    { item: 'Rejects invalid grade values', mode: 'Hidden', status: 'Passed', signal: 'Instructor-only check' },
  ],
  rubric: [
    { item: 'Correctness', mode: '40 pts', status: 'Draft', signal: '30/40' },
    { item: 'Input validation', mode: '20 pts', status: 'Draft', signal: '14/20' },
    { item: 'Readability', mode: '20 pts', status: 'Draft', signal: '17/20' },
    { item: 'Output formatting', mode: '20 pts', status: 'Draft', signal: '12/20' },
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

export const adminStats = [
  { label: 'Total users', value: '428', detail: '362 students, 54 instructors, 12 admins' },
  { label: 'Active courses', value: '12', detail: '28 active sections this term' },
  { label: 'Enrollment records', value: '386', detail: '14 pending invitations' },
  { label: 'Repositories', value: '186', detail: '31 archived projects' },
]

export const adminUsers = [
  { item: 'Alyssa Mendoza', mode: 'Student', status: 'Active', signal: 'BSCS 1A | 6 final submissions | 3 repositories' },
  { item: 'Engr. Marco Rivera', mode: 'Instructor', status: 'Active', signal: 'CS 111 lead | 96 students | 9 activities' },
  { item: 'Prof. Dana Reyes', mode: 'Instructor', status: 'Active', signal: 'IT 212 lab | 74 students | 5 repositories' },
  { item: 'SLU Academic Systems Admin', mode: 'Admin', status: 'Active', signal: 'Repository governance and preservation' },
  { item: 'Luis Carino', mode: 'Student', status: 'Invited', signal: 'Pending BSCS 1A invitation' },
]

export const adminCourses = [
  { item: 'CS 111 - Introduction to Programming', mode: '5 sections', status: 'Active', signal: 'Lead: Engr. Marco Rivera | 212 students | 9 activities' },
  { item: 'CS 122 - Data Structures', mode: '4 sections', status: 'Active', signal: 'Lead: Dr. Helena Cruz | 164 students | 8 activities' },
  { item: 'IT 212 - Web Systems and Technologies', mode: '3 sections', status: 'Active', signal: 'Lead: Prof. Dana Reyes | 118 students | 12 repositories' },
  { item: 'CS 498 - Capstone Project', mode: '2 sections', status: 'Inactive', signal: 'Next term setup | archive review pending' },
]

export const adminSections = [
  { item: 'BSCS 1A', mode: 'CS 111', status: 'Active', signal: 'Instructor: Engr. Marco Rivera | 42 enrolled | Code SLU-CS111-1A' },
  { item: 'BSIT 2A', mode: 'IT 212', status: 'Active', signal: 'Instructor: Prof. Dana Reyes | 38 enrolled | Code SLU-IT212-2A' },
  { item: 'BSCS 3B', mode: 'CS 321', status: 'Active', signal: 'Instructor: Dr. Helena Cruz | 31 enrolled | 8 project repos' },
  { item: 'Capstone 4A', mode: 'CS 498', status: 'Inactive', signal: 'Instructor assignment pending | 0 active students' },
]

export const adminEnrollments = [
  { item: 'Alyssa Mendoza', mode: 'CS 111 | BSCS 1A', status: 'Enrolled', signal: 'Invitation accepted | Join code verified | Active' },
  { item: 'Nico Santos', mode: 'CS 111 | BSCS 1A', status: 'Enrolled', signal: 'Manual enrollment | Join code bypass approved' },
  { item: 'Luis Carino', mode: 'CS 111 | BSCS 1A', status: 'Pending', signal: 'Invitation pending | Join code active' },
  { item: 'Rina Salvador', mode: 'IT 212 | BSIT 2A', status: 'Removed', signal: 'Dropped section | Join code revoked' },
]

export const adminInstructorAssignments = [
  { item: 'Engr. Marco Rivera', mode: 'CS 111 | BSCS 1A', status: 'Active', signal: '42 students | 9 activities | 3 project groups supervised' },
  { item: 'Prof. Dana Reyes', mode: 'IT 212 | BSIT 2A', status: 'Active', signal: '38 students | 6 activities | 5 repositories supervised' },
  { item: 'Dr. Helena Cruz', mode: 'CS 321 | BSCS 3B', status: 'Active', signal: '31 students | 8 repositories | 4 archive reviews' },
  { item: 'TBD Instructor', mode: 'CS 498 | Capstone 4A', status: 'Pending', signal: '0 students | assignment required before publication' },
]

export const adminRepositories = [
  { item: 'repo-campus-nav', mode: 'CS 321 | BSCS 3B | Team Alpha', status: 'Active', signal: '842 MB | archive scheduled | policy clear' },
  { item: 'repo-library-kiosk', mode: 'IT 212 | BSIT 2A | Team Kiosk', status: 'Warning', signal: '2.8 GB | oversized repository | policy check required' },
  { item: 'repo-peer-review', mode: 'CS 321 | BSCS 3B | Team Review', status: 'Review', signal: '1.4 GB | similarity review open | archive hold' },
  { item: 'repo-enrollment-lite', mode: 'CS 122 | BSCS 2B | Team Queue', status: 'Archived', signal: '612 MB | preserved | integrity verified' },
]

export const adminStorage = [
  { item: 'CS 321 - Software Engineering', mode: 'Repositories', status: 'Warning', signal: '38.4 GB used | 8 oversized repositories | 14 archives' },
  { item: 'IT 212 - Web Systems', mode: 'Repositories', status: 'Active', signal: '21.8 GB used | 5 active project repos | 7 archives' },
  { item: 'Archive storage', mode: 'Preservation', status: 'Review', signal: '112 GB used | 31 preserved projects | growth +9 GB this term' },
  { item: 'Compiler artifacts', mode: 'Mock checking', status: 'Active', signal: '8.6 GB simulated artifacts | cleanup policy weekly' },
]

export const adminSystemHealth = [
  { item: 'Active users', mode: 'Platform', status: 'Active', signal: '128 users active today | peak lab hour 14:00' },
  { item: 'Active repositories', mode: 'Repository governance', status: 'Active', signal: '155 active | 31 archived | 12 policy warnings' },
  { item: 'Pending reviews', mode: 'Academic workflow', status: 'Review', signal: '28 submissions | 6 similarity reports | 4 archives' },
  { item: 'Mock compiler jobs', mode: 'Checking queue', status: 'Warning', signal: '7 failed simulated jobs | no real compiler backend' },
  { item: 'System notices', mode: 'University-managed', status: 'Active', signal: 'Storage threshold review scheduled for Friday' },
]

export const adminArchives = [
  { item: 'Peer Review Tracker', mode: 'CS 321 | BSCS 3B | AY 2025-2026', status: 'Preserved', signal: 'Archived 2026-06-18 | integrity verified | retention until 2032' },
  { item: 'Library Kiosk Manager', mode: 'IT 212 | BSIT 2A | AY 2025-2026', status: 'Preserved', signal: 'Archived 2026-06-10 | checksum verified | preservation note complete' },
  { item: 'Enrollment Queue Simulator', mode: 'CS 122 | BSCS 2B | AY 2024-2025', status: 'Preserved', signal: 'Archived 2025-05-28 | read-only snapshot | restore available as mock action' },
  { item: 'Campus Navigation Assistant', mode: 'CS 321 | BSCS 3B | AY 2025-2026', status: 'Review', signal: 'Archive date pending | repository integrity check queued' },
]
