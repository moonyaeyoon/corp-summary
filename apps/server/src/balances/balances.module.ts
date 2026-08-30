import { Module } from '@nestjs/common';
import { BalancesController } from './balances.controller.js';
import { BalancesRepository } from './balances.repository.js';
import { BalancesService } from './balances.service.js';

@Module({
  controllers: [BalancesController],
  providers: [BalancesService, BalancesRepository],
})
export class BalancesModule {}
