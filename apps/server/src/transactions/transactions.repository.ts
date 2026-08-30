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

export interface TransactionDetailRawRow {
  transaction_type: string;
  inout_type: string | null;
  account_status: string;
  corp_nm: string;
  cust_id: string;
  mem_id: string;
  market_stage: string;
  corp_type: string;
  coin_symbol_nm: string;
  transaction_dtm: Date;
  coin_qty: string;
  krw_amt: string;
  basis_dt: string;
  is_core: string;
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

  async sumTransactionAmountUntil(currentDate: string): Promise<string> {
    const endExclusiveDate = getNextDate(currentDate);
    const row = await this.transactionsRepository
      .createQueryBuilder('corpTransaction')
      .select('COALESCE(SUM(corpTransaction.krwAmount), 0)', 'value')
      .where('corpTransaction.transactionType IN (:...transactionTypes)', {
        transactionTypes: ['매수', '매도'],
      })
      .andWhere('corpTransaction.transactionDateTime >= :startDate', {
        startDate: '2025-01-01',
      })
      .andWhere('corpTransaction.transactionDateTime < :endExclusiveDate', {
        endExclusiveDate,
      })
      .getRawOne<{ value: string | null }>();

    return row?.value ?? '0';
  }

  async findDetailsUntil(
    currentDate: string,
    limit: number,
  ): Promise<TransactionDetailRawRow[]> {
    const endExclusiveDate = getNextDate(currentDate);

    return this.transactionsRepository
      .createQueryBuilder('corpTransaction')
      .select('corpTransaction.transactionType', 'transaction_type')
      .addSelect('corpTransaction.inoutType', 'inout_type')
      .addSelect('corpTransaction.accountStatus', 'account_status')
      .addSelect('corpTransaction.corpName', 'corp_nm')
      .addSelect('corpTransaction.custId', 'cust_id')
      .addSelect('corpTransaction.memId', 'mem_id')
      .addSelect('corpTransaction.marketStage', 'market_stage')
      .addSelect('corpTransaction.corpType', 'corp_type')
      .addSelect('corpTransaction.coinSymbolName', 'coin_symbol_nm')
      .addSelect('corpTransaction.transactionDateTime', 'transaction_dtm')
      .addSelect('corpTransaction.coinQty', 'coin_qty')
      .addSelect('corpTransaction.krwAmount', 'krw_amt')
      .addSelect('corpTransaction.basisDate', 'basis_dt')
      .addSelect('corpTransaction.isCore', 'is_core')
      .where('corpTransaction.transactionDateTime >= :startDate', {
        startDate: '2025-01-01',
      })
      .andWhere('corpTransaction.transactionDateTime < :endExclusiveDate', {
        endExclusiveDate,
      })
      .orderBy('corpTransaction.transactionDateTime', 'DESC')
      .addOrderBy('corpTransaction.custId', 'ASC')
      .limit(limit)
      .getRawMany<TransactionDetailRawRow>();
  }
}
