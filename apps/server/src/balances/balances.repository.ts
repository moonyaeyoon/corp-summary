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

export interface BalanceDetailRawRow {
  basis_dt: string;
  cust_id: string;
  mem_id: string;
  account_status: string;
  kyc_status: string;
  corp_nm: string;
  market_stage: string;
  corp_type: string;
  is_core: string;
  coin_symbol_nm: string;
  coin_qty: string;
  balance_krw_amt: string;
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

  async findLatestBasisDateOnOrBefore(currentDate: string): Promise<string | null> {
    const row = await this.balanceRepository
      .createQueryBuilder('balance')
      .select('MAX(balance.basisDt)', 'basisDate')
      .where('balance.basisDt <= :currentDate', { currentDate })
      .getRawOne<{ basisDate: string | null }>();

    return row?.basisDate ?? null;
  }

  async sumBalanceByBasisDate(basisDate: string): Promise<string> {
    const row = await this.balanceRepository
      .createQueryBuilder('balance')
      .select('COALESCE(SUM(balance.balanceKrwAmount), 0)', 'value')
      .where('balance.basisDt = :basisDate', { basisDate })
      .getRawOne<{ value: string | null }>();

    return row?.value ?? '0';
  }

  async findDetailsByBasisDate(
    basisDate: string,
    limit: number,
  ): Promise<BalanceDetailRawRow[]> {
    return this.balanceRepository
      .createQueryBuilder('balance')
      .select('balance.basisDt', 'basis_dt')
      .addSelect('balance.custId', 'cust_id')
      .addSelect('balance.memId', 'mem_id')
      .addSelect('balance.accountStatus', 'account_status')
      .addSelect('balance.kycStatus', 'kyc_status')
      .addSelect('balance.corpName', 'corp_nm')
      .addSelect('balance.marketStage', 'market_stage')
      .addSelect('balance.corpType', 'corp_type')
      .addSelect('balance.isCore', 'is_core')
      .addSelect('balance.coinSymbolName', 'coin_symbol_nm')
      .addSelect('balance.coinQty', 'coin_qty')
      .addSelect('balance.balanceKrwAmount', 'balance_krw_amt')
      .where('balance.basisDt = :basisDate', { basisDate })
      .orderBy('balance.corpName', 'ASC')
      .addOrderBy('balance.coinSymbolName', 'ASC')
      .limit(limit)
      .getRawMany<BalanceDetailRawRow>();
  }
}
