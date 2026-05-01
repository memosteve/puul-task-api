import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

const validateDto = async (payload: unknown): Promise<ValidationError[]> => {
  const dto = plainToInstance(CreateUserDto, payload);
  return validate(dto);
};

const propertyFailed = (errors: ValidationError[], property: string): boolean =>
  errors.some((err) => err.property === property);

describe('CreateUserDto', () => {
  it('accepts a valid payload', async () => {
    const errors = await validateDto({
      name: 'Alice',
      email: 'alice@example.com',
      role: 'admin',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects email longer than 255 chars', async () => {
    // Build an email that is syntactically valid but exceeds 255 chars
    const local = 'a'.repeat(250);
    const errors = await validateDto({
      name: 'Alice',
      email: `${local}@x.com`,
      role: 'admin',
    });
    expect(propertyFailed(errors, 'email')).toBe(true);
  });

  it('rejects malformed email', async () => {
    const errors = await validateDto({
      name: 'Alice',
      email: 'not-an-email',
      role: 'admin',
    });
    expect(propertyFailed(errors, 'email')).toBe(true);
  });

  it('rejects invalid role', async () => {
    const errors = await validateDto({
      name: 'Alice',
      email: 'alice@example.com',
      role: 'superadmin',
    });
    expect(propertyFailed(errors, 'role')).toBe(true);
  });

  it('rejects empty name', async () => {
    const errors = await validateDto({
      name: '',
      email: 'alice@example.com',
      role: 'admin',
    });
    expect(propertyFailed(errors, 'name')).toBe(true);
  });

  it('rejects name longer than 255 chars', async () => {
    const errors = await validateDto({
      name: 'a'.repeat(256),
      email: 'alice@example.com',
      role: 'admin',
    });
    expect(propertyFailed(errors, 'name')).toBe(true);
  });
});
