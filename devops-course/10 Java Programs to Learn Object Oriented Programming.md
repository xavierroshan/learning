# Program Index

1. [Bank Account](https://chatgpt.com/space/page_b5f89840e5a08191917df134082247ec#:~:text=1%20Bank%20Account)

2. [Student Grade Manager](https://chatgpt.com/space/page_b5f89840e5a08191917df134082247ec#:~:text=2%20Student%20Grade%20Manager)

3. [Library System](https://chatgpt.com/space/page_b5f89840e5a08191917df134082247ec#:~:text=3%20Library%20System)

4. [Employee Payroll](https://chatgpt.com/space/page_b5f89840e5a08191917df134082247ec#:~:text=4%20Employee%20Payroll)

5. [Shape Calculator](https://chatgpt.com/space/page_b5f89840e5a08191917df134082247ec#:~:text=5%20Shape%20Calculator)

6. [Payment System](https://chatgpt.com/space/page_b5f89840e5a08191917df134082247ec#:~:text=6%20Payment%20System)

7. [Shopping Cart](https://chatgpt.com/space/page_b5f89840e5a08191917df134082247ec#:~:text=7%20Shopping%20Cart)

8. [Vehicle Rental System](https://chatgpt.com/space/page_b5f89840e5a08191917df134082247ec#:~:text=8%20Vehicle%20Rental%20System)

9. [Tic-Tac-Toe](https://chatgpt.com/space/page_b5f89840e5a08191917df134082247ec#:~:text=9%20Tic-Tac-Toe)

10. [Elevator Simulator](https://chatgpt.com/space/page_b5f89840e5a08191917df134082247ec#:~:text=10%20Elevator%20Simulator)

Build these console programs in order, from beginner to more advanced, to practice object-oriented programming in Java. Start with Bank Account, Student Grade Manager, and Library System before moving on to inheritance and interfaces.

# Requirements shared by all programs

Build each exercise as a separate console application with an in-memory data model. Data may reset when the program exits; file storage and graphical interfaces are optional. Provide a repeating menu with an exit option, clear prompts, and readable results. Invalid input should produce a useful message and return to the menu without corrupting state.

Keep business rules inside domain classes and input parsing in the console layer. Deliver the Java source, brief compile and run instructions, and evidence for the acceptance examples below. The stated rates, grading bands, limits, and scheduling policies define this exercise's rules and can be changed later as extensions. Complete the required features before attempting optional extensions.

# 1 Bank Account

Create an account with deposit, withdrawal, and balance methods. Prevent invalid withdrawals. **Concepts:** classes, objects, constructors, encapsulation.

## Required features

- Create an account with a unique account number, a nonblank owner name, and an opening balance of zero or more.

- Deposit money, withdraw money, and display account details and the current balance.

- Keep a transaction history containing the transaction type, amount, and resulting balance. Record the opening balance separately.

- Provide a menu to select an account and perform operations; support at least two accounts so their balances remain independent.

## Class design and rules

- Use `BankAccount` for account data and business behavior, `Transaction` for history entries, and a console controller for input and output.

- Expose operations such as `deposit(amount)`, `withdraw(amount)`, and `getBalance()`; do not expose a public balance setter.

- Require positive transaction amounts. Reject withdrawals above the available balance, duplicate account numbers, blank names, and amounts with more than two decimal places.

- Represent money with `BigDecimal` or integer cents. A rejected operation must leave the balance and history unchanged.

## Acceptance examples

- Opening balance 100.00, deposit 50.00, then withdraw 40.00 produces 110.00 and two successful transaction entries.

- Withdrawing 110.00 is allowed; withdrawing another 0.01 is rejected.

- A negative deposit and an unknown account number produce clear errors without terminating the menu.

**Optional extension:** transfer money between accounts, updating both accounts only when the entire transfer succeeds.

## Bank Account reference code

Account creation, input validation, storage, and lookup using `AccountType`, `BankAccount`, `Bank`, and `BankApp`. Save as `BankApp.java`.

```java
import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

// Moved out of BankAccount so the Bank class can use it too.
// (A private enum inside BankAccount is invisible to other classes.)
enum AccountType {
    CHECKING,
    SAVINGS,
    DEPOSIT
}

class BankAccount {
    private final String accountNumber;
    private final String name;
    private final AccountType accountType;
    private double balance;

    // No Scanner, no prompts. The account just receives values that are already validated.
    public BankAccount(String accountNumber, String name, AccountType accountType, double openingBalance) {
        this.accountNumber = accountNumber;
        this.name = name;
        this.accountType = accountType;
        this.balance = openingBalance;
    }

    public String getAccountNumber() { return accountNumber; }
    public String getName()          { return name; }
    public AccountType getAccountType() { return accountType; }
    public double getBalance()       { return balance; }

    @Override
    public String toString() {
        return accountNumber + " | " + name + " | " + accountType + " | " + balance;
    }
}

class Bank {
    // Key = account number, Value = the account object
    private final Map<String, BankAccount> accounts = new HashMap<>();

    // One shared Scanner, passed in from main
    private final Scanner scanner;

    public Bank(Scanner scanner) {
        this.scanner = scanner;
    }

    // The 4-step flow
    public void createAccount() {
        String accountNumber = readUniqueAccountNumber();  // Steps 1 and 2: format + duplicate check
        String name = readName();                          // Step 3: collect the rest
        AccountType type = readAccountType();
        double balance = readOpeningBalance();

        BankAccount account = new BankAccount(accountNumber, name, type, balance);  // Step 4: create
        accounts.put(accountNumber, account);                                       // Step 4: store

        System.out.println("Account created: " + account);
    }

    // Retrieve an account by number (returns null if not found)
    public BankAccount findAccount(String accountNumber) {
        return accounts.get(accountNumber.trim());
    }

    public void printAllAccounts() {
        for (BankAccount account : accounts.values()) {
            System.out.println(account);
        }
    }

    // ---------- input helpers ----------

    private String readUniqueAccountNumber() {
        while (true) {
            System.out.println("Enter the Account Number:");
            String input = scanner.nextLine().trim();

            if (input.isEmpty()) {
                System.out.println("Account number can't be empty.");
                continue;
            }
            if (!input.matches("\\d+")) {
                System.out.println("Account number must contain digits only.");
                continue;
            }
            if (accounts.containsKey(input)) {          // the duplicate check
                System.out.println("Account number " + input + " already exists. Enter a different one.");
                continue;
            }
            return input;   // valid and unique
        }
    }

    private String readName() {
        while (true) {
            System.out.println("Enter the Name (firstname lastname):");
            String input = scanner.nextLine().trim();

            if (input.isEmpty()) {
                System.out.println("Name can't be empty.");
                continue;
            }
            if (!input.matches("[A-Za-z]+ [A-Za-z]+")) {
                System.out.println("Use letters only, first and last name separated by one space.");
                continue;
            }
            return input;
        }
    }

    private AccountType readAccountType() {
        while (true) {
            System.out.println("Enter the Account Type (CHECKING, SAVINGS, DEPOSIT):");
            String input = scanner.nextLine().trim().toUpperCase();

            for (AccountType t : AccountType.values()) {
                if (t.name().equals(input)) {
                    return t;
                }
            }
            System.out.println("Invalid account type.");
        }
    }

    private double readOpeningBalance() {
        while (true) {
            System.out.println("Enter the opening balance:");
            String input = scanner.nextLine().trim();
            try {
                double amount = Double.parseDouble(input);
                if (amount < 0) {
                    System.out.println("Balance can't be negative.");
                    continue;
                }
                return amount;
            } catch (NumberFormatException e) {
                System.out.println("Please enter a valid number.");
            }
        }
    }
}

public class BankApp {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);   // created once
        Bank bank = new Bank(scanner);

        bank.createAccount();
        bank.createAccount();   // try entering the same account number here

        System.out.println("\nAll accounts:");
        bank.printAllAccounts();

        System.out.println("\nLook up an account number:");
        String number = scanner.nextLine();
        BankAccount found = bank.findAccount(number);
        if (found == null) {
            System.out.println("No account found.");
        } else {
            System.out.println("Found: " + found);
        }
    }
}
```

# 2 Student Grade Manager

Store students, subjects, and marks. Calculate averages and assign grades. **Concepts:** fields, methods, object collections.

## Required features

- Add students with unique IDs and nonblank names; list students and view an individual report.

- Add or update a student's mark for a named subject. Store one mark per subject per student.

- Calculate the arithmetic average of recorded marks, with equal weight for every subject.

- Assign A for averages at least 90, B for at least 80, C for at least 70, D for at least 60, and F below 60.

- Show each subject, its mark, the average to two decimal places, and the overall grade. For a student with no marks, show “No marks recorded” and no grade.

## Class design and rules

- Use `Student` to own its marks and calculate its average; use `GradeManager` to manage the student collection. A `SubjectMark` class may represent each subject result.

- Keep fields private and prevent callers from changing internal collections directly.

- Accept marks from 0 through 100 inclusive. Reject blank subjects, duplicate student IDs, and operations on unknown students.

- Updating an existing subject replaces its mark rather than adding a duplicate. Calculate the grade using the unrounded average.

## Acceptance examples

- Marks 80, 90, and 100 produce an average of 90.00 and grade A.

- Marks 79 and 80 produce 79.50 and grade C.

- Marks 0 and 100 are valid; marks −1 and 101 are rejected.

- Updating a subject changes both the displayed report and the calculated average.

**Optional extension:** save and reload student records from a file.

# 3 Library System

Track books and members. Allow members to borrow and return books. **Concepts:** object relationships, composition.

## Required features

- Register books and members with unique IDs. A book record represents one physical copy and stores its title and author.

- List all books, search by title or author without case sensitivity, and show availability.

- Allow a registered member to borrow an available book and return a book they currently hold.

- Show the current loans for each member. Permit a maximum of three active loans per member.

- Store a borrowing date and a due date 14 calendar days later; show overdue status for active loans.

## Class design and rules

- Use `Book`, `Member`, `Loan`, and `Library`. The library owns the catalog, member registry, and loan records; a loan links one member to one book.

- Put borrowing and returning rules in `Library`, keeping availability consistent with active loans.

- Reject duplicate IDs, blank required fields, unknown books or members, borrowing an already borrowed book, and borrowing beyond the member limit.

- Reject a return by a different member and a second return of an already returned book. Failed actions must not change loan counts or availability.

## Acceptance examples

- After member M1 borrows book B1, B1 is unavailable and appears in M1's loans.

- M2 cannot borrow B1 until M1 returns it.

- A fourth concurrent loan is rejected; returning one book allows another loan.

- A loan borrowed on October 1 is due October 15 and becomes overdue on October 16 if still active.

**Optional extension:** multiple copies per title, reservations, or overdue fines.

# 4 Employee Payroll

Calculate pay differently for full-time employees, part-time employees, and contractors. **Concepts:** inheritance, method overriding, polymorphism.

## Required features

- Register employees with unique IDs, names, and one of three types: full-time, part-time, or contractor.

- Calculate gross pay for one monthly payroll period.

- Full-time gross pay equals the employee's configured monthly salary.

- Part-time gross pay equals hours worked multiplied by the hourly rate; all hours use the same rate in the core exercise.

- Contractor gross pay equals the agreed fee per completed assignment multiplied by the number of assignments completed that month.

- Print each employee's type and gross pay, followed by the total payroll.

## Class design and rules

- Define an abstract `Employee` with shared identity fields and `calculatePay()`.

- Implement `FullTimeEmployee`, `PartTimeEmployee`, and `Contractor`, each overriding the pay calculation.

- Store all employees in a collection of `Employee` references and invoke `calculatePay()` polymorphically.

- Require positive salary or rate values and nonnegative hours and assignment counts; assignment counts must be integers. Reject duplicate IDs.

- Use decimal money arithmetic and round final employee pay to two decimal places using a stated rounding rule. The core exercise excludes taxes, deductions, and overtime.

## Acceptance examples

- Monthly salary 4000.00 produces 4000.00.

- 80 hours at 20.00 per hour produces 1600.00.

- Three assignments at 500.00 each produce 1500.00; the combined payroll is 7100.00.

- Zero hours or assignments produces zero pay; negative inputs are rejected.

**Optional extension:** introduce bonuses or deductions through separate collaborating objects.

# 5 Shape Calculator

Create circles, rectangles, and triangles with methods for area and perimeter. **Concepts:** abstract classes, polymorphism.

## Required features

- Create circles, rectangles, and triangles; store them in one collection and display each shape's area and perimeter.

- A circle uses one radius; a rectangle uses length and width; a triangle uses three side lengths.

- Calculate circle area as pi × radius squared and perimeter as 2 × pi × radius.

- Calculate rectangle area as length × width and perimeter as 2 × (length + width).

- Calculate triangle perimeter as a + b + c and area with Heron's formula, using s = (a + b + c) / 2.

- Display results to two decimal places with consistent units, such as square units for area and units for perimeter.

## Class design and rules

- Define an abstract `Shape` with `area()` and `perimeter()`; implement `Circle`, `Rectangle`, and `Triangle`.

- Iterate over `Shape` references to demonstrate polymorphism.

- Require finite, positive dimensions. For a triangle, the sum of any two sides must exceed the third.

- Validate dimensions when constructing objects; invalid objects must never enter the collection. Retain full calculation precision until display.

## Acceptance examples

- Radius 2 produces area 12.57 and perimeter 12.57.

- A 3 × 4 rectangle produces area 12.00 and perimeter 14.00.

- A triangle with sides 3, 4, and 5 produces area 6.00 and perimeter 12.00.

- Zero radius, negative length, and sides 1, 2, and 3 are rejected.

**Optional extension:** add another shape without modifying the collection-processing logic.

# 6 Payment System

Implement card, wallet, and cash payments through a shared `PaymentMethod` interface. Use simulated transactions. **Concepts:** interfaces, interchangeable implementations.

## Required features

- Accept a positive purchase amount and let the user choose card, wallet, or cash.

- Simulate card approval using a configured approved or declined state. Do not collect real card credentials.

- For wallet payments, check the available balance and deduct the purchase amount only on success.

- For cash payments, accept the tendered amount, require it to cover the purchase, and calculate change.

- Return a payment result containing a unique attempt ID, payment type, requested amount, success status, and a clear message. Include change for successful cash payments.

- Show a receipt on success and an explanation on failure.

## Class design and rules

- Define `PaymentMethod` with a common `pay(amount)` operation. Implement `CardPayment`, `WalletPayment`, and `CashPayment`.

- Use a `PaymentProcessor` that accepts a `PaymentMethod` and does not branch on its concrete class.

- Model the result with `PaymentResult`; keep method-specific state within each implementation.

- Reject nonpositive amounts, negative starting wallet balances, and invalid cash inputs. Use decimal money arithmetic with at most two decimal places.

- Declined payments must not alter balances or produce a success receipt. Each menu submission represents a new simulated attempt.

## Acceptance examples

- A wallet balance of 100.00 pays 30.00 successfully and becomes 70.00; a subsequent 80.00 payment fails and leaves 70.00.

- Cash tendered 50.00 for a 42.50 purchase produces 7.50 change.

- A configured card decline returns failure without changing any monetary state.

**Optional extension:** simulated refunds or transaction lookup.

# 7 Shopping Cart

Add products, change quantities, remove items, and calculate totals with discounts. **Concepts:** composition, encapsulation, object collaboration.

## Required features

- Maintain a catalog of products with unique IDs, names, and unit prices.

- Add a product with a quantity; adding the same product again increases its existing quantity.

- Set an item's quantity, remove an item, clear the cart, and display an itemized cart.

- Calculate each line total as unit price × quantity and subtotal as the sum of line totals.

- Support one percentage discount from 0 through 100 inclusive. Apply it once to the subtotal and display the discount amount and final total.

- For the core exercise, exclude tax, shipping, stock management, and payment processing.

## Class design and rules

- Use `Product`, `CartItem`, and `ShoppingCart`. Each cart item references a product and owns its quantity.

- Let `ShoppingCart` manage its items and calculate totals; keep the console controller responsible for user interaction.

- Require nonnegative prices and positive integer quantities. Use an explicit remove action rather than treating quantity zero as removal.

- Reject unknown product IDs, invalid quantities, and discounts outside the allowed range.

- Use decimal money arithmetic; round the discount to two decimal places, then subtract it from the subtotal. An empty cart has a total of zero.

## Acceptance examples

- Two items at 20.00 and one at 10.00 produce subtotal 50.00.

- A 10 percent discount produces discount 5.00 and final total 45.00.

- Adding another copy of an existing product creates no duplicate line.

- A 100 percent discount produces zero; a negative quantity leaves the cart unchanged.

**Optional extension:** coupon objects, inventory checks, or checkout through the Payment System.

# 8 Vehicle Rental System

Rent cars, bikes, and trucks with different daily rates and availability. **Concepts:** inheritance, overriding, business rules.

## Required features

- Register cars, bikes, and trucks with unique vehicle IDs and descriptive names.

- Configure daily rates for each type; begin with car 50.00, bike 15.00, and truck 80.00.

- List available vehicles, rent one to a customer for a positive whole number of days, and display active rentals.

- Calculate the quoted cost as the vehicle's daily rate multiplied by booked days.

- Close a rental when the vehicle is returned, retain its record, and make the vehicle available again.

- Display a rental receipt with rental ID, customer name, vehicle, booked days, applied rate, and total cost.

## Class design and rules

- Define an abstract `Vehicle` with shared identity and a `calculateRentalCost(days)` contract. Implement `Car`, `Bike`, and `Truck`.

- Use `Rental` to capture the booking details and `RentalService` to coordinate rentals and availability.

- Calculate quotes through `Vehicle` references. Preserve the rate applied to a booking even if future rates change.

- Reject duplicate IDs, blank customer names, unavailable vehicles, nonpositive or fractional days, unknown rental IDs, and duplicate returns.

- The core exercise uses immediate rental and explicit return; it excludes future reservations and late fees.

## Acceptance examples

- A car rented for three days costs 150.00; a bike for two days costs 30.00.

- A rented vehicle cannot be rented again until returned.

- Returning a vehicle changes its availability without deleting the completed rental.

- Changing the car rate after booking does not alter the existing receipt.

**Optional extension:** date-based reservations or different pricing rules for each subtype.

# 9 Tic-Tac-Toe

Separate the board, players, and game rules into classes. Start with two human players. **Concepts:** class responsibilities, composition, enums.

## Required features

- Run a two-player console game on a 3 × 3 board. Ask for player names; player X moves first and player O moves second.

- Display the board before play and after each accepted move.

- Accept a row and column numbered 1 through 3 and place the current player's symbol in the chosen empty cell.

- Check for a win across any row, column, or diagonal after each accepted move.

- Declare a draw when all nine cells are filled and no player has won.

- Announce the result and offer a new game or exit. A new game resets the board and starts with X.

## Class design and rules

- Use `Board` for cells and placement, `Player` for name and symbol, and `Game` for turns and game progression.

- Use enums for cell values such as EMPTY, X, and O, and for game status such as IN_PROGRESS, X_WON, O_WON, and DRAW.

- Keep board storage private; expose controlled placement and inspection methods.

- Reject occupied cells, out-of-range coordinates, and malformed input. Invalid moves must not change the board or consume a turn.

- Check wins before draws and prevent moves after a terminal result.

## Acceptance examples

- X plays (1,1), O (2,1), X (1,2), O (2,2), X (1,3): X wins.

- Attempting an occupied cell prompts the same player again.

- Test wins in all eight winning lines and at least one full-board draw.

- Restarting clears all nine cells and restores the initial turn.

**Optional extension:** add a computer player through a strategy interface.

# 10 Elevator Simulator

Model an elevator’s floor, direction, requests, and door state. Reject invalid actions. **Concepts:** state modeling, encapsulation, object collaboration.

## Required features

- Simulate one elevator in a building with floors 0 through 9, initially idle at floor 0 with closed doors.

- Accept destination requests, display pending requests, advance the simulation one step, and show current floor, direction, and door state.

- Serve requests in first-in, first-out order; ignore duplicates already active or pending.

- Each movement step travels exactly one floor toward the active destination.

- Arrival opens the doors and marks that request served. The next step closes the doors without moving; later steps begin serving the next request.

- A request for the current floor opens the doors when it reaches the front of the queue, without movement. With no requests and closed doors, the elevator is idle.

## Class design and rules

- Use `Elevator` for state and controlled actions, `RequestQueue` for ordered destinations, and a controller for console commands.

- Use enums for direction UP, DOWN, and IDLE, and door state OPEN and CLOSED.

- Reject floor requests outside 0 through 9 and malformed commands. Never move while doors are open or beyond the floor limits.

- Permit manual door opening only while idle with no active destination; permit manual closing while stopped. Invalid actions leave all state unchanged.

- Keep the simulator single-threaded and step-driven. Physical hardware, sensors, and timing are outside the exercise.

## Acceptance examples

- Request floor 3 from floor 0: three movement steps reach floor 3 and open the doors; the next step closes them.

- Requests 3 then 1 are served in that order, changing direction after the first stop.

- Duplicate requests do not create extra stops; requests −1 and 10 are rejected.

- At an open-door stop, the next step closes the doors without changing the floor.

**Optional extension:** replace first-in, first-out scheduling with directional scheduling or simulate multiple elevators.

# Practice Guidelines

- Start with a console application.

- Keep `main()` small; put behavior in appropriate classes.

- Make fields `private` and expose methods that enforce rules.

- Test normal actions and invalid inputs.

