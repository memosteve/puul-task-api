/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

type MockQueryBuilder = {
  leftJoin: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  andWhere: jest.Mock;
  groupBy: jest.Mock;
  orderBy: jest.Mock;
  getRawMany: jest.Mock;
};

const createMockQueryBuilder = (): MockQueryBuilder => {
  const qb: Partial<MockQueryBuilder> = {};
  qb.leftJoin = jest.fn().mockReturnValue(qb);
  qb.select = jest.fn().mockReturnValue(qb);
  qb.addSelect = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.groupBy = jest.fn().mockReturnValue(qb);
  qb.orderBy = jest.fn().mockReturnValue(qb);
  qb.getRawMany = jest.fn();
  return qb as MockQueryBuilder;
};

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;
  let queryBuilder: MockQueryBuilder;

  beforeEach(async () => {
    queryBuilder = createMockQueryBuilder();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  describe('create', () => {
    it('returns the saved user on success', async () => {
      const dto = { name: 'Alice', email: 'a@x.com', role: 'admin' as const };
      const created = { ...dto } as User;
      const saved = { id: 1, ...dto } as User;

      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(saved);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(repository.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(saved);
    });

    it('throws ConflictException when DB raises 23505 (duplicate email)', async () => {
      const dto = { name: 'Alice', email: 'a@x.com', role: 'admin' as const };
      const dbError = new QueryFailedError('insert', [], new Error('dup'));
      (dbError as QueryFailedError & { code: string }).code = '23505';

      repository.create.mockReturnValue(dto as User);
      repository.save.mockRejectedValue(dbError);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('rethrows non-23505 query errors', async () => {
      const dto = { name: 'Alice', email: 'a@x.com', role: 'admin' as const };
      const dbError = new QueryFailedError('insert', [], new Error('other'));
      (dbError as QueryFailedError & { code: string }).code = '23502';

      repository.create.mockReturnValue(dto as User);
      repository.save.mockRejectedValue(dbError);

      await expect(service.create(dto)).rejects.toThrow(QueryFailedError);
    });
  });

  describe('findAll', () => {
    it('maps raw rows into the public response shape', async () => {
      queryBuilder.getRawMany.mockResolvedValue([
        {
          user_id: 1,
          user_name: 'Alice',
          user_email: 'a@x.com',
          user_role: 'admin',
          user_created_at: new Date('2024-01-01'),
          user_updated_at: new Date('2024-01-02'),
          completedTasksCount: '3',
          completedTasksTotalCost: '450.50',
        },
      ]);

      const result = await service.findAll({});

      expect(result).toEqual([
        {
          id: 1,
          name: 'Alice',
          email: 'a@x.com',
          role: 'admin',
          completedTasksCount: 3,
          completedTasksTotalCost: 450.5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ]);
    });

    it('applies role filter when provided', async () => {
      queryBuilder.getRawMany.mockResolvedValue([]);

      await service.findAll({ role: 'admin' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: 'admin',
      });
    });

    it('applies name and email filters with ILIKE wildcard', async () => {
      queryBuilder.getRawMany.mockResolvedValue([]);

      await service.findAll({ name: 'ali', email: 'x.com' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.name ILIKE :name',
        { name: '%ali%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.email ILIKE :email',
        { email: '%x.com%' },
      );
    });

    it('returns empty array when no users match', async () => {
      queryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.findAll({});

      expect(result).toEqual([]);
    });

    it('defaults completedTasksCount and totalCost to 0 when null', async () => {
      queryBuilder.getRawMany.mockResolvedValue([
        {
          user_id: 1,
          user_name: 'Alice',
          user_email: 'a@x.com',
          user_role: 'admin',
          user_created_at: new Date(),
          user_updated_at: new Date(),
          completedTasksCount: null,
          completedTasksTotalCost: null,
        },
      ]);

      const result = await service.findAll({});

      expect(result[0].completedTasksCount).toBe(0);
      expect(result[0].completedTasksTotalCost).toBe(0);
    });
  });
});
