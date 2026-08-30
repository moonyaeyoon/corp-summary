import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getNextDate } from '../utils/date.util.js';
import { TransactionEntity } from './transactions.entity.js';

export interface AggregateRawRow {
  marketStage: string | null;
  corpType: string | null;
  isCore: string | null;
  value: string | null;
}

@Injectable()
export class TransactionsRepository {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionsRepository: Repository<TransactionEntity>,
  ) {}

  async aggregateTransactionAmountByGroup(currentDate: string): Promise<AggregateRawRow[]> {
    const endExclusiveDate = getNextDate(currentDate);

    return this.transactionsRepository
      .createQueryBuilder('corpTransaction')
      .select('corpTransaction.marketStage', 'marketStage')
      .addSelect('corpTransaction.corpType', 'corpType')
      .addSelect('corpTransaction.isCore', 'isCore')
      .addSelect('COALESCE(SUM(corpTransaction.krwAmount), 0)', 'value')
      .where('corpTransaction.transactionType IN (:...transactionTypes)', {
        transactionTypes: ['매수', '매도'],
      })
      .andWhere('corpTransaction.transactionDateTime >= :startDate', {
        startDate: '2025-01-01',
      })
      .andWhere('corpTransaction.transactionDateTime < :endExclusiveDate', {
        endExclusiveDate,
      })
      .groupBy('corpTransaction.marketStage')
      .addGroupBy('corpTransaction.corpType')
      .addGroupBy('corpTransaction.isCore')
      .getRawMany<AggregateRawRow>();
  }
}
