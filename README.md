# Deprecated

This project is not currently under active development, it has been replaced by [this one](https://github.com/ncornag/ecomm).

---

# Promotions

This project is a scalable promotion management system that includes audit logging and cart management capabilities. It leverages MongoDB for data storage and integrates with commercetools for handling cart data.

## Overview

The project provides a robust system for managing promotions, including creation, updates, and synchronization with external services. It also includes audit logging for tracking changes to promotions and an engine for evaluating and applying promotions to customer carts.

## Main Features

- **Promotion Management**: Create, update, and manage promotions with actions like discounts and tagging products.
- **Audit Logging**: Track changes to promotions and other entities with an extensive audit logging system.
- **Cart Management**: Integrate with commercetools to manage customer carts and apply promotions.
- **Promotion Evaluation Engine**: Evaluate promotions based on cart items, applying discounts and tracking promotions.
- **API Documentation**: Fully documented API for managing promotions, audit logs, and carts.

## Project Structure

- **data/**: Contains scripts for creating and managing large datasets (e.g., promotions and carts).
- **src/**: Core application logic.
  - **core/entities/**: Entity definitions for audit logs, promotions, etc.
  - **core/lib/**: Core libraries, including the promotion engine, expressions evaluator, and custom error handling.
  - **core/repositories/**: Data access layer for MongoDB.
  - **core/services/**: Services for managing promotions and audit logs.
  - **infrastructure/**: Database and HTTP configurations, and plugins.
  - **queues/**: Integration with message queues for asynchronous operations.
- **tests/**: Contains test specifications for various functionalities.
- **doc/**: Documentation, including API details.

## Stack

- Fastify
- Typebox
- JSONata
- Mongodb
- NATS
- TypeSense

## Setup Instructions

### Prerequisites

- **Node.js** (v22 or higher)
- **MongoDB** (v4.4 or higher)
- **commercetools SDK**

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository_url>
   cd <repository_directory>
   ```

2. **Install dependencies**:

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Setup Environment Variables**:
   - Copy `.env.template` to `.env` and set the following:
     - `MONGO_URL`: MongoDB connection string
     - `CT_*`: commercetools credentials (auth host, HTTP host, project key, etc.)

### Running the Application

- **To create promotions**:

  ```bash
  node data/createPromotions.ts <number_of_promotions>
  ```

- **To evaluate promotions on a cart**:

  ```bash
  node src/core/lib/promotionsEngine/engine.ts <cart_id>
  ```

- **To run the server**:
  ```bash
  npm start
  # or
  yarn start
  ```

## Usage Examples

- **API Endpoints**:

  - **Create Promotion**: `POST /promotions`
  - **Get Promotion by ID**: `GET /promotions/:id`
  - **Update Promotion**: `PUT /promotions/:id`
  - **Fetch Audit Logs**: `GET /audit-logs`

- **Promotions Management**:

  - Refer to `doc/ecomm.postman_collection.json` for a detailed list of API endpoints and usage examples.

- **Cart Management with commercetools**:
  - Fetch a cart by ID and apply promotions using `CartTools` and the `PromotionService`.

## Example Promotion

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

environment:
project:
cart:

- 1000 lines
- 11 MB REST, 170KB GraphQL
  promotions:
- 500
- all false
  results (GraphQL fetch):
- PromotionsEngine.run in 77.500ms. 500 promotions checked at 6.45 promotions/ms. in a cart with 1000 lines and 5532 products. 0 discounts created.

  - Get cart took 979.828ms
  - 2023-12-18 09:40:47.029 info: #E0Z9l →POST:/promotions/calculate?cartId=21248cde-b22e-4000-b19a-ce6e014f1b4f response with a 200-status took 1096.659ms

- PromotionsEngine.run in 19.814ms. 500 promotions checked at 25.23 promotions/ms. in a cart with 1000 lines and 5532 products. 0 discounts created.
  - Get cart took 798.057ms
  - 2023-12-18 09:43:28.857 info: #UysY8 →POST:/promotions/calculate?cartId=21248cde-b22e-4000-b19a-ce6e014f1b4f response with a 200-status took 830.872ms

## Testing

Run tests using Jest:

```bash
npm test
# or
yarn test
```

## Documentation

API documentation is available in the Postman collection found in the `doc/` directory. The `README.md` file provides additional details on using and extending the API.

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/new-feature`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature/new-feature`).
5. Open a pull request.

## License

This project is UNLICENCED.
