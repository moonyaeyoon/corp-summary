import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller.js';
import { OnboardingRepository } from './onboarding.repository.js';
import { OnboardingService } from './onboarding.service.js';

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingRepository],
})
export class OnboardingModule {}
