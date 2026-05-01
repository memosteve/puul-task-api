import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { formatHours } from '../common/utils/format-hours.util';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private formatTask(task: Task) {
    return {
      ...task,
      estimatedHoursFormatted: formatHours(task.estimatedHours),
      actualHoursFormatted:
        task.actualHours !== null ? formatHours(task.actualHours) : null,
    };
  }

  async create(createTaskDto: CreateTaskDto) {
    const { assignedUserIds, ...taskData } = createTaskDto;

    const users = await this.userRepository.findBy({ id: In(assignedUserIds) });

    if (users.length !== assignedUserIds.length) {
      const foundIds = users.map((u) => u.id);
      const missingIds = assignedUserIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Users with IDs ${missingIds.join(', ')} not found`,
      );
    }

    const task = this.taskRepository.create({
      ...taskData,
      assignedUsers: users,
    });
    return this.formatTask(await this.taskRepository.save(task));
  }

  async findAll(filters: FilterTaskDto) {
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedUsers', 'user');

    if (filters.dueDate) {
      qb.andWhere('task.dueDate = :dueDate', { dueDate: filters.dueDate });
    }
    if (filters.title) {
      qb.andWhere('task.title ILIKE :title', { title: `%${filters.title}%` });
    }
    if (filters.status) {
      qb.andWhere('task.status = :status', { status: filters.status });
    }

    // Subqueries keep assignedUsers complete while filtering which tasks are returned
    if (filters.assignedUserId) {
      qb.andWhere(
        `task.id IN (SELECT ut.task_id FROM user_tasks ut WHERE ut.user_id = :userId)`,
        { userId: filters.assignedUserId },
      );
    }
    if (filters.assignedUserName) {
      qb.andWhere(
        `task.id IN (SELECT ut.task_id FROM user_tasks ut JOIN users u ON u.id = ut.user_id WHERE u.name ILIKE :userName)`,
        { userName: `%${filters.assignedUserName}%` },
      );
    }
    if (filters.assignedUserEmail) {
      qb.andWhere(
        `task.id IN (SELECT ut.task_id FROM user_tasks ut JOIN users u ON u.id = ut.user_id WHERE u.email ILIKE :userEmail)`,
        { userEmail: `%${filters.assignedUserEmail}%` },
      );
    }

    qb.orderBy('task.createdAt', 'DESC');

    const tasks = await qb.getMany();
    return tasks.map((task) => this.formatTask(task));
  }

  async update(id: number, updateTaskDto: UpdateTaskDto) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['assignedUsers'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const { assignedUserIds, ...taskData } = updateTaskDto;

    if (assignedUserIds !== undefined) {
      const users = await this.userRepository.findBy({
        id: In(assignedUserIds),
      });

      if (users.length !== assignedUserIds.length) {
        const foundIds = users.map((u) => u.id);
        const missingIds = assignedUserIds.filter(
          (id) => !foundIds.includes(id),
        );
        throw new NotFoundException(
          `Users with IDs ${missingIds.join(', ')} not found`,
        );
      }

      task.assignedUsers = users;
    }

    Object.assign(task, taskData);
    await this.taskRepository.save(task);

    // Re-fetch to return the full entity with all relations populated
    const updated = (await this.taskRepository.findOne({
      where: { id },
      relations: ['assignedUsers'],
    })) as Task;

    return this.formatTask(updated);
  }

  async remove(id: number): Promise<{ message: string; id: number }> {
    const task = await this.taskRepository.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    await this.taskRepository.remove(task);
    return { message: 'Task deleted successfully', id };
  }
}
