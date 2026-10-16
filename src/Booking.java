import java.util.EnumSet;

public class Booking {
    private final String bookingId;
    private final String customerName;
    private final String appliance;
    private final String issueDescription;
    private final String serviceAddress;
    private final Payment payment;
    private BookingState state = BookingState.BOOKING_CREATED;

    public Booking(String bookingId, String customerName, String appliance,
                   String issueDescription, double serviceCharge, String serviceAddress) {
        this.bookingId = bookingId;
        this.customerName = customerName;
        this.appliance = appliance;
        this.issueDescription = issueDescription;
        this.serviceAddress = serviceAddress;
        this.payment = new Payment(serviceCharge);
    }

    public BookingState getState() { return state; }
    public Payment getPayment() { return payment; }
    public String getBookingId() { return bookingId; }
    public String getCustomerName() { return customerName; }
    public String getAppliance() { return appliance; }
    public String getIssueDescription() { return issueDescription; }
    public String getServiceAddress() { return serviceAddress; }

    private boolean in(BookingState... states) {
        return EnumSet.of(states[0], states).contains(state);
    }

    private String invalid(String event) {
        return String.format("INVALID TRANSITION: %s is not allowed from %s. State unchanged.", event, state);
    }

    private String change(String event, BookingState next, String action) {
        BookingState previous = state;
        state = next;
        return String.format("%s | %s -> %s | %s", event, previous, state, action);
    }

    public String bookService() {
        if (!in(BookingState.BOOKING_CREATED)) return invalid("BOOK_SERVICE");
        return change("BOOK_SERVICE", BookingState.PAYMENT_PENDING, "Booking details accepted; payment is pending.");
    }

    public String pay(boolean success) {
        if (!in(BookingState.PAYMENT_PENDING)) return invalid("PAY");
        if (!payment.canAttempt()) return invalid("PAY (maximum payment attempts reached)");
        if (payment.attempt(success)) {
            return change("PAY", BookingState.CENTER_REVIEW,
                    String.format("Payment successful (attempt %d/%d); sent to service-center review.", payment.getAttempts(), payment.getMaxAttempts()));
        }
        return change("PAY", BookingState.PAYMENT_FAILED,
                String.format("Payment failed (attempt %d/%d); booking is not paid.", payment.getAttempts(), payment.getMaxAttempts()));
    }

    public String retryPayment() {
        if (!in(BookingState.PAYMENT_FAILED)) return invalid("RETRY_PAYMENT");
        if (!payment.canAttempt()) return invalid("RETRY_PAYMENT (maximum payment attempts reached)");
        return change("RETRY_PAYMENT", BookingState.PAYMENT_PENDING,
                String.format("Retry permitted; attempt %d/%d remains available.", payment.getAttempts() + 1, payment.getMaxAttempts()));
    }

    public String acceptBooking() {
        if (!in(BookingState.CENTER_REVIEW)) return invalid("ACCEPT_BOOKING");
        return change("ACCEPT_BOOKING", BookingState.BOOKING_CONFIRMED, "Service center accepted the paid booking.");
    }

    public String rejectBooking() {
        if (!in(BookingState.CENTER_REVIEW)) return invalid("REJECT_BOOKING");
        return change("REJECT_BOOKING", BookingState.BOOKING_REJECTED, payment.refundFull());
    }

    public String assignTechnician() {
        if (!in(BookingState.BOOKING_CONFIRMED)) return invalid("ASSIGN_TECHNICIAN");
        return change("ASSIGN_TECHNICIAN", BookingState.TECHNICIAN_ASSIGNED, "Technician assigned.");
    }

    public String dispatchTechnician() {
        if (!in(BookingState.TECHNICIAN_ASSIGNED)) return invalid("DISPATCH_TECHNICIAN");
        return change("DISPATCH_TECHNICIAN", BookingState.TECHNICIAN_EN_ROUTE, "Technician dispatched to service address.");
    }

    public String startService() {
        if (!in(BookingState.TECHNICIAN_EN_ROUTE)) return invalid("START_SERVICE");
        return change("START_SERVICE", BookingState.SERVICE_IN_PROGRESS, "Repair service started.");
    }

    public String completeService() {
        if (!in(BookingState.SERVICE_IN_PROGRESS)) return invalid("COMPLETE_SERVICE");
        return change("COMPLETE_SERVICE", BookingState.SERVICE_COMPLETED, "Repair completed at customer location.");
    }

    public String cancel() {
        if (!in(BookingState.PAYMENT_PENDING, BookingState.PAYMENT_FAILED, BookingState.CENTER_REVIEW)) {
            return invalid("CANCEL");
        }
        String action = payment.isPaid() ? payment.refundFull() : "No refund required because payment was not successful.";
        return change("CANCEL", BookingState.CANCELLED, "Cancellation accepted before technician assignment. " + action);
    }

    public String summary() {
        return String.format("%s | customer=%s | appliance=%s | issue=%s | charge=%.2f | address=%s | state=%s | paid=%s | refunded=%s | attempts=%d/%d",
                bookingId, customerName, appliance, issueDescription, payment.getAmount(), serviceAddress,
                state, payment.isPaid(), payment.isRefunded(), payment.getAttempts(), payment.getMaxAttempts());
    }
}
