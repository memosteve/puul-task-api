import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { UpdateTaskDto } from './update-task.dto';

const validateDto = async (payload: unknown): Promise<ValidationError[]> => {
  const dto = plainToInstance(UpdateTaskDto, payload);
  return validate(dto);
};

const propertyFailed = (errors: ValidationError[], property: string): boolean =>
  errors.some((err) => err.property === property);

describe('UpdateTaskDto', () => {
  describe('non-nullable fields reject null', () => {
    it.each([
      ['title', { title: null }],
      ['estimatedHours', { estimatedHours: null }],
      ['dueDate', { dueDate: null }],
      ['status', { status: null }],
      ['assignedUserIds', { assignedUserIds: null }],
      ['cost', { cost: null }],
    ])('fails validation when %s is null', async (property, payload) => {
      const errors = await validateDto(payload);
      expect(propertyFailed(errors, property)).toBe(true);
    });
  });

  describe('nullable fields accept null', () => {
    it.each([
      ['description', { description: null }],
      ['actualHours', { actualHours: null }],
    ])('passes validation when %s is null', async (_property, payload) => {
      const errors = await validateDto(payload);
      expect(errors).toHaveLength(0);
    });
  });

  describe('omitted fields skip validation', () => {
    it('passes when body is empty (no-op patch)', async () => {
      const errors = await validateDto({});
      expect(errors).toHaveLength(0);
    });

    it('passes when only one field is provided', async () => {
      const errors = await validateDto({ status: 'completed' });
      expect(errors).toHaveLength(0);
    });
  });

  describe('defined values still get validated', () => {
    it('rejects invalid status', async () => {
      const errors = await validateDto({ status: 'pending' });
      expect(propertyFailed(errors, 'status')).toBe(true);
    });

    it('rejects negative estimatedHours', async () => {
      const errors = await validateDto({ estimatedHours: -1 });
      expect(propertyFailed(errors, 'estimatedHours')).toBe(true);
    });

    it.each([['estimatedHours'], ['cost'], ['actualHours']])(
      'rejects %s exceeding numeric(10,2) max (99,999,999.99)',
      async (field) => {
        const errors = await validateDto({ [field]: 100000000 });
        expect(propertyFailed(errors, field)).toBe(true);
      },
    );

    it('rejects duplicate assignedUserIds', async () => {
      const errors = await validateDto({ assignedUserIds: [1, 1, 2] });
      expect(propertyFailed(errors, 'assignedUserIds')).toBe(true);
    });

    it('rejects empty assignedUserIds', async () => {
      const errors = await validateDto({ assignedUserIds: [] });
      expect(propertyFailed(errors, 'assignedUserIds')).toBe(true);
    });

    it('rejects assignedUserIds with more than 100 ids', async () => {
      const tooMany = Array.from({ length: 101 }, (_, i) => i + 1);
      const errors = await validateDto({ assignedUserIds: tooMany });
      expect(propertyFailed(errors, 'assignedUserIds')).toBe(true);
    });

    it('accepts assignedUserIds with exactly 100 ids', async () => {
      const justRight = Array.from({ length: 100 }, (_, i) => i + 1);
      const errors = await validateDto({ assignedUserIds: justRight });
      expect(propertyFailed(errors, 'assignedUserIds')).toBe(false);
    });

    it('accepts a valid full payload', async () => {
      const errors = await validateDto({
        title: 'Updated',
        description: 'New description',
        estimatedHours: 4,
        dueDate: '2030-01-01',
        status: 'completed',
        assignedUserIds: [1, 2],
        cost: 100,
        actualHours: 3.5,
      });
      expect(errors).toHaveLength(0);
    });
  });
});
