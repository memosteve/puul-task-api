import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { formatHours } from '../common/utils/format-hours.util';

interface ProductivityByRoleRow {
  role: 'admin' | 'member';
  totalUsers: string;
  activeTasks: string;
  completedTasks: string;
  totalCost: string;
}

interface TimeEfficiencyRow {
  userId: number;
  userName: string;
  completedTasksCount: string;
  avgEstimatedHours: string;
  avgActualHours: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getAnalytics() {
    const [productivityByRole, timeEfficiency] = await Promise.all([
      this.getProductivityByRole(),
      this.getTimeEfficiency(),
    ]);

    return { productivityByRole, timeEfficiency };
  }

  /**
   * Metric 1: Productivity breakdown by role (admin vs member).
   * Compares how admins and members perform in terms of task completion,
   * workload distribution, and cost generated.
   * Useful for understanding whether role assignments align with actual workload.
   */
  private async getProductivityByRole() {
    const countRows = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.tasks', 'task')
      .select('user.role', 'role')
      .addSelect('COUNT(DISTINCT user.id)', 'totalUsers')
      .addSelect(
        `COUNT(DISTINCT CASE WHEN task.status = 'active' THEN task.id END)`,
        'activeTasks',
      )
      .addSelect(
        `COUNT(DISTINCT CASE WHEN task.status = 'completed' THEN task.id END)`,
        'completedTasks',
      )
      .groupBy('user.role')
      .getRawMany<Omit<ProductivityByRoleRow, 'totalCost'>>();

    // Separate query: deduplicate (role, task) before SUM to avoid counting
    // a task multiple times when it's assigned to several users in the same role.
    const costRows: { role: 'admin' | 'member'; totalCost: string }[] =
      await this.userRepository.manager.query(`
      SELECT role, COALESCE(SUM(cost), 0) AS "totalCost"
      FROM (
        SELECT DISTINCT u.role, t.id, t.cost
        FROM users u
        INNER JOIN user_tasks ut ON ut.user_id = u.id
        INNER JOIN tasks t ON t.id = ut.task_id
        WHERE t.status = 'completed'
      ) AS unique_role_tasks
      GROUP BY role
    `);

    const costMap = new Map(
      costRows.map((r) => [r.role, parseFloat(r.totalCost) || 0]),
    );

    return countRows.map((row) => {
      const activeTasks = parseInt(row.activeTasks, 10) || 0;
      const completedTasks = parseInt(row.completedTasks, 10) || 0;
      const totalTasks = activeTasks + completedTasks;
      const completionRate =
        totalTasks > 0
          ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(2))
          : 0;

      return {
        role: row.role,
        totalUsers: parseInt(row.totalUsers, 10) || 0,
        totalTasks,
        activeTasks,
        completedTasks,
        completionRate,
        totalCost: costMap.get(row.role) ?? 0,
      };
    });
  }

  /**
   * Metric 2: Time efficiency per user.
   * Compares estimated hours vs actual hours invested for completed tasks.
   * efficiencyRate > 100 means the user finished faster than estimated;
   * < 100 means it took longer.
   * Useful for improving future estimates and identifying performance trends.
   */
  private async getTimeEfficiency() {
    const rows = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.tasks', 'task')
      .select('user.id', 'userId')
      .addSelect('user.name', 'userName')
      .addSelect(`COUNT(DISTINCT task.id)`, 'completedTasksCount')
      .addSelect(`AVG(task.estimated_hours)`, 'avgEstimatedHours')
      .addSelect(`AVG(task.actual_hours)`, 'avgActualHours')
      .where(`task.status = 'completed'`)
      .andWhere(`task.actual_hours IS NOT NULL`)
      .groupBy('user.id')
      .getRawMany<TimeEfficiencyRow>();

    return rows.map((row) => {
      const avgEstimatedHours = parseFloat(row.avgEstimatedHours) || 0;
      const avgActualHours = parseFloat(row.avgActualHours) || 0;

      const efficiencyRate =
        avgActualHours > 0
          ? parseFloat(((avgEstimatedHours / avgActualHours) * 100).toFixed(2))
          : null;

      return {
        userId: row.userId,
        userName: row.userName,
        completedTasksCount: parseInt(row.completedTasksCount, 10) || 0,
        avgEstimatedHours: parseFloat(avgEstimatedHours.toFixed(2)),
        avgEstimatedHoursFormatted: formatHours(avgEstimatedHours),
        avgActualHours: parseFloat(avgActualHours.toFixed(2)),
        avgActualHoursFormatted: formatHours(avgActualHours),
        efficiencyRate,
      };
    });
  }
}
