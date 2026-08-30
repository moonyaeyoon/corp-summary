import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalancesController } from './balances.controller.js';
import { BalanceEntity } from './balances.entity.js';
import { BalancesRepository } from './balances.repository.js';
import { BalancesService } from './balances.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([BalanceEntity])],
  controllers: [BalancesController],
  providers: [BalancesService, BalancesRepository],
  exports: [BalancesService],
})
export class BalancesModule {}
