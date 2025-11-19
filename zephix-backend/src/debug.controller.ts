import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('debug')
export class DebugController {
  constructor(private dataSource: DataSource) {}

  @Get('schema')
  async getSchema() {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const result = await queryRunner.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      return { users_table_schema: result };
    } finally {
      await queryRunner.release();
    }
  }
}
