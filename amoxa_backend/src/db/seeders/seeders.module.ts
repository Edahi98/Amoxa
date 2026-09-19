import { Module } from '@nestjs/common';
import { RolesSeeder } from '@seeders/roles.seeder.js';

@Module({
  providers: [RolesSeeder],
})
export class SeedersModule {}
