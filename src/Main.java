import java.util.Scanner;

public class Main {
    private static final String ID = "202401230";

    public static void main(String[] args) {
        if (args.length > 0 && args[0].equalsIgnoreCase("--tests")) {
            runAllTests();
        } else {
            runCli();
        }
    }

    private static Booking newBooking(String id) {
        return new Booking(id, "Aarav Sharma", "Washing Machine", "Drum is not spinning",
                1200.00, "12 Lake View Road, Ahmedabad");
    }

    private static void print(String message) { System.out.println("  " + message); }

    private static boolean check(String label, boolean condition, Booking booking) {
        System.out.printf("Actual: %s | Final State: %s%n", label, booking.getState());
        System.out.println("Result: " + (condition ? "PASS" : "FAIL"));
        return condition;
    }

    private static void header(String id, String title, String expected) {
        System.out.println("\n========================================");
        System.out.println(id + " - " + title);
        System.out.println("========================================");
        System.out.println("Expected: " + expected);
    }

    public static void runAllTests() {
        boolean all = true;
        all &= tc01(); all &= tc02(); all &= tc03(); all &= tc04();
        all &= tc05(); all &= tc06(); all &= tc07();
        System.out.println("\n========================================");
        System.out.println("OVERALL RESULT: " + (all ? "PASS" : "FAIL"));
        System.out.println("========================================");
    }

    private static boolean tc01() {
        header("TC01", "Successful Booking", "Payment succeeds, center accepts, and service reaches SERVICE_COMPLETED.");
        Booking b = newBooking("TC01");
        print(b.bookService()); print(b.pay(true)); print(b.acceptBooking()); print(b.assignTechnician());
        print(b.dispatchTechnician()); print(b.startService()); print(b.completeService());
        return check("All valid transitions completed; paid=" + b.getPayment().isPaid(), b.getState() == BookingState.SERVICE_COMPLETED, b);
    }

    private static boolean tc02() {
        header("TC02", "Payment Failure and Retry", "First payment fails, retry succeeds, and booking becomes CENTER_REVIEW.");
        Booking b = newBooking("TC02");
        print(b.bookService()); print(b.pay(false));
        boolean failedCorrectly = b.getState() == BookingState.PAYMENT_FAILED && !b.getPayment().isPaid();
        print(b.retryPayment()); print(b.pay(true));
        boolean passed = failedCorrectly && b.getState() == BookingState.CENTER_REVIEW && b.getPayment().isPaid();
        return check("Failure preserved unpaid state; retry succeeded", passed, b);
    }

    private static boolean tc03() {
        header("TC03", "Service-Center Rejection", "Paid booking is rejected and fully refunded; technician cannot be assigned.");
        Booking b = newBooking("TC03");
        print(b.bookService()); print(b.pay(true)); print(b.rejectBooking());
        String invalid = b.assignTechnician(); print(invalid);
        boolean passed = b.getState() == BookingState.BOOKING_REJECTED && b.getPayment().isRefunded()
                && invalid.startsWith("INVALID TRANSITION") && b.getState() == BookingState.BOOKING_REJECTED;
        return check("Rejected booking stayed terminal and refund=" + b.getPayment().isRefunded(), passed, b);
    }

    private static boolean tc04() {
        header("TC04", "Invalid Transition", "COMPLETE_SERVICE from PAYMENT_PENDING is rejected and state remains unchanged.");
        Booking b = newBooking("TC04");
        print(b.bookService());
        BookingState before = b.getState();
        String result = b.completeService(); print(result);
        return check("State unchanged after invalid event", before == b.getState() && result.startsWith("INVALID TRANSITION"), b);
    }

    private static boolean tc05() {
        header("TC05", "Cancellation Before Technician Assignment", "Paid booking cancels during CENTER_REVIEW with a full simulated refund.");
        Booking b = newBooking("TC05");
        print(b.bookService()); print(b.pay(true)); print(b.cancel());
        boolean passed = b.getState() == BookingState.CANCELLED && b.getPayment().isRefunded();
        return check("Cancellation accepted before assignment; full refund=" + b.getPayment().isRefunded(), passed, b);
    }

