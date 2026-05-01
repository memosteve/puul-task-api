import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async seed() {
    this.logger.log('Starting database seeding...');

    // Clear join table first, then tables to respect FK constraints
    await this.taskRepository.query(
      'TRUNCATE TABLE user_tasks, tasks, users RESTART IDENTITY CASCADE',
    );

    const users = await this.userRepository.save([
      { name: 'Juan Perez', email: 'juan@example.com', role: 'admin' as const },
      {
        name: 'Maria Lopez',
        email: 'maria@example.com',
        role: 'member' as const,
      },
      {
        name: 'Pedro Garcia',
        email: 'pedro@example.com',
        role: 'member' as const,
      },
      {
        name: 'Ana Martinez',
        email: 'ana@example.com',
        role: 'admin' as const,
      },
      {
        name: 'Carlos Rodriguez',
        email: 'carlos@example.com',
        role: 'member' as const,
      },
    ]);

    this.logger.log(`Created ${users.length} users`);

    const tasks = await this.taskRepository.save([
      {
        title: 'Implement users API',
        description: 'Develop full CRUD for user management',
        estimatedHours: 8.5,
        actualHours: 7.0,
        dueDate: new Date('2024-05-01'),
        status: 'completed' as const,
        cost: 500.0,
        assignedUsers: [users[0], users[1]],
      },
      {
        title: 'Design database schema',
        description: 'Create schema and relations',
        estimatedHours: 4.0,
        actualHours: 5.5,
        dueDate: new Date('2024-04-30'),
        status: 'completed' as const,
        cost: 300.0,
        assignedUsers: [users[0]],
      },
      {
        title: 'Write documentation',
        description: 'README and API docs',
        estimatedHours: 6.0,
        dueDate: new Date('2024-05-02'),
        status: 'active' as const,
        cost: 400.0,
        assignedUsers: [users[1], users[2], users[3]],
      },
      {
        title: 'Configure CI/CD',
        description: 'GitHub Actions pipeline setup',
        estimatedHours: 5.0,
        dueDate: new Date('2024-05-03'),
        status: 'active' as const,
        cost: 450.0,
        assignedUsers: [users[2], users[4]],
      },
      {
        title: 'E2E Testing',
        description: 'Integration tests',
        estimatedHours: 10.0,
        dueDate: new Date('2024-05-04'),
        status: 'active' as const,
        cost: 700.0,
        assignedUsers: users,
      },
    ]);

    this.logger.log(`Created ${tasks.length} tasks`);
    this.logger.log('Database seeding completed!');

    return { users: users.length, tasks: tasks.length };
  }
}
