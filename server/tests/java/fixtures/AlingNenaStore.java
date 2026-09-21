import java.util.Locale;
import java.util.Scanner;

// Synthetic reference for the adapted I2.1 checkout contract.
public class AlingNenaStore {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in).useLocale(Locale.ROOT);
        String product = input.nextLine();
        int quantity = input.nextInt();
        double price = input.nextDouble();
        int percentage = input.nextInt();
        double cash = input.nextDouble();
        double gross = quantity * price;
        double discount = gross * percentage / 100.0;
        double due = gross - discount;
        System.out.printf(Locale.ROOT,
            "Total Purchase Amount: %.2f%nTotal Discount: %.2f%nAmount To Be Paid: %.2f%nChange: %.2f%n",
            gross, discount, due, cash - due);
    }
}
