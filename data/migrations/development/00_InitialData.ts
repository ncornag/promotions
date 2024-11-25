import promotion from './promotion.json' with { type: "json" };

export async function up(params: any): Promise<void> {
    const db = params.context.server.mongo.db;
    await db.collection('Promotion').insertMany(promotion);
    await db..collection('Promotion').updateMany({}, {
        $set: {
            projectId: "TestProject",
            version: 0,
            createdAt: "2023-01-15T00:00:00.000+00:00"
        }
    });
};

export async function down(context: any): Promise<void> {

};
