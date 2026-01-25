import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSubscriptionCancelFields1769291697313
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'subscriptions',
      new TableColumn({
        name: 'cancel_at_period_end',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'subscriptions',
      new TableColumn({
        name: 'canceled_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('subscriptions', 'canceled_at');
    await queryRunner.dropColumn('subscriptions', 'cancel_at_period_end');
  }
}
