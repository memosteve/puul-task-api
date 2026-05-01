import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { FilterTaskDto } from './filter-task.dto';

const validateDto = async (payload: unknown): Promise<ValidationError[]> => {
  const dto = plainToInstance(FilterTaskDto, payload, {
    enableImplicitConversion: true,
  });
  return validate(dto);
};

const propertyFailed = (errors: ValidationError[], property: string): boolean =>
  errors.some((err) => err.property === property);

describe('FilterTaskDto', () => {
  it('accepts an empty filter set', async () => {
    const errors = await validateDto({});
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid combined filter', async () => {
    const errors = await validateDto({
      status: 'active',
      title: 'docs',
      assignedUserId: 5,
      assignedUserName: 'Alice',
      assignedUserEmail: 'alice@example.com',
      dueDate: '2030-01-01',
    });
    expect(errors).toHaveLength(0);
  });

  describe('assignedUserId bounds', () => {
    it('rejects assignedUserId of 0', async () => {
      const errors = await validateDto({ assignedUserId: 0 });
      expect(propertyFailed(errors, 'assignedUserId')).toBe(true);
    });

    it('rejects negative assignedUserId', async () => {
      const errors = await validateDto({ assignedUserId: -5 });
      expect(propertyFailed(errors, 'assignedUserId')).toBe(true);
    });

    it('accepts assignedUserId of 1 (smallest valid SERIAL)', async () => {
      const errors = await validateDto({ assignedUserId: 1 });
      expect(errors).toHaveLength(0);
    });

    it('rejects non-integer assignedUserId', async () => {
      const errors = await validateDto({ assignedUserId: 1.5 });
      expect(propertyFailed(errors, 'assignedUserId')).toBe(true);
    });
  });

  it('rejects invalid status', async () => {
    const errors = await validateDto({ status: 'pending' });
    expect(propertyFailed(errors, 'status')).toBe(true);
  });

  it('rejects malformed dueDate', async () => {
    const errors = await validateDto({ dueDate: 'not-a-date' });
    expect(propertyFailed(errors, 'dueDate')).toBe(true);
  });
});
