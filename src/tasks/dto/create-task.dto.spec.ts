import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

const validateDto = async (payload: unknown): Promise<ValidationError[]> => {
  const dto = plainToInstance(CreateTaskDto, payload);
  return validate(dto);
};

const propertyFailed = (errors: ValidationError[], property: string): boolean =>
  errors.some((err) => err.property === property);

const validBase = {
  title: 'New task',
  estimatedHours: 4,
  dueDate: '2030-01-01',
  status: 'active',
  assignedUserIds: [1, 2],
  cost: 100,
};

describe('CreateTaskDto', () => {
  describe('valid payload', () => {
    it('accepts a valid full payload', async () => {
      const errors = await validateDto({
        ...validBase,
        description: 'A description',
        actualHours: 3.5,
      });
      expect(errors).toHaveLength(0);
    });

    it('accepts a valid minimal payload', async () => {
      const errors = await validateDto(validBase);
      expect(errors).toHaveLength(0);
    });
  });

  describe('required fields', () => {
    it.each([
      'title',
      'estimatedHours',
      'dueDate',
      'status',
      'assignedUserIds',
      'cost',
    ])('rejects missing %s', async (field) => {
      const payload = { ...validBase } as Record<string, unknown>;
      delete payload[field];
      const errors = await validateDto(payload);
      expect(propertyFailed(errors, field)).toBe(true);
    });
  });

  describe('field-level validations', () => {
    it('rejects title longer than 255 chars', async () => {
      const errors = await validateDto({
        ...validBase,
        title: 'a'.repeat(256),
      });
      expect(propertyFailed(errors, 'title')).toBe(true);
    });

    it('rejects description longer than 5000 chars', async () => {
      const errors = await validateDto({
        ...validBase,
        description: 'a'.repeat(5001),
      });
      expect(propertyFailed(errors, 'description')).toBe(true);
    });

    it('rejects negative estimatedHours', async () => {
      const errors = await validateDto({ ...validBase, estimatedHours: -1 });
      expect(propertyFailed(errors, 'estimatedHours')).toBe(true);
    });

    it.each([
      ['estimatedHours', 'estimatedHours'],
      ['cost', 'cost'],
      ['actualHours', 'actualHours'],
    ])(
      'rejects %s exceeding numeric(10,2) max (99,999,999.99)',
      async (_label, field) => {
        const errors = await validateDto({ ...validBase, [field]: 100000000 });
        expect(propertyFailed(errors, field)).toBe(true);
      },
    );

    it('accepts numeric fields at the exact maximum 99,999,999.99', async () => {
      const errors = await validateDto({
        ...validBase,
        estimatedHours: 99999999.99,
        cost: 99999999.99,
        actualHours: 99999999.99,
      });
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid status', async () => {
      const errors = await validateDto({ ...validBase, status: 'pending' });
      expect(propertyFailed(errors, 'status')).toBe(true);
    });
  });

  describe('assignedUserIds bounds', () => {
    it('rejects empty array', async () => {
      const errors = await validateDto({ ...validBase, assignedUserIds: [] });
      expect(propertyFailed(errors, 'assignedUserIds')).toBe(true);
    });

    it('rejects duplicates', async () => {
      const errors = await validateDto({
        ...validBase,
        assignedUserIds: [1, 1, 2],
      });
      expect(propertyFailed(errors, 'assignedUserIds')).toBe(true);
    });

    it('rejects more than 100 ids', async () => {
      const tooMany = Array.from({ length: 101 }, (_, i) => i + 1);
      const errors = await validateDto({
        ...validBase,
        assignedUserIds: tooMany,
      });
      expect(propertyFailed(errors, 'assignedUserIds')).toBe(true);
    });

    it('accepts exactly 100 ids', async () => {
      const justRight = Array.from({ length: 100 }, (_, i) => i + 1);
      const errors = await validateDto({
        ...validBase,
        assignedUserIds: justRight,
      });
      expect(propertyFailed(errors, 'assignedUserIds')).toBe(false);
    });

    it('rejects non-integer ids', async () => {
      const errors = await validateDto({
        ...validBase,
        assignedUserIds: [1.5, 2],
      });
      expect(propertyFailed(errors, 'assignedUserIds')).toBe(true);
    });

    it('rejects ids less than 1', async () => {
      const errors = await validateDto({
        ...validBase,
        assignedUserIds: [0, 1],
      });
      expect(propertyFailed(errors, 'assignedUserIds')).toBe(true);
    });
  });
});
