# Release 0.0.3

types of todo's:
- [planning]: create a plan inside the core/docs/release-x folder in a markdown file about steps to be taken to update. (master branch)
- [execute]: execute directly on a separate feature or fix branch 
- [analysis]: create an analysis page with possible solutions to the problem. (master branch)

## features
- emails 
    - create email template logic inside the application. So emails can be sent. Have default emails as a fallback. Smtp settings should be added. Have a log of sent emails, that are auto-erased after x-time. [plan]
    - Create separate plugin to send emails by using brevo. add open, clicked to the email logs [plan]
- attendance tracker: for another website I've made a tool where people can say when they come to the training, now they want to add it as well subscriptions for the sports camps. They want to keep the attendance tracker for the trainings. I think for the camps it can be useful as well though.
    => make it possible to add attendance through a plugin. Just create a big overview over how this can be solved in a simple way. [analysis]
- rijksregisternumber-component: now a text field is used for the rijksregisternumber. there hsould be validation on the frontend wiht proper feedback. There should also be a nice mask to it. Be sure this component is used in every place where the national number field is being used and that it is rendered properly. [plan]

## fixes
- orders
    - A failed or cancelled payment keeps the registration and its seat, and cancelling an order doesn't free the seat either. [analysis]
    - Cancelling an order can delete the same child's registration for another week. [analysis]

## tasks
- variants cleanup: remove the old `variant_group` code, give attributes a fixed role (product or variant), lock the attribute group once variants use it, and add an attribute groups admin page. ADRs 0001-0004 in `docs/adr/`. [planning]
    - plan: [plan-variants-cleanup.md](plan-variants-cleanup.md)
    - stage 1: branch `feature/variants-cleanup-backend`
    - stage 2: branch `feature/attribute-groups-admin`