    private static boolean tc06() {
        header("TC06", "Cancellation After Service Start / Completion", "Cancellation is rejected after service starts and after completion.");
        Booking started = newBooking("TC06A");
        print(started.bookService()); print(started.pay(true)); print(started.acceptBooking()); print(started.assignTechnician());
        print(started.dispatchTechnician()); print(started.startService());
        BookingState beforeStartCancel = started.getState();
        String startCancel = started.cancel(); print(startCancel);
        boolean startCorrect = beforeStartCancel == BookingState.SERVICE_IN_PROGRESS && started.getState() == beforeStartCancel;
        Booking completed = newBooking("TC06B");
        print(completed.bookService()); print(completed.pay(true)); print(completed.acceptBooking()); print(completed.assignTechnician());
        print(completed.dispatchTechnician()); print(completed.startService()); print(completed.completeService());
        String completeCancel = completed.cancel(); print(completeCancel);
        boolean completeCorrect = completed.getState() == BookingState.SERVICE_COMPLETED;
        return check("Both post-boundary cancellations rejected without state corruption", startCorrect && completeCorrect, completed);
    }

    private static boolean tc07() {
        header("TC07", "Complete Service Flow", "Valid sequence reaches SERVICE_COMPLETED via all technician/service states.");
        Booking b = newBooking("TC07");
        print(b.bookService()); print(b.pay(true)); print(b.acceptBooking()); print(b.assignTechnician());
        boolean assigned = b.getState() == BookingState.TECHNICIAN_ASSIGNED;
        print(b.dispatchTechnician()); boolean enRoute = b.getState() == BookingState.TECHNICIAN_EN_ROUTE;
        print(b.startService()); boolean inProgress = b.getState() == BookingState.SERVICE_IN_PROGRESS;
        print(b.completeService());
        return check("TECHNICIAN_ASSIGNED -> TECHNICIAN_EN_ROUTE -> SERVICE_IN_PROGRESS -> SERVICE_COMPLETED",
                assigned && enRoute && inProgress && b.getState() == BookingState.SERVICE_COMPLETED, b);
    }

    private static void runCli() {
        Scanner scanner = new Scanner(System.in);
        Booking booking = null;
        while (true) {
            System.out.println("\nHome Appliance Repair Booking System");
            System.out.println("1 Create/View Booking  2 Status  3 Pay  4 Accept/Reject");
            System.out.println("5 Assign/Dispatch  6 Start/Complete  7 Cancel  8 Run Tests  9 Exit");
            System.out.print("Select: ");
            String choice = scanner.nextLine().trim();
            try {
                if (choice.equals("1")) {
                    if (booking == null) booking = newBooking("CLI-001");
                    System.out.println(booking.summary());
                } else if (choice.equals("2")) {
                    System.out.println(booking == null ? "No booking exists." : booking.summary());
                } else if (choice.equals("3")) {
                    if (booking == null) { System.out.println("Create a booking first."); continue; }
                    if (booking.getState() == BookingState.BOOKING_CREATED) print(booking.bookService());
                    System.out.print("Payment succeeds? (y/n): "); print(booking.pay(scanner.nextLine().trim().equalsIgnoreCase("y")));
                } else if (choice.equals("4")) {
                    if (booking == null) { System.out.println("Create a booking first."); continue; }
                    System.out.print("Accept or reject? (a/r): "); print(scanner.nextLine().trim().equalsIgnoreCase("a") ? booking.acceptBooking() : booking.rejectBooking());
                } else if (choice.equals("5")) {
                    if (booking == null) { System.out.println("Create a booking first."); continue; }
                    System.out.print("Assign or dispatch? (a/d): "); print(scanner.nextLine().trim().equalsIgnoreCase("a") ? booking.assignTechnician() : booking.dispatchTechnician());
                } else if (choice.equals("6")) {
                    if (booking == null) { System.out.println("Create a booking first."); continue; }
                    System.out.print("Start or complete? (s/c): "); print(scanner.nextLine().trim().equalsIgnoreCase("s") ? booking.startService() : booking.completeService());
                } else if (choice.equals("7")) {
                    if (booking == null) { System.out.println("Create a booking first."); continue; }
                    print(booking.cancel());
                } else if (choice.equals("8")) runAllTests();
                else if (choice.equals("9")) break;
                else System.out.println("Invalid menu choice.");
            } catch (Exception ex) { System.out.println("Input error: " + ex.getMessage()); }
        }
        scanner.close();
    }
}
