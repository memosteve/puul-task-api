import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { User } from '../users/entities/user.entity';

type MockQueryBuilder = {
  leftJoin: jest.Mock;
  innerJoin: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  groupBy: jest.Mock;
  getRawMany: jest.Mock;
};

const createMockQueryBuilder = (): MockQueryBuilder => {
  const qb: Partial<MockQueryBuilder> = {};
  qb.leftJoin = jest.fn().mockReturnValue(qb);
  qb.innerJoin = jest.fn().mockReturnValue(qb);
  qb.select = jest.fn().mockReturnValue(qb);
  qb.addSelect = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.groupBy = jest.fn().mockReturnValue(qb);
  qb.getRawMany = jest.fn();
  return qb as MockQueryBuilder;
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let countQueryBuilder: MockQueryBuilder;
  let efficiencyQueryBuilder: MockQueryBuilder;
  let managerQuery: jest.Mock;

  beforeEach(async () => {
    countQueryBuilder = createMockQueryBuilder();
    efficiencyQueryBuilder = createMockQueryBuilder();
    managerQuery = jest.fn();

    const createQueryBuilder = jest
      .fn()
      .mockReturnValueOnce(countQueryBuilder)
      .mockReturnValueOnce(efficiencyQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            createQueryBuilder,
            manager: { query: managerQuery },
          },
        },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  describe('getProductivityByRole', () => {
    it('combines count rows with cost map and computes completionRate', async () => {
      countQueryBuilder.getRawMany.mockResolvedValue([
        {
          role: 'admin',
          totalUsers: '2',
          activeTasks: '1',
          completedTasks: '3',
        },
        {
          role: 'member',
          totalUsers: '3',
          activeTasks: '4',
          completedTasks: '0',
        },
      ]);
      managerQuery.mockResolvedValue([{ role: 'admin', totalCost: '900.50' }]);
      efficiencyQueryBuilder.getRawMany.mockResolvedValue([]);

      const { productivityByRole } = await service.getAnalytics();

      expect(productivityByRole).toEqual([
        {
          role: 'admin',
          totalUsers: 2,
          totalTasks: 4,
          activeTasks: 1,
          completedTasks: 3,
          completionRate: 75,
          totalCost: 900.5,
        },
        {
          role: 'member',
          totalUsers: 3,
          totalTasks: 4,
          activeTasks: 4,
          completedTasks: 0,
          completionRate: 0,
          totalCost: 0,
        },
      ]);
    });

    it('returns 0 completionRate when role has no tasks', async () => {
      countQueryBuilder.getRawMany.mockResolvedValue([
        {
          role: 'admin',
          totalUsers: '1',
          activeTasks: '0',
          completedTasks: '0',
        },
      ]);
      managerQuery.mockResolvedValue([]);
      efficiencyQueryBuilder.getRawMany.mockResolvedValue([]);

      const { productivityByRole } = await service.getAnalytics();

      expect(productivityByRole[0].completionRate).toBe(0);
      expect(productivityByRole[0].totalCost).toBe(0);
    });
  });

  describe('getTimeEfficiency', () => {
    it('returns efficiencyRate > 100 when user finished faster than estimated', async () => {
      countQueryBuilder.getRawMany.mockResolvedValue([]);
      managerQuery.mockResolvedValue([]);
      efficiencyQueryBuilder.getRawMany.mockResolvedValue([
        {
          userId: 1,
          userName: 'Maria',
          completedTasksCount: '1',
          avgEstimatedHours: '8.5',
          avgActualHours: '7',
        },
      ]);

      const { timeEfficiency } = await service.getAnalytics();

      expect(timeEfficiency).toEqual([
        {
          userId: 1,
          userName: 'Maria',
          completedTasksCount: 1,
          avgEstimatedHours: 8.5,
          avgEstimatedHoursFormatted: '8h 30min',
          avgActualHours: 7,
          avgActualHoursFormatted: '7h',
          efficiencyRate: 121.43,
        },
      ]);
    });

    it('returns efficiencyRate < 100 when user took longer than estimated', async () => {
      countQueryBuilder.getRawMany.mockResolvedValue([]);
      managerQuery.mockResolvedValue([]);
      efficiencyQueryBuilder.getRawMany.mockResolvedValue([
        {
          userId: 2,
          userName: 'Pedro',
          completedTasksCount: '1',
          avgEstimatedHours: '3',
          avgActualHours: '9',
        },
      ]);

      const { timeEfficiency } = await service.getAnalytics();

      expect(timeEfficiency[0].efficiencyRate).toBeCloseTo(33.33, 2);
    });

    it('returns null efficiencyRate when avgActualHours is 0', async () => {
      countQueryBuilder.getRawMany.mockResolvedValue([]);
      managerQuery.mockResolvedValue([]);
      efficiencyQueryBuilder.getRawMany.mockResolvedValue([
        {
          userId: 3,
          userName: 'Empty',
          completedTasksCount: '0',
          avgEstimatedHours: '5',
          avgActualHours: '0',
        },
      ]);

      const { timeEfficiency } = await service.getAnalytics();

      expect(timeEfficiency[0].efficiencyRate).toBeNull();
    });
  });

  describe('getAnalytics', () => {
    it('returns both metrics in parallel', async () => {
      countQueryBuilder.getRawMany.mockResolvedValue([]);
      managerQuery.mockResolvedValue([]);
      efficiencyQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.getAnalytics();

      expect(result).toHaveProperty('productivityByRole');
      expect(result).toHaveProperty('timeEfficiency');
      expect(Array.isArray(result.productivityByRole)).toBe(true);
      expect(Array.isArray(result.timeEfficiency)).toBe(true);
    });
  });
});
