// Original synthetic reference programs for the proposed adapted contracts.
// These prove output behavior, not academic approval or code-quality assessment.
export interface PrelimReference {
  exercise: number
  entryClassName: string
  sourceCode: string
  cases: Array<{ input: string; expectedOutput: string }>
}

function program(name: string, body: string): string {
  return `import java.util.*; public class ${name} { public static void main(String[] args) { Locale.setDefault(Locale.US); ${body} } }`
}
const scanner = 'Scanner s = new Scanner(System.in); '
const lines = (...values: string[]) => values.join('\n')
const fixedGeometry = [
  ['Circle', 'int r=10; double pi=3.1416; System.out.printf("Radius: %d%nCircumference: %.2f%nArea: %.2f%n",r,2*pi*r,pi*r*r);', lines('Radius: 10','Circumference: 62.83','Area: 314.16')],
  ['Rectangle', 'double l=8,w=5; System.out.printf("Length: %.2f%nWidth: %.2f%nPerimeter: %.2f%nArea: %.2f%n",l,w,2*(l+w),l*w);', lines('Length: 8.00','Width: 5.00','Perimeter: 26.00','Area: 40.00')],
  ['Square', 'double a=6; System.out.printf("Side: %.2f%nPerimeter: %.2f%nArea: %.2f%n",a,4*a,a*a);', lines('Side: 6.00','Perimeter: 24.00','Area: 36.00')],
  ['RightTriangle', 'double b=3,h=4,c=5; System.out.printf("Base: %.2f%nHeight: %.2f%nHypotenuse: %.2f%nPerimeter: %.2f%nArea: %.2f%n",b,h,c,b+h+c,b*h/2.0);', lines('Base: 3.00','Height: 4.00','Hypotenuse: 5.00','Perimeter: 12.00','Area: 6.00')],
] as const

