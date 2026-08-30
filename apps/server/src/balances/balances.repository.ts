import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalanceEntity } from './balances.entity.js';

export interface AggregateRawRow {
  marketStage: string | null;
  corpType: string | null;
  isCore: string | null;
  value: string | null;
}

@Injectable()
export class BalancesRepository {
  constructor(
    @InjectRepository(BalanceEntity)
    private readonly balanceRepository: Repository<BalanceEntity>,
  ) {}

  async aggregateBalanceByGroup(basisDate: string): Promise<AggregateRawRow[]> {
    return this.balanceRepository
      .createQueryBuilder('balance')
      .select('balance.marketStage', 'marketStage')
      .addSelect('balance.corpType', 'corpType')
      .addSelect('balance.isCore', 'isCore')
      .addSelect('COALESCE(SUM(balance.balanceKrwAmount), 0)', 'value')
      .where('balance.basisDt = :basisDate', { basisDate })
      .groupBy('balance.marketStage')
      .addGroupBy('balance.corpType')
      .addGroupBy('balance.isCore')
      .getRawMany<AggregateRawRow>();
  }
}
