import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

const decimalTransformer = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v),
};

const nullableDecimalTransformer = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v !== null ? parseFloat(v) : null),
};

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'estimated_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  estimatedHours: number;

  @Index()
  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Index()
  @Column({
    type: 'enum',
    enum: ['active', 'completed'],
    default: 'active',
  })
  status: 'active' | 'completed';

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  cost: number;

  @Column({
    name: 'actual_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: nullableDecimalTransformer,
  })
  actualHours: number | null;

  @ManyToMany(() => User, (user) => user.tasks)
  @JoinTable({
    name: 'user_tasks',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  assignedUsers: User[];

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
