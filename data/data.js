use example;

db.Promotion.deleteMany({});

db.Promotion.insertMany([
    
  // product: "$productWithSku(products, 'SKU1')",
  // product: "$productInCategory(products, 'shoes')",
  // product: "$lowestPricedProductInCategory(products, 'shoes')",
    
  {
    _id: "Buy1SKU1andSKU2for15forVIPs",
    name: "Buy SKU1 and SKU2 for €15 for VIP customers",
    when: {
       baseProduct: "$productWithSku(products, 'SKU1')",
        bundledProduct: "$productWithSku(products, 'SKU2')",
    //   baseProduct: "products[sku='SKU1']",
    //   bundledProduct: "products[sku='SKU2']",
      vip: "customer.customerGroup='VIP'"
    },
    then: [{
        action: "createLineDiscount",
        sku: "$baseProduct.sku",
        discount: "(($baseProduct.centAmount + $bundledProduct.centAmount)-1500)/2"
      },{ 
        action: "createLineDiscount",
        sku: "$bundledProduct.sku",
        discount: "(($baseProduct.centAmount + $bundledProduct.centAmount)-1500)/2"
      },{
        action: "tagAsUsed",
        products: [
            { productId: "$baseProduct.id", quantity: "1" },
            { productId: "$bundledProduct.id", quantity: "1" }
        ]
    }],
    times:1
  },
  
  
//   {
//     _id: "10%OffInShoes",
//     name: "10% off on all shoes",
//     when: {
//       product: "products['shoes' in categories][0]"
//     },
//     then: [{
//         action: "createLineDiscount",
//         sku: "$product.sku",
//         discount: "$product.centAmount * 0.1"
//       },{
//         action: "tagAsUsed",
//         products: [{ productId: "$product.id", quantity: "1" }]
//     }],
//     active: false
//   },
  
  
  {
    _id: "3x2InSKU4",
    name: "3x2 on SKU4",
    when: {
      product: "products[sku='SKU4' and quantity>2]"
    },
    then: [{ 
        action: "createLineDiscount",
        sku: "$product.sku",
        discount: "$product.centAmount"
    },{ 
        action: "tagAsUsed", 
        products: [{ productId: "$product.id", quantity: "3" }]
    }]
  },
  
  
  {
    _id: "buy1ShoeGet5OffTrainer",
    name: "Buy 1 Shoe and get €5 off in 1 Trainer",
    when: {
      baseProduct: "products['shoes' in categories][0]",
      secondProduct: "products['trainers' in categories]^(centAmount)[0]",
    },
    then: [{ 
        action: "createLineDiscount",
        sku: "$secondProduct.sku",
        discount: "500"
    },{ 
        action: "tagAsUsed", 
        products: [
            { productId: "$baseProduct.id", quantity: "1" },
            { productId: "$secondProduct.id", quantity: "1" }
        ]
    }]
  },


  {
    _id: "10%OffIn1ShirtFor100SpendOnShoes",
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
    times: 1
  },
  
    {
    _id: "10%OffFor500PlusSpend",
    name: "Spend more than €500 and get 10% off",
    when: {
      totalAfterDiscounts: "total + $sum($discounts.centAmount)"
      bigOrder: "$totalAfterDiscounts>=50000"
    },
    then: [{ 
        action: "createOrderDiscount",
        discount: "$totalAfterDiscounts * 0.1"
    }],
    times: 1
  }


]);

db.Promotion.updateMany({}, {
    $set:{
        projectId: "TestProject",
        version: 0,
        createdAt: "2023-01-15T00:00:00.000+00:00"
    }
});



