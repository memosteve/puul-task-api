import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';

type UserRole = 'admin' | 'member';
type TaskStatus = 'active' | 'completed';

interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  completedTasksCount?: number;
  completedTasksTotalCost?: number;
}

interface TaskResponse {
  id: number;
  title: string;
  estimatedHours: number;
  estimatedHoursFormatted: string;
  dueDate: string;
  status: TaskStatus;
  cost: number;
  actualHours: number | null;
  actualHoursFormatted: string | null;
  assignedUsers: UserResponse[];
  createdAt: string;
}

interface AnalyticsRoleResponse {
  role: UserRole;
  totalUsers: number;
  activeTasks: number;
  completedTasks: number;
  completionRate: number;
  totalCost: number;
}

interface AnalyticsTimeEfficiencyResponse {
  userId: number;
  userName: string;
  completedTasksCount: number;
  avgEstimatedHours: number;
  avgEstimatedHoursFormatted: string;
  avgActualHours: number;
  avgActualHoursFormatted: string;
  efficiencyRate: number | null;
}

interface AnalyticsResponse {
  productivityByRole: AnalyticsRoleResponse[];
  timeEfficiency: AnalyticsTimeEfficiencyResponse[];
}

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const runId = Date.now();
  const emailPattern = `%${runId}@test.com`;
  const titlePattern = `%${runId}%`;

  let adminUser: UserResponse;
  let memberUser: UserResponse;
  let secondMemberUser: UserResponse;
  let completedTask: TaskResponse;
  let activeTask: TaskResponse;
  let taskToPatch: TaskResponse;
  let taskToDelete: TaskResponse;

  const http = () => request(app.getHttpServer());

  const createUser = async (
    name: string,
    email: string,
    role: UserRole,
  ): Promise<UserResponse> => {
    const res = await http()
      .post('/users')
      .send({ name, email, role })
      .expect(201);

    return res.body as UserResponse;
  };

  const createTask = async (payload: {
    title: string;
    description?: string;
    estimatedHours: number;
    dueDate: string;
    status: TaskStatus;
    assignedUserIds: number[];
    cost: number;
    actualHours?: number;
  }): Promise<TaskResponse> => {
    const res = await http().post('/tasks').send(payload).expect(201);

    return res.body as TaskResponse;
  };

  beforeAll(async () => {
    process.env.THROTTLE_LIMIT = '1000';
    process.env.THROTTLE_TTL_MS = '60000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);

    adminUser = await createUser(
      `E2E Alpha ${runId}`,
      `e2e-alpha-${runId}@test.com`,
      'admin',
    );
    memberUser = await createUser(
      `E2E Beta ${runId}`,
      `e2e-beta-${runId}@test.com`,
      'member',
    );
    secondMemberUser = await createUser(
      `E2E Gamma ${runId}`,
      `e2e-gamma-${runId}@test.com`,
      'member',
    );

    completedTask = await createTask({
      title: `E2E Completed Primary ${runId}`,
      description: 'Completed fixture task',
      estimatedHours: 8,
      actualHours: 6,
      dueDate: '2030-01-10',
      status: 'completed',
      assignedUserIds: [adminUser.id, memberUser.id],
      cost: 100,
    });

    await createTask({
      title: `E2E Completed Secondary ${runId}`,
      description: 'Second completed fixture task',
      estimatedHours: 4,
      actualHours: 5,
      dueDate: '2030-01-11',
      status: 'completed',
      assignedUserIds: [adminUser.id],
      cost: 250,
    });

    activeTask = await createTask({
      title: `E2E Active Filter ${runId}`,
      description: 'Active fixture task',
      estimatedHours: 3,
      dueDate: '2030-01-12',
      status: 'active',
      assignedUserIds: [memberUser.id],
      cost: 75,
    });

    taskToPatch = await createTask({
      title: `E2E Patch Target ${runId}`,
      description: 'Task to update',
      estimatedHours: 2,
      dueDate: '2030-01-13',
      status: 'active',
      assignedUserIds: [secondMemberUser.id],
      cost: 50,
    });

    taskToDelete = await createTask({
      title: `E2E Delete Target ${runId}`,
      description: 'Task to delete',
      estimatedHours: 1,
      dueDate: '2030-01-14',
      status: 'active',
      assignedUserIds: [secondMemberUser.id],
      cost: 25,
    });
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query('DELETE FROM tasks WHERE title ILIKE $1', [
        titlePattern,
      ]);
      await dataSource.query('DELETE FROM users WHERE email ILIKE $1', [
        emailPattern,
      ]);
    }

    await app.close();
  });

  describe('POST /users', () => {
    it('creates a user and returns 201', async () => {
      const email = `e2e-created-${runId}@test.com`;
      const res = await http()
        .post('/users')
        .send({ name: `E2E Created ${runId}`, email, role: 'admin' })
        .expect(201);

      const body = res.body as UserResponse;
      expect(body.email).toBe(email);
      expect(body.role).toBe('admin');
    });

    it('returns 409 on duplicate email', async () => {
      const email = `e2e-duplicate-${runId}@test.com`;

      await http()
        .post('/users')
        .send({ name: 'Duplicate User', email, role: 'admin' })
        .expect(201);

      await http()
        .post('/users')
        .send({ name: 'Duplicate User', email, role: 'admin' })
        .expect(409);
    });

    it('returns 400 on invalid role', async () => {
      await http()
        .post('/users')
        .send({
          name: 'Invalid Role',
          email: `e2e-invalid-role-${runId}@test.com`,
          role: 'superadmin',
        })
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('returns array of users with completed task stats', async () => {
      const res = await http().get('/users').expect(200);

      const body = res.body as UserResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body[0]).toHaveProperty('completedTasksCount');
      expect(body[0]).toHaveProperty('completedTasksTotalCost');
    });

    it('filters by role', async () => {
      const res = await http()
        .get('/users')
        .query({ role: 'admin' })
        .expect(200);

      const body = res.body as UserResponse[];
      expect(body.length).toBeGreaterThan(0);
      body.forEach((u) => expect(u.role).toBe('admin'));
    });

    it('filters by name and email', async () => {
      const byName = await http()
        .get('/users')
        .query({ name: `Alpha ${runId}` })
        .expect(200);
      const byEmail = await http()
        .get('/users')
        .query({ email: adminUser.email })
        .expect(200);

      expect(byName.body as UserResponse[]).toHaveLength(1);
      expect((byName.body as UserResponse[])[0].id).toBe(adminUser.id);
      expect(byEmail.body as UserResponse[]).toHaveLength(1);
      expect((byEmail.body as UserResponse[])[0].id).toBe(adminUser.id);
    });

    it('calculates completed task count and total cost per user', async () => {
      const adminRes = await http()
        .get('/users')
        .query({ email: adminUser.email })
        .expect(200);
      const memberRes = await http()
        .get('/users')
        .query({ email: memberUser.email })
        .expect(200);

      const admin = (adminRes.body as UserResponse[])[0];
      const member = (memberRes.body as UserResponse[])[0];

      expect(admin.completedTasksCount).toBe(2);
      expect(admin.completedTasksTotalCost).toBe(350);
      expect(member.completedTasksCount).toBe(1);
      expect(member.completedTasksTotalCost).toBe(100);
    });
  });

  describe('POST /tasks', () => {
    it('creates a task assigned to multiple users', async () => {
      const task = await createTask({
        title: `E2E Multi User Task ${runId}`,
        description: 'Task assigned to all fixture users',
        estimatedHours: 5.5,
        dueDate: '2030-01-15',
        status: 'active',
        assignedUserIds: [adminUser.id, memberUser.id, secondMemberUser.id],
        cost: 150,
      });

      expect(task.title).toBe(`E2E Multi User Task ${runId}`);
      expect(task.estimatedHours).toBe(5.5);
      expect(task.estimatedHoursFormatted).toBe('5h 30min');
      expect(task.assignedUsers).toHaveLength(3);
    });

    it('returns 400 when assignedUserIds is empty', async () => {
      await http()
        .post('/tasks')
        .send({
          title: 'Task',
          estimatedHours: 2,
          dueDate: '2024-06-01',
          status: 'active',
          assignedUserIds: [],
          cost: 100,
        })
        .expect(400);
    });

    it('returns 400 on invalid status', async () => {
      await http()
        .post('/tasks')
        .send({
          title: 'Task',
          estimatedHours: 2,
          dueDate: '2024-06-01',
          status: 'pending',
          assignedUserIds: [adminUser.id],
          cost: 100,
        })
        .expect(400);
    });

    it('returns 404 when an assigned user does not exist', async () => {
      await http()
        .post('/tasks')
        .send({
          title: `E2E Missing User ${runId}`,
          estimatedHours: 2,
          dueDate: '2024-06-01',
          status: 'active',
          assignedUserIds: [999999],
          cost: 100,
        })
        .expect(404);
    });
  });

  describe('GET /tasks', () => {
    it('returns tasks ordered by createdAt desc', async () => {
      const res = await http().get('/tasks').expect(200);
      const body = res.body as TaskResponse[];

      expect(Array.isArray(body)).toBe(true);
      for (let i = 1; i < body.length; i += 1) {
        expect(
          new Date(body[i - 1].createdAt).getTime(),
        ).toBeGreaterThanOrEqual(new Date(body[i].createdAt).getTime());
      }
    });

    it('filters by status', async () => {
      const res = await http()
        .get('/tasks')
        .query({ status: 'completed' })
        .expect(200);

      const body = res.body as TaskResponse[];
      expect(body.length).toBeGreaterThan(0);
      body.forEach((t) => expect(t.status).toBe('completed'));
    });

    it('filters by due date and title', async () => {
      const byDueDate = await http()
        .get('/tasks')
        .query({ dueDate: '2030-01-10' })
        .expect(200);
      const byTitle = await http()
        .get('/tasks')
        .query({ title: `Completed Primary ${runId}` })
        .expect(200);

      expect(
        (byDueDate.body as TaskResponse[]).some(
          (t) => t.id === completedTask.id,
        ),
      ).toBe(true);
      expect(byTitle.body as TaskResponse[]).toHaveLength(1);
      expect((byTitle.body as TaskResponse[])[0].id).toBe(completedTask.id);
    });

    it('filters by assigned user id, name, and email', async () => {
      const byUserId = await http()
        .get('/tasks')
        .query({ assignedUserId: memberUser.id })
        .expect(200);
      const byUserName = await http()
        .get('/tasks')
        .query({ assignedUserName: `Beta ${runId}` })
        .expect(200);
      const byUserEmail = await http()
        .get('/tasks')
        .query({ assignedUserEmail: memberUser.email })
        .expect(200);

      for (const res of [byUserId, byUserName, byUserEmail]) {
        const tasks = res.body as TaskResponse[];
        expect(tasks.some((task) => task.id === completedTask.id)).toBe(true);
        expect(tasks.some((task) => task.id === activeTask.id)).toBe(true);
      }
    });

    it('combines filters with AND logic', async () => {
      const res = await http()
        .get('/tasks')
        .query({
          assignedUserId: memberUser.id,
          dueDate: '2030-01-10',
          status: 'completed',
          title: `Completed Primary ${runId}`,
        })
        .expect(200);

      const body = res.body as TaskResponse[];
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(completedTask.id);
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('updates task details and replaces assigned users', async () => {
      const res = await http()
        .patch(`/tasks/${taskToPatch.id}`)
        .send({
          estimatedHours: 7.25,
          status: 'completed',
          actualHours: 6.5,
          assignedUserIds: [adminUser.id, memberUser.id],
        })
        .expect(200);

      const body = res.body as TaskResponse;
      const assignedIds = body.assignedUsers.map((user) => user.id).sort();

      expect(body.status).toBe('completed');
      expect(body.estimatedHours).toBe(7.25);
      expect(body.estimatedHoursFormatted).toBe('7h 15min');
      expect(body.actualHours).toBe(6.5);
      expect(body.actualHoursFormatted).toBe('6h 30min');
      expect(assignedIds).toEqual([adminUser.id, memberUser.id].sort());
    });

    it('returns 404 for non-existent task', async () => {
      await http()
        .patch('/tasks/99999')
        .send({ status: 'completed' })
        .expect(404);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('deletes a task', async () => {
      const res = await http().delete(`/tasks/${taskToDelete.id}`).expect(200);

      expect(res.body).toEqual({
        message: 'Task deleted successfully',
        id: taskToDelete.id,
      });

      const tasks = await http()
        .get('/tasks')
        .query({ title: `Delete Target ${runId}` })
        .expect(200);

      expect(tasks.body as TaskResponse[]).toHaveLength(0);
    });

    it('returns 404 for non-existent task', async () => {
      await http().delete('/tasks/99999').expect(404);
    });
  });

  describe('GET /analytics', () => {
    it('returns productivityByRole and timeEfficiency', async () => {
      const res = await http().get('/analytics').expect(200);

      const body = res.body as AnalyticsResponse;
      expect(body).toHaveProperty('productivityByRole');
      expect(body).toHaveProperty('timeEfficiency');
      expect(Array.isArray(body.productivityByRole)).toBe(true);
      expect(Array.isArray(body.timeEfficiency)).toBe(true);
    });

    it('counts a completed task once per role when multiple same-role users are assigned', async () => {
      const taskCost = 333;
      const beforeRes = await http().get('/analytics').expect(200);
      const beforeBody = beforeRes.body as AnalyticsResponse;
      const beforeMemberMetrics = beforeBody.productivityByRole.find(
        (metric) => metric.role === 'member',
      );

      expect(beforeMemberMetrics).toBeDefined();

      await createTask({
        title: `E2E Same Role Completed ${runId}`,
        description: 'Completed task assigned to two members',
        estimatedHours: 2,
        actualHours: 1.5,
        dueDate: '2030-01-16',
        status: 'completed',
        assignedUserIds: [memberUser.id, secondMemberUser.id],
        cost: taskCost,
      });

      const afterRes = await http().get('/analytics').expect(200);
      const afterBody = afterRes.body as AnalyticsResponse;
      const afterMemberMetrics = afterBody.productivityByRole.find(
        (metric) => metric.role === 'member',
      );

      expect(afterMemberMetrics).toBeDefined();
      expect(afterMemberMetrics?.completedTasks).toBe(
        (beforeMemberMetrics?.completedTasks ?? 0) + 1,
      );
      expect(afterMemberMetrics?.totalCost).toBeCloseTo(
        (beforeMemberMetrics?.totalCost ?? 0) + taskCost,
        2,
      );
    });

    it('returns numeric productivity and time efficiency fields', async () => {
      const res = await http().get('/analytics').expect(200);
      const body = res.body as AnalyticsResponse;

      const adminMetrics = body.productivityByRole.find(
        (metric) => metric.role === 'admin',
      );
      const timeEfficiency = body.timeEfficiency.find(
        (metric) => metric.userId === adminUser.id,
      );

      expect(adminMetrics).toBeDefined();
      expect(typeof adminMetrics?.totalUsers).toBe('number');
      expect(typeof adminMetrics?.completionRate).toBe('number');
      expect(typeof adminMetrics?.totalCost).toBe('number');

      expect(timeEfficiency).toBeDefined();
      expect(typeof timeEfficiency?.completedTasksCount).toBe('number');
      expect(typeof timeEfficiency?.avgEstimatedHours).toBe('number');
      expect(typeof timeEfficiency?.avgActualHours).toBe('number');
      expect(typeof timeEfficiency?.efficiencyRate).toBe('number');
    });
  });
});
