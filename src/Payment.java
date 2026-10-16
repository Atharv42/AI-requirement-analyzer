public class Payment {
    private final double amount;
    private int attempts;
    private boolean paid;
    private boolean refunded;
    private static final int MAX_ATTEMPTS = 3;

    public Payment(double amount) {
        this.amount = amount;
    }

    public boolean attempt(boolean success) {
        if (paid || attempts >= MAX_ATTEMPTS) return false;
        attempts++;
        if (success) paid = true;
        return success;
    }

    public boolean canAttempt() { return !paid && attempts < MAX_ATTEMPTS; }
    public boolean isPaid() { return paid; }
    public boolean isRefunded() { return refunded; }
    public int getAttempts() { return attempts; }
    public int getMaxAttempts() { return MAX_ATTEMPTS; }
    public double getAmount() { return amount; }

    public String refundFull() {
        if (!paid || refunded) return "No refund issued";
        refunded = true;
        paid = false;
        return String.format("Full simulated refund issued: %.2f", amount);
    }
}
