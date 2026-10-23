export const classDescriptions={
 cp1:'Introduction to Java programming fundamentals, variables, primitive data types, expressions, conditional statements, strings and basic problem solving.',
 cp2:'Introduction to object-oriented programming using Java classes, objects, constructors, methods and encapsulation.'
};
const stub='public class Main {\n    public static void main(String[] args) {\n        // Write your solution here.\n    }\n}\n';
export const activities=[
{key:'circle',classKey:'cp1',title:'Prelim Programming Exercise No. 2',subtitle:'Variables, Primitive Data Types, and Identifiers — Circle Measurements',
 instructions:`Use assignment statements with a fixed int radius of 10 and double pi = 3.1416. Compute circumference = 2 * pi * radius and area = pi * radius * radius. This is an assigned-value exercise: do not use Scanner.\n\nLearning objectives: create assignment statements; use appropriate int and double declarations; choose valid identifiers; use PascalCase for class names and camelCase for variable names; perform elementary geometric calculations.\n\nUse a public Main class in Main.java. Print exactly three lines:\nRadius: 10\nCircumference: 62.83\nArea: 314.16\n\nUse a decimal point and exactly two fractional digits for circumference and area (Locale.US). End each line with a newline. The executable output check is worth 80 points. Instructor review (20 points) checks assignment statements, int/double declarations, meaningful identifiers, PascalCase/camelCase and source organization. Output matching alone does not prove these source requirements.\n\nAdapted presentation exercise based on the original SLU exercise; not a verbatim reproduction of the multi-program handout.`,
 starterCode:stub,source:`import java.util.Locale;
public class Main {
    public static void main(String[] args) {
        int radius = 10;
        double pi = 3.1416;
        double circumference = 2 * pi * radius;
        double area = pi * radius * radius;
        System.out.printf(Locale.US, "Radius: %d%nCircumference: %.2f%nArea: %.2f%n", radius, circumference, area);
    }
}
`,cases:[{name:'Fixed radius and two-decimal measurements',inputData:'',expectedOutput:'Radius: 10\nCircumference: 62.83\nArea: 314.16\n',points:80,isHidden:false}]},
{key:'palindrome',classKey:'cp1',title:'Palindrome Checker',subtitle:'Strings, Scanner and case-insensitive comparison',
 instructions:`Read one word using Scanner after displaying the exact prompt "Enter a word: " (including its final space, without a newline). Determine whether the word reads identically forward and backward, ignoring letter case. Use a loop or String operations and a conditional statement.\n\nPrint "Result: Palindrome" or "Result: Not a palindrome", followed by a newline. No additional punctuation or output. Input is one nonempty alphabetic word on one line.\n\nExample automated stdout for input racecar\\n:\nEnter a word: Result: Palindrome\\n\nThe test runner does not echo stdin. In interactive Run Code, your typed input appears in the console; this is separate from Java stdout. Start the program first, then enter a word in the console and press Enter. Run Visible Tests instead supplies the Instructor-defined stdin automatically.\n\nVisible examples: racecar -> Palindrome; hello -> Not a palindrome; Level -> Palindrome. The visible tests carry 60 points; one hidden case carries 20. Instructor review (20) evaluates use of Scanner, readable string comparison and conditionals. Use public Main in Main.java.`,
 starterCode:'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        System.out.print("Enter a word: ");\n        String word = scanner.nextLine();\n        // Compare word with its reverse, ignoring letter case.\n        // Print the exact result specified in the instructions.\n    }\n}\n',
 source:`import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter a word: ");
        String word = scanner.nextLine();
        String reversed = new StringBuilder(word).reverse().toString();
        if (word.equalsIgnoreCase(reversed)) {
            System.out.println("Result: Palindrome");
        } else {
            System.out.println("Result: Not a palindrome");
        }
    }
}
`,cases:[['racecar','Palindrome',false],['hello','Not a palindrome',false],['Level','Palindrome',false],['Java','Not a palindrome',true]].map(([word,result,isHidden],i)=>({name:isHidden?'Additional non-palindrome':'Example '+(i+1)+': '+word,inputData:word+'\n',expectedOutput:'Enter a word: Result: '+result+'\n',points:20,isHidden}))},
{key:'grades',classKey:'cp1',title:'Student Grade Calculator',subtitle:'Scanner input, arithmetic averages and conditional decisions',
 instructions:`Read three numeric quiz scores from 0 to 100 using Scanner, separated by whitespace (one score per line is recommended). Display the exact prompt "Enter three quiz scores: " without a newline. Calculate the arithmetic average using double values.\n\nThen print "Average: " followed by exactly two fractional digits using a decimal point (Locale.US). On the next line print "Status: Passed" if the unrounded average is at least 75, or "Status: Failed" otherwise. End both lines with a newline. Do not round before deciding the status.\n\nExample stdin: 80\\n85\\n90\\n\nExpected stdout:\nEnter three quiz scores: Average: 85.00\nStatus: Passed\n\nVisible passing, failing and threshold cases carry 20 points each. A hidden case carries 20. Instructor review (20) evaluates Scanner use, arithmetic types, clarity and the conditional. Use public Main in Main.java.`,
 starterCode:stub,source:`import java.util.Locale;
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in).useLocale(Locale.US);
        System.out.print("Enter three quiz scores: ");
        double firstScore = scanner.nextDouble();
        double secondScore = scanner.nextDouble();
        double thirdScore = scanner.nextDouble();
        double average = (firstScore + secondScore + thirdScore) / 3.0;
        System.out.printf(Locale.US, "Average: %.2f%n", average);
        System.out.println("Status: " + (average >= 75 ? "Passed" : "Failed"));
    }
}
`,cases:[['Passing scores','80\n85\n90\n','85.00','Passed',false],['Failing scores','50\n60\n70\n','60.00','Failed',false],['Exact passing threshold','75\n75\n75\n','75.00','Passed',false],['Decimal scores','74.5\n74.5\n74.5\n','74.50','Failed',true]].map(([name,inputData,avg,status,isHidden])=>({name,inputData,expectedOutput:`Enter three quiz scores: Average: ${avg}\nStatus: ${status}\n`,points:20,isHidden}))},
{key:'record',classKey:'cp2',title:'Classes and Objects: Student Record',subtitle:'Constructors, objects, attributes and instance methods',
 instructions:`Use one source file Main.java containing a public Main class and a non-public Student class. Student must have private attributes for a fictional student ID, name and program; a constructor that initializes them; and an instance displayInfo method. Main must instantiate a Student object and call displayInfo.\n\nUse exactly these fictional values: 2026-1001, Alex Morgan, BS Information Technology. Do not use real personal information or stdin.\n\nExpected stdout (each line ends with a newline):\nStudent ID: 2026-1001\nName: Alex Morgan\nProgram: BS Information Technology\n\nThe deterministic output check carries 80 points. Instructor review (20) checks the actual Student class, encapsulated attributes, constructor, object instantiation and instance method. Correct stdout alone cannot establish OOP structure.`,
 starterCode:stub,source:`class Student {
    private final String studentId;
    private final String name;
    private final String program;
    Student(String studentId, String name, String program) {
        this.studentId = studentId;
        this.name = name;
        this.program = program;
    }
    void displayInfo() {
        System.out.println("Student ID: " + studentId);
        System.out.println("Name: " + name);
        System.out.println("Program: " + program);
    }
}
public class Main {
    public static void main(String[] args) {
        Student student = new Student("2026-1001", "Alex Morgan", "BS Information Technology");
        student.displayInfo();
    }
}
`,cases:[{name:'Fictional Student record',inputData:'',expectedOutput:'Student ID: 2026-1001\nName: Alex Morgan\nProgram: BS Information Technology\n',points:80,isHidden:false}]},
{key:'fraction',classKey:'cp2',title:'Fraction Class: Basic Operations',subtitle:'Custom data models, addition and simplification',
 instructions:`Use one source file Main.java containing public Main and a non-public Fraction class. Fraction must contain numerator and denominator instance attributes, a constructor, an addition method returning a Fraction, and reduction using the greatest common divisor. Keep denominators positive and reject zero denominators. Implement toString in numerator/denominator format.\n\nConstruct 1/2 and 1/3, add them, and construct 2/4 to demonstrate simplification. Do not read stdin. Print exactly:\nFirst: 1/2\nSecond: 1/3\nSum: 5/6\nReduced: 1/2\n\nEach line ends with a newline. The executable check carries 80 points; Instructor review (20) checks the Fraction model, actual construction, arithmetic and reduction logic. This basic individual exercise is separate from the collaborative Fraction Arithmetic Group Project.`,
 starterCode:stub,source:`class Fraction {
    private final int numerator;
    private final int denominator;
    Fraction(int numerator, int denominator) {
        if (denominator == 0) throw new IllegalArgumentException("Denominator cannot be zero");
        int divisor = gcd(Math.abs(numerator), Math.abs(denominator));
        int sign = denominator < 0 ? -1 : 1;
        this.numerator = sign * numerator / divisor;
        this.denominator = sign * denominator / divisor;
    }
    private static int gcd(int a, int b) {
        while (b != 0) { int remainder = a % b; a = b; b = remainder; }
        return a;
    }
    Fraction add(Fraction other) {
        return new Fraction(numerator * other.denominator + other.numerator * denominator,
                denominator * other.denominator);
    }
    public String toString() { return numerator + "/" + denominator; }
}
public class Main {
    public static void main(String[] args) {
        Fraction first = new Fraction(1, 2);
        Fraction second = new Fraction(1, 3);
        System.out.println("First: " + first);
        System.out.println("Second: " + second);
        System.out.println("Sum: " + first.add(second));
        System.out.println("Reduced: " + new Fraction(2, 4));
    }
}
`,cases:[{name:'Construction, addition and reduction',inputData:'',expectedOutput:'First: 1/2\nSecond: 1/3\nSum: 5/6\nReduced: 1/2\n',points:80,isHidden:false}]}
];
