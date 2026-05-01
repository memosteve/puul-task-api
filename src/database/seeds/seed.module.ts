import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { UsersModule } from '../../users/users.module';
import { TasksModule } from '../../tasks/tasks.module';

@Module({
  imports: [UsersModule, TasksModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
