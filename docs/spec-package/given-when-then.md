# Given–When–Then scenarios

Write business intent with the BA in Hungarian first, then record the executable contract
in English. Keep implementation details out unless they are part of the public contract.

## HU intent → EN executable example (INVENTED)

**Magyar szándék:** A résztvevő lemondhatja a saját, megerősített regisztrációját, ha a
workshop több mint 24 óra múlva kezdődik. A 24 órán belüli próbálkozás ne változtasson állapotot.

### Scenario: owner cancels before the cancellation window closes

**Given** a participant owns a confirmed registration<br>
**And** the workshop starts more than 24 hours later<br>
**When** the participant cancels the registration<br>
**Then** the registration status becomes `cancelled`

### Scenario: cancellation inside the protected window is rejected

**Given** a participant owns a confirmed registration<br>
**And** the workshop starts within 24 hours<br>
**When** the participant requests cancellation<br>
**Then** the request is rejected with code `CANCELLATION_WINDOW_CLOSED`<br>
**And** the persisted registration remains `confirmed`

### Example evidence mapping

| Scenario | Automated evidence | Manual evidence |
|---|---|---|
| owner cancels early | domain/API test + exact command | UI shows cancelled state |
| late cancellation | negative test asserts error and unchanged state | UI shows error and confirmed state |

## Scenario template: `<observable behavior>`

**Given** `<relevant initial state, actor, and permissions>`<br>
**And** `<additional state only when required>`<br>
**When** `<one user or system action>`<br>
**Then** `<observable result>`<br>
**And** `<observable state or side effect, if required>`

### Test mapping

- Acceptance criterion ID:
- Test level/file:
- Exact command:
- Important boundary values:
- State that must remain unchanged on failure:
- Required fake/real adapter contract:
- Manual observation:

Write separate scenarios for denial, invalid input, dependency failure, time boundaries,
and concurrency only when meaningful. One `When` per scenario keeps failures diagnosable.
