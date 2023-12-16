# e-commerce Promotions Engine with JSONata and Mongodb

```
{
  _id: "10%OffIn1ShirtFor100SpendOnShoes",
  projectId: "TestProject",
  name: "Spend more than €100 in shoes and get 10% off in one shirt",
  when: {
    shoesTotal: "$sum(products['shoes' in categories].(centAmount*quantity))>10000",
    shirt: "products['shirts' in categories]^(centAmount)[0]",
  },
  then: [{ 
      action: "createLineDiscount",
      sku: "$shirt.sku",
      discount: "$shirt.centAmount * 0.1"
  },{ 
      action: "tagAsUsed", 
      products: [{ productId: "$shirt.id", quantity: "1" }] 
  }],
  times: 1,
  version: 0,
  createdAt: "2023-01-15T00:00:00.000+00:00"
}
```

## Performance
environment: api.europe-west1.gcp.ctdev.tech
project: large-carts-line-items-01
cart: 21248cde-b22e-4000-b19a-ce6e014f1b4f
  - 1000 lines
  - 11 MB REST, 170KB GraphQL
promotions:
  - 500
  - all false
results (GraphQL fetch):
  - PromotionsEngine.run in 77.500ms. 500 promotions checked at 6.45 promotions/ms. in a cart with 1000 lines and 5532 products. 0 discounts created.
    - Get cart took 979.828ms
    - 2023-12-18 09:40:47.029  info: #E0Z9l →POST:/promotions/calculate?cartId=21248cde-b22e-4000-b19a-ce6e014f1b4f response with a 200-status took 1096.659ms

  - PromotionsEngine.run in 19.814ms. 500 promotions checked at 25.23 promotions/ms. in a cart with 1000 lines and 5532 products. 0 discounts created.
    - Get cart took 798.057ms
    - 2023-12-18 09:43:28.857  info: #UysY8 →POST:/promotions/calculate?cartId=21248cde-b22e-4000-b19a-ce6e014f1b4f response with a 200-status took 830.872ms
