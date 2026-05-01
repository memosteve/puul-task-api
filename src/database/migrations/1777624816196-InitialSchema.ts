import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1777624816196 implements MigrationInterface {
  name = 'InitialSchema1777624816196';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum" AS ENUM('active', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" SERIAL NOT NULL, "title" character varying(255) NOT NULL, "description" text, "estimated_hours" numeric(10,2) NOT NULL, "due_date" date NOT NULL, "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'active', "cost" numeric(10,2) NOT NULL, "actual_hours" numeric(10,2), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_707cfc415c7c12d38dfc2ec8eb" ON "tasks" ("due_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6086c8dafbae729a930c04d865" ON "tasks" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb3724030e9674f2c17b7573aa" ON "tasks" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'member')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'member', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_tasks" ("task_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_a22b2734df8bba2b8b7ebd3ae28" PRIMARY KEY ("task_id", "user_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_67a8a20c2e44bfb84ca1a33e6d" ON "user_tasks" ("task_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da349034af45568bdc0ab49314" ON "user_tasks" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tasks" ADD CONSTRAINT "FK_67a8a20c2e44bfb84ca1a33e6df" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tasks" ADD CONSTRAINT "FK_da349034af45568bdc0ab493140" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_tasks" DROP CONSTRAINT "FK_da349034af45568bdc0ab493140"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tasks" DROP CONSTRAINT "FK_67a8a20c2e44bfb84ca1a33e6df"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_da349034af45568bdc0ab49314"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_67a8a20c2e44bfb84ca1a33e6d"`,
    );
    await queryRunner.query(`DROP TABLE "user_tasks"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cb3724030e9674f2c17b7573aa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6086c8dafbae729a930c04d865"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_707cfc415c7c12d38dfc2ec8eb"`,
    );
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
  }
}
