# Release 0.0.2

types of todo's:
- [planning]: create a plan inside the core/docs/release-x folder in a markdown file about steps to be taken to update. (master branch)
- [execute]: execute directly on a separate feature or fix branch 
- [analysis]: create an analysis page with possible solutions to the problem. (master branch)

## features
- product detail:
    - Editing variants or adding a new one is created with some sort of accordion. Move this to a popup/modal. It should also be possible to disable/enable a variant inline [execute]
        - branch: `feature/product-variant-modal`
    - it should be easier to add the product to a collection. Now I have to go to collections first and then add it. [planning]
        - plan: [plan-product-detail.md](plan-product-detail.md)
    - if there is only one default variant, don't show it, fill in the general fields with the data.[planning]
        - plan: [plan-product-detail.md](plan-product-detail.md)

- registrations overview:
    - it should be possible to filter on product variant as well [execute]
        - branch: `feature/registration-variant-filter`

- wc-import line mapping overview
    - the search button does not do a lot anymore. A product picker should be appearing. [execute]
        - branch: `feature/line-mapping-product-picker`

## fixes
- when adding a field rijksregisternumber to the checkout fields in settings > sportscamp. There are 2 fields created on customer details. I think there is some duplicate code with two flows in it. Can you check this? [planning]
    - plan: [plan-duplicate-checkout-fields.md](plan-duplicate-checkout-fields.md)
- it's like I cannot add a new attribute group. Do we still need this anyway? Isn't it easier to add the variants that we need? Why is it possible to change this on the product detail page? Changing variant group, does not change a lot to adding a new variant. [analysis]
    - analysis: [analysis-attribute-groups.md](analysis-attribute-groups.md)
- participant detail: 
    - Adding a registration to a product, has a transparant background when selecting the variant. Change this to white. [execute]
        - branch: `fix/add-registration-variant-background`
        => the variant modal popup is not scrollable. Make this scrollable so all variants are visible. Also make sure only active variants are visible, and be able to toggle to active ones.
    - Can you check if it creates an order. What options do we have to keep the finances up to date? [analysis]
        - analysis: [analysis-admin-registration-finances.md](analysis-admin-registration-finances.md)
- product overview: 
    - keyword filtering is not working for title, it works only with a full word search [execute]
        - branch: `fix/product-grid-keyword-search`
## tasks
- We need to start testing the flows from a user perspective. Recognize the different flows a user can subscribe to a sportcamp and set up a test flow so we can test everything manually. [analysis]
    - analysis: [analysis-user-test-flows.md](analysis-user-test-flows.md)