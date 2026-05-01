/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';

type MockQueryBuilder = {
  leftJoinAndSelect: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  getMany: jest.Mock;
};

const createMockQueryBuilder = (): MockQueryBuilder => {
  const qb: Partial<MockQueryBuilder> = {};
  qb.leftJoinAndSelect = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.orderBy = jest.fn().mockReturnValue(qb);
  qb.getMany = jest.fn();
  return qb as MockQueryBuilder;
};

const buildTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: 'Task 1',
  description: 'desc',
  estimatedHours: 4,
  actualHours: 3,
  dueDate: new Date('2030-01-01'),
  status: 'completed',
  cost: 100,
  assignedUsers: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let queryBuilder: MockQueryBuilder;

  beforeEach(async () => {
    queryBuilder = createMockQueryBuilder();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findBy: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TasksService);
    taskRepository = module.get(getRepositoryToken(Task));
    userRepository = module.get(getRepositoryToken(User));
  });

  describe('create', () => {
    it('creates a task with assigned users and returns formatted hours', async () => {
      const dto = {
        title: 'New',
        estimatedHours: 8.5,
        dueDate: '2030-01-01',
        status: 'active' as const,
        assignedUserIds: [1, 2],
        cost: 100,
      };
      const users = [{ id: 1 }, { id: 2 }] as User[];
      const built = { ...dto, assignedUsers: users } as unknown as Task;
      const saved = buildTask({
        ...built,
        id: 10,
        estimatedHours: 8.5,
        actualHours: null,
      });

      userRepository.findBy.mockResolvedValue(users);
      taskRepository.create.mockReturnValue(built);
      taskRepository.save.mockResolvedValue(saved);

      const result = await service.create(dto);

      expect(result.estimatedHoursFormatted).toBe('8h 30min');
      expect(result.actualHoursFormatted).toBeNull();
      expect(result.id).toBe(10);
    });

    it('throws NotFoundException when some assigned users are missing', async () => {
      const dto = {
        title: 'New',
        estimatedHours: 1,
        dueDate: '2030-01-01',
        status: 'active' as const,
        assignedUserIds: [1, 999],
        cost: 100,
      };
      userRepository.findBy.mockResolvedValue([{ id: 1 }] as User[]);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns formatted tasks ordered by createdAt desc', async () => {
      const t1 = buildTask({ id: 1, estimatedHours: 4, actualHours: 3 });
      const t2 = buildTask({ id: 2, estimatedHours: 6.25, actualHours: null });
      queryBuilder.getMany.mockResolvedValue([t1, t2]);

      const result = await service.findAll({});

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'task.createdAt',
        'DESC',
      );
      expect(result).toHaveLength(2);
      expect(result[0].estimatedHoursFormatted).toBe('4h');
      expect(result[1].estimatedHoursFormatted).toBe('6h 15min');
      expect(result[1].actualHoursFormatted).toBeNull();
    });

    it('applies subquery for assignedUserId filter', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      await service.findAll({ assignedUserId: 5 });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT ut.task_id FROM user_tasks ut WHERE ut.user_id',
        ),
        { userId: 5 },
      );
    });

    it('applies status, dueDate and title filters when provided', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      await service.findAll({
        status: 'active',
        dueDate: '2030-01-01',
        title: 'foo',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'task.status = :status',
        { status: 'active' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'task.dueDate = :dueDate',
        { dueDate: '2030-01-01' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'task.title ILIKE :title',
        { title: '%foo%' },
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when task does not exist', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(999, { status: 'completed' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when reassigning to missing users', async () => {
      taskRepository.findOne.mockResolvedValue(buildTask());
      userRepository.findBy.mockResolvedValue([]);

      await expect(
        service.update(1, { assignedUserIds: [42] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('saves changes and re-fetches with relations', async () => {
      const existing = buildTask({ id: 1 });
      const updated = buildTask({ id: 1, status: 'completed', actualHours: 5 });

      taskRepository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated);
      taskRepository.save.mockResolvedValue(updated);

      const result = await service.update(1, {
        status: 'completed',
        actualHours: 5,
      });

      expect(taskRepository.save).toHaveBeenCalled();
      expect(result.id).toBe(1);
      expect(result.actualHoursFormatted).toBe('5h');
    });
  });

  describe('remove', () => {
    it('removes task and returns confirmation payload', async () => {
      const task = buildTask({ id: 7 });
      taskRepository.findOne.mockResolvedValue(task);
      taskRepository.remove.mockResolvedValue(task);

      const result = await service.remove(7);

      expect(taskRepository.remove).toHaveBeenCalledWith(task);
      expect(result).toEqual({ message: 'Task deleted successfully', id: 7 });
    });

    it('throws NotFoundException when task does not exist', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
