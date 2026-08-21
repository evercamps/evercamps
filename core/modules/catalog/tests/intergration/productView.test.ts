describe('Product page is rendered correctly', () => {
  it('It should return 404 when the product does not exist', () => {
    cy.request({
      url: '/product/123456789',
      failOnStatusCode: false
    }).should((response) => {
      expect(response.status).to.eq(404);
      expect(response.body).to.contain('Not found');
    });
  });

  it('It should return 404 when the product is disabled', () => {
    cy.request({
      url: '/product/product-name',
      failOnStatusCode: false
    }).should((response) => {
      expect(response.status).to.eq(404);
      expect(response.body).to.contain('Not found');
    });
  });
});