const body = 'public static void main(String[] args) { System.out.print("ok"); }'

export const javaSourceCases = [
  { name: 'line and Javadoc comments', source: `// First line\n/** Entry documentation. */\npublic class Main { ${body} }\n// Last line\n`, valid: true },
  { name: 'Unicode and comment-like strings', source: `public class Main { String note = "José 🌱 /* string */ // "; ${body} }\n`, valid: true },
  { name: 'text block comment-like content', source: `public class Main { String note = """\n// literal /* text */\n<<<<<<< HEAD\n"""; ${body} }\n`, valid: true },
  { name: 'CRLF and tabs', source: `// start\r\npublic class Main {\r\n\t${body}\r\n}\r\n// end\r\n`, valid: true },
  { name: 'missing final newline', source: `public class Main { ${body} }`, valid: true },
  { name: 'multiple classes', source: `class Helper { static String value() { return "ok"; } }\npublic final class Main { public static void main(String[] args) { System.out.print(Helper.value()); } }\n`, valid: true },
  { name: 'markers inside comments', source: `/*\n<<<<<<< HEAD\nleft\n=======\nright\n>>>>>>> branch\n*/\npublic class Main { ${body} }\n`, valid: true },
  { name: 'markers outside comments', source: `<<<<<<< HEAD\npublic class Main { ${body} }\n=======\nclass Other {}\n>>>>>>> branch\n`, valid: false },
  { name: 'invalid Java', source: 'public class Main { not valid Java; }\n', valid: false },
  { name: 'large source within UTF-8 budget', source: `/*${'x'.repeat(99_800)}*/\npublic class Main { ${body} }\n`, valid: true },
] as const
