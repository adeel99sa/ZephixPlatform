"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv = require("dotenv");
dotenv.config();
const AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    synchronize: true,
    entities: ['src/**/*.entity.ts'],
    logging: true,
});
AppDataSource.initialize()
    .then(() => {
    console.log('Database synchronized');
    process.exit(0);
})
    .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
