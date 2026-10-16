# Home Appliance Repair Booking System

A lightweight Java console application that models the lifecycle of a home-appliance repair booking. It uses an explicit state machine to ensure that booking, payment, review, technician, cancellation, and completion events occur only in valid sequences.

This project was created as an IT314 Lab 8 submission. Despite the repository name, it is a repair-booking workflow simulator rather than an AI requirements analyzer.

## Features

- Interactive command-line menu for creating and progressing a sample booking
- State-machine validation for every workflow event
- Simulated payment processing with up to three attempts
- Full simulated refunds for eligible cancellations and service-center rejections
- Protection against invalid transitions, with the current state left unchanged
- Built-in automated test driver covering successful, failed, cancelled, rejected, and invalid flows

## Workflow

```text
BOOKING_CREATED
  -> PAYMENT_PENDING
     -> CENTER_REVIEW
        -> BOOKING_CONFIRMED
           -> TECHNICIAN_ASSIGNED
              -> TECHNICIAN_EN_ROUTE
                 -> SERVICE_IN_PROGRESS
                    -> SERVICE_COMPLETED

PAYMENT_PENDING -> PAYMENT_FAILED -> PAYMENT_PENDING  (retry, maximum 3 attempts)
CENTER_REVIEW   -> BOOKING_REJECTED                  (full refund)
PAYMENT_PENDING, PAYMENT_FAILED, or CENTER_REVIEW -> CANCELLED
```

`BOOKING_REJECTED`, `CANCELLED`, and `SERVICE_COMPLETED` are terminal states. Cancellation is intentionally not permitted once a technician has been assigned.

## Requirements

- Java Development Kit (JDK) 17 or later
- No external dependencies or build tools

The project was tested with OpenJDK 21.

## Getting started

From the project root, compile and start the interactive application:

```powershell
cd src
javac *.java
java Main
```

The menu lets you create/view a booking, process payment, accept or reject the booking, manage technician and service events, cancel an eligible booking, and run the test suite.

## Run the automated tests

```powershell
cd src
javac *.java
java Main --tests
```

The test driver runs seven scenarios and prints `OVERALL RESULT: PASS` when all succeed.

| Test | Scenario |
| --- | --- |
| TC01 | End-to-end successful booking and repair |
| TC02 | Payment failure followed by a successful retry |
| TC03 | Service-center rejection and refund |
| TC04 | Invalid transition handling |
| TC05 | Cancellation before technician assignment and refund |
| TC06 | Rejected cancellation after service starts or completes |
| TC07 | Full technician and service-state progression |

## Project structure

```text
.
├── src/
│   ├── Main.java          # CLI entry point and automated test driver
│   ├── Booking.java       # Booking entity and transition rules
│   ├── BookingState.java  # Workflow states
│   └── Payment.java       # Payment-attempt and refund simulation
├── 202401230_Lab8_UML.pdf
├── 202401230_Lab8_Report.pdf
├── 202401230_Lab8_TestResults.pdf
└── 202401230_Lab8_RunInstructions.txt
```

## Design notes

`Booking` is the workflow authority: each public event method verifies that the booking is in an allowed source state before updating it. Invalid events return a descriptive message without mutating the booking. `Payment` separately tracks amount, attempt count, paid status, and refund status, which keeps payment concerns isolated from the workflow transitions.

The included PDFs contain the UML, report, and recorded test results for the lab submission.
