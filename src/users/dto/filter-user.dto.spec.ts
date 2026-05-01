import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { FilterUserDto } from './filter-user.dto';

const validateDto = async (payload: unknown): Promise<ValidationError[]> => {
  const dto = plainToInstance(FilterUserDto, payload);
  return validate(dto);
};

const propertyFailed = (errors: ValidationError[], property: string): boolean =>
  errors.some((err) => err.property === property);

describe('FilterUserDto', () => {
  it('accepts an empty filter set', async () => {
    const errors = await validateDto({});
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid combined filter', async () => {
    const errors = await validateDto({
      name: 'Alice',
      email: 'alice@example.com',
      role: 'admin',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts each filter individually', async () => {
    expect(await validateDto({ name: 'Alice' })).toHaveLength(0);
    expect(await validateDto({ email: 'alice@example.com' })).toHaveLength(0);
    expect(await validateDto({ role: 'member' })).toHaveLength(0);
  });

  it('rejects invalid role', async () => {
    const errors = await validateDto({ role: 'superadmin' });
    expect(propertyFailed(errors, 'role')).toBe(true);
  });

  it('rejects non-string name', async () => {
    const errors = await validateDto({ name: 123 });
    expect(propertyFailed(errors, 'name')).toBe(true);
  });

  it('rejects non-string email', async () => {
    const errors = await validateDto({ email: 123 });
    expect(propertyFailed(errors, 'email')).toBe(true);
  });
});
