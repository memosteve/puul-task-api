import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';

interface UserRow {
  user_id: number;
  user_name: string;
  user_email: string;
  user_role: 'admin' | 'member';
  user_created_at: Date;
  user_updated_at: Date;
  completedTasksCount: string;
  completedTasksTotalCost: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(
        `User with email ${createUserDto.email} already exists`,
      );
    }

    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findAll(filters: FilterUserDto) {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.tasks', 'task')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.role',
        'user.createdAt',
        'user.updatedAt',
      ])
      // COUNT only completed tasks; DISTINCT prevents duplicates from the join
      .addSelect(
        `COUNT(DISTINCT CASE WHEN task.status = 'completed' THEN task.id END)`,
        'completedTasksCount',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN task.status = 'completed' THEN task.cost ELSE 0 END), 0)`,
        'completedTasksTotalCost',
      );

    if (filters.name) {
      qb.andWhere('user.name ILIKE :name', { name: `%${filters.name}%` });
    }
    if (filters.email) {
      qb.andWhere('user.email ILIKE :email', { email: `%${filters.email}%` });
    }
    if (filters.role) {
      qb.andWhere('user.role = :role', { role: filters.role });
    }

    qb.groupBy('user.id').orderBy('user.id', 'ASC');

    const rows = await qb.getRawMany<UserRow>();

    return rows.map((row) => ({
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      role: row.user_role,
      completedTasksCount: parseInt(row.completedTasksCount, 10) || 0,
      completedTasksTotalCost: parseFloat(row.completedTasksTotalCost) || 0,
      createdAt: row.user_created_at,
      updatedAt: row.user_updated_at,
    }));
  }
}
