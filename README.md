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