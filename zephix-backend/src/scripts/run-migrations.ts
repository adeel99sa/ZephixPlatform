import "reflect-metadata";
import { DataSource } from "typeorm";
import { dataSource } from "../data-source";

async function main() {
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();
  console.log("migrations complete");
}

main().catch(err => {
  console.error("migration failed", err);
  process.exit(1);
});
