# Release 0.0.3

types of todo's:
- [planning]: create a plan inside the core/docs/release-x folder in a markdown file about steps to be taken to update. (master branch)
- [execute]: execute directly on a separate feature or fix branch 
- [analysis]: create an analysis page with possible solutions to the problem. (master branch)

## features
- emails 
    - create email template logic inside the application. So emails can be sent. Have default emails as a fallback. Smtp settings should be added. Have a log of sent emails. [analysis]
    - Create separate plugin to send emails by using brevo. add open, clicked to the email logs [analysis]

## fixes
- orders
    - A failed or cancelled payment keeps the registration and its seat, and cancelling an order doesn't free the seat either. [analysis]
    - Cancelling an order can delete the same child's registration for another week.

## tasks
