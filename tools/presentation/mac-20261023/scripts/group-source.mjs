export const packagePath='src/edu/slu/prog2/pregroup01/';
export const fraction=`package edu.slu.prog2.pregroup01;

/** Immutable reduced fraction with a positive denominator. */
public final class Fraction {
    private final int numerator;
    private final int denominator;

    public Fraction(int numerator, int denominator) {
        if (denominator == 0) throw new IllegalArgumentException("Denominator cannot be zero.");
        int divisor = gcd(Math.abs(numerator), Math.abs(denominator));
        int sign = denominator < 0 ? -1 : 1;
        this.numerator = sign * numerator / divisor;
        this.denominator = sign * denominator / divisor;
    }
    private static int gcd(int a, int b) {
        while (b != 0) { int remainder = a % b; a = b; b = remainder; }
        return a;
    }
    public Fraction add(Fraction other) {
        return new Fraction(numerator * other.denominator + other.numerator * denominator,
                denominator * other.denominator);
    }
    public Fraction subtract(Fraction other) {
        return new Fraction(numerator * other.denominator - other.numerator * denominator,
                denominator * other.denominator);
    }
    public Fraction multiply(Fraction other) {
        return new Fraction(numerator * other.numerator, denominator * other.denominator);
    }
    public Fraction divide(Fraction other) {
        if (other.numerator == 0) throw new IllegalArgumentException("Cannot divide by zero.");
        return new Fraction(numerator * other.denominator, denominator * other.numerator);
    }
    public double toDecimal() { return (double) numerator / denominator; }
    public String toString() { return numerator + "/" + denominator; }
}
`;
export const arithmetic=`package edu.slu.prog2.pregroup01;

import java.util.Locale;
import java.util.Scanner;

/** Console entry point for the team's Fraction Arithmetic project. */
public final class FractionArithmetic {
    private static Fraction readFraction(Scanner scanner, String label) {
        System.out.print(label + " numerator: ");
        int numerator = scanner.nextInt();
        System.out.print(label + " denominator: ");
        return new Fraction(numerator, scanner.nextInt());
    }
    private static void display(String label, Fraction value) {
        System.out.printf(Locale.US, "%s: %s = %.4f%n", label, value, value.toDecimal());
    }
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Fraction first = new Fraction(1, 2);
        Fraction second = new Fraction(1, 3);
        while (true) {
            System.out.println("\\nFraction Arithmetic");
            System.out.println("1. Enter two fractions\\n2. Add\\n3. Subtract\\n4. Multiply\\n5. Divide\\n6. Reduce / display fractions\\n0. Quit");
            System.out.print("Choice: ");
            if (!scanner.hasNextInt()) { System.out.println("Input ended."); return; }
            int choice = scanner.nextInt();
            try {
                switch (choice) {
                    case 1:
                        Fraction nextFirst = readFraction(scanner, "First");
                        Fraction nextSecond = readFraction(scanner, "Second");
                        first = nextFirst; second = nextSecond;
                        display("First", first); display("Second", second); break;
                    case 2: display("Sum", first.add(second)); break;
                    case 3: display("Difference", first.subtract(second)); break;
                    case 4: display("Product", first.multiply(second)); break;
                    case 5: display("Quotient", first.divide(second)); break;
                    case 6: display("First (reduced)", first); display("Second (reduced)", second); break;
                    case 0: System.out.println("Goodbye."); return;
                    default: System.out.println("Choose a menu option from 0 to 6.");
                }
            } catch (IllegalArgumentException exception) {
                System.out.println(exception.getMessage());
            }
        }
    }
}
`;
export const readme=`# CS202AlvarezBennettPrelimGroupProject

## Prelim Group Project 1 — Fraction Arithmetic

Computer Programming 2 · official class code **CS202** · First Semester 2026–2027.
Fictional team: Sofia Alvarez (Maintainer) and Noah Bennett (Developer).
Project naming: class code + surnames in alphabetical order + PrelimGroupProject.
Required Java package: \`edu.slu.prog2.pregroup01\`.

## Assignment

Implement Fraction with numerator and denominator, construction and reduction.
FractionArithmetic is the executable class with main. Its interactive menu must
enter two fractions; add, subtract, multiply and divide; reduce/display fractions;
and quit. Display results as reduced fractions and decimal values. Do not allow
a zero denominator or division by a zero-valued fraction.

The implementation uses integer arithmetic for modest classroom values; very large
products can overflow int and are outside this introductory exercise's input range.

## Local build and run (Java 17)

\`\`\`sh
javac -d out src/edu/slu/prog2/pregroup01/Fraction.java src/edu/slu/prog2/pregroup01/FractionArithmetic.java
java -cp out edu.slu.prog2.pregroup01.FractionArithmetic
\`\`\`

Menu: 1 enter two fractions (four integer inputs), 2 add, 3 subtract, 4 multiply,
5 divide, 6 display reduced values, 0 quit. Initial example values are 1/2 and 1/3.
Decimals use four places and Locale.US. Every Fraction is reduced at construction.

## Collaboration

Alvarez initializes main and implements Fraction. Bennett creates the arithmetic
menu on feature/arithmetic-menu. Alvarez reviews the source and authorizes a
fast-forward merge through Projex. Commits retain their actual actor identities.
Create a new feature branch before the next demonstration edit.

The Group repository is for collaboration. It is separate from individual Activity
Java execution and official automated assessment. No Group grade is implied.
`;