export const prelimReferences: PrelimReference[] = [
  { exercise: 1, entryClassName: 'Exercise1', sourceCode: program('Exercise1', 'System.out.println("+------------------+\\n| Programming 1    |\\n| Student Example  |\\n+------------------+");'), cases: [{ input: '', expectedOutput: lines('+------------------+','| Programming 1    |','| Student Example  |','+------------------+') }] },
  ...fixedGeometry.map(([name, body, expectedOutput]) => ({ exercise: 2, entryClassName: name, sourceCode: program(name, body), cases: [{ input: '', expectedOutput }] })),
  { exercise: 3, entryClassName: 'Circle2', sourceCode: program('Circle2','double area=100; System.out.printf("Area: %.2f%nRadius: %.2f%n",area,Math.sqrt(area/Math.PI));'), cases: [{ input: '', expectedOutput: lines('Area: 100.00','Radius: 5.64') }] },
  { exercise: 3, entryClassName: 'RightTriangle2', sourceCode: program('RightTriangle2','double b=5,h=12; System.out.printf("Base: %.2f%nHeight: %.2f%nHypotenuse: %.2f%n",b,h,Math.sqrt(b*b+h*h));'), cases: [{ input: '', expectedOutput: lines('Base: 5.00','Height: 12.00','Hypotenuse: 13.00') }] },
  { exercise: 4, entryClassName: 'Circle3', sourceCode: program('Circle3', scanner+'int r=s.nextInt(); System.out.printf("Radius: %d%nCircumference: %.2f%nArea: %.2f%n",r,2*Math.PI*r,Math.PI*r*r);'), cases: [
    { input: '2\n', expectedOutput: lines('Radius: 2','Circumference: 12.57','Area: 12.57') },
    { input: '1\n', expectedOutput: lines('Radius: 1','Circumference: 6.28','Area: 3.14') },
  ] },
  { exercise: 4, entryClassName: 'Rectangle3', sourceCode: program('Rectangle3', scanner+'double l=s.nextInt(),w=s.nextInt(); System.out.printf("Length: %.2f%nWidth: %.2f%nPerimeter: %.2f%nArea: %.2f%n",l,w,2*(l+w),l*w);'), cases: [
    { input: '8\n5\n', expectedOutput: lines('Length: 8.00','Width: 5.00','Perimeter: 26.00','Area: 40.00') },
    { input: '1\n1\n', expectedOutput: lines('Length: 1.00','Width: 1.00','Perimeter: 4.00','Area: 1.00') },
  ] },
  { exercise: 4, entryClassName: 'Square3', sourceCode: program('Square3', scanner+'double a=s.nextInt(); System.out.printf("Side: %.2f%nPerimeter: %.2f%nArea: %.2f%n",a,4*a,a*a);'), cases: [
    { input: '6\n', expectedOutput: lines('Side: 6.00','Perimeter: 24.00','Area: 36.00') },
    { input: '1\n', expectedOutput: lines('Side: 1.00','Perimeter: 4.00','Area: 1.00') },
  ] },
  { exercise: 4, entryClassName: 'RightTriangle3', sourceCode: program('RightTriangle3', scanner+'double b=s.nextInt(),h=s.nextInt(),c=Math.sqrt(b*b+h*h); System.out.printf("Base: %.2f%nHeight: %.2f%nHypotenuse: %.2f%nPerimeter: %.2f%nArea: %.2f%n",b,h,c,b+h+c,b*h/2);'), cases: [
    { input: '3\n4\n', expectedOutput: lines('Base: 3.00','Height: 4.00','Hypotenuse: 5.00','Perimeter: 12.00','Area: 6.00') },
    { input: '5\n12\n', expectedOutput: lines('Base: 5.00','Height: 12.00','Hypotenuse: 13.00','Perimeter: 30.00','Area: 30.00') },
  ] },
  { exercise: 5, entryClassName: 'Exercise5', sourceCode: program('Exercise5', scanner+'int a=s.nextInt(),b=s.nextInt(),c=s.nextInt(); System.out.printf("Numbers: %d %d %d%nSum: %d%nInteger quotient: %d%nDecimal quotient: %.2f%nProduct: %d%nSum integer quotient: %d%nSum decimal quotient: %.2f%nAverage: %.2f%nSquares: %d %d %d%n",a,b,c,a+b+c,a/b,(double)a/b,a*b*c,(a+b)/c,(double)(a+b)/c,(a+b+c)/3.0,a*a,b*b,c*c);'), cases: [
    { input: '7\n2\n3\n', expectedOutput: lines('Numbers: 7 2 3','Sum: 12','Integer quotient: 3','Decimal quotient: 3.50','Product: 42','Sum integer quotient: 3','Sum decimal quotient: 3.00','Average: 4.00','Squares: 49 4 9') },
    { input: '-7\n2\n3\n', expectedOutput: lines('Numbers: -7 2 3','Sum: -2','Integer quotient: -3','Decimal quotient: -3.50','Product: -42','Sum integer quotient: -1','Sum decimal quotient: -1.67','Average: -0.67','Squares: 49 4 9') },
  ] },
  { exercise: 7, entryClassName: 'Dispenser', sourceCode: program('Dispenser', scanner+'int amount=s.nextInt(),a=amount/1000,b=amount%1000/500,c=amount%500/100; System.out.printf("1000: %d %.2f%n500: %d %.2f%n100: %d %.2f%nTotal: %d %.2f%n",a,a*1000.0,b,b*500.0,c,c*100.0,a+b+c,(double)amount);'), cases: [
    { input: '2700\n', expectedOutput: lines('1000: 2 2000.00','500: 1 500.00','100: 2 200.00','Total: 5 2700.00') },
    { input: '100\n', expectedOutput: lines('1000: 0 0.00','500: 0 0.00','100: 1 100.00','Total: 1 100.00') },
    { input: '1500\n', expectedOutput: lines('1000: 1 1000.00','500: 1 500.00','100: 0 0.00','Total: 2 1500.00') },
  ] },
  { exercise: 8, entryClassName: 'QuadraticSolver', sourceCode: program('QuadraticSolver', scanner+'double a=s.nextDouble(),b=s.nextDouble(),c=s.nextDouble(),d=Math.sqrt(b*b-4*a*c); System.out.printf("Root 1: %.2f%nRoot 2: %.2f%n",(-b+d)/(2*a),(-b-d)/(2*a));'), cases: [
    { input: '1\n-5\n6\n', expectedOutput: lines('Root 1: 3.00','Root 2: 2.00') },
    { input: '1\n-4\n4\n', expectedOutput: lines('Root 1: 2.00','Root 2: 2.00') },
    { input: '-1\n5\n-6\n', expectedOutput: lines('Root 1: 2.00','Root 2: 3.00') },
  ] },
  { exercise: 9, entryClassName: 'GradeAverage1', sourceCode: program('GradeAverage1', scanner+'int sum=0,units=0; for(int i=0;i<10;i++){int g=s.nextInt(),u=s.nextInt(); sum+=g*u; units+=u;} double average=(double)sum/units; System.out.printf("Average: %.2f%nThreshold met: %s%n",average,average>=85?"yes":"no");'), cases: [
    { input: '85\n1\n'.repeat(10), expectedOutput: lines('Average: 85.00','Threshold met: yes') },
    { input: '84\n1\n'.repeat(10), expectedOutput: lines('Average: 84.00','Threshold met: no') },
    { input: '86\n1\n'.repeat(10), expectedOutput: lines('Average: 86.00','Threshold met: yes') },
    { input: '80\n1\n'.repeat(9)+'100\n3\n', expectedOutput: lines('Average: 85.00','Threshold met: yes') },
  ] },
]
