import { PrismaClient, RecordStatus, user_status } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

const ROLES = ['Owner', 'Manager', 'Salesman'];

const CATEGORIES = ['SSD', 'HDD', 'NVMe SSD', 'External HDD', 'RAM', 'Accessories'];

const BRANDS = ['Samsung', 'Seagate', 'WD', 'Kingston', 'Crucial', 'ADATA'];

const UNITS = [{ name: 'Piece', shortName: 'Pc' }];

const SETTINGS = [
  { key: 'company_name', value: 'NexaSoft Business Systems' },
  { key: 'company_address', value: 'Lahore, Pakistan' },
  { key: 'company_phone', value: '+92 300 0000000' },
  { key: 'currency', value: 'PKR' },
  { key: 'tax_rate', value: '0' },
];

const SUPER_ADMIN = {
  first_name: 'Super',
  last_name: 'Admin',
  email: 'admin@nexasoft.com',
  password: 'Admin@123',
};

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function main(): Promise<void> {
  console.log('Starting NexaSoft POS database seed...');

  try {
    await prisma.$transaction(async (tx) => {
      
      // 1. Seed Roles
      const roleIdByName = new Map<string, string>();
      for (const roleName of ROLES) {
        const role = await tx.role.upsert({
          where: { name: roleName },
          update: {
            is_system: true,
          },
          create: {
            name: roleName,
            is_system: true,
          },
        });
        roleIdByName.set(roleName, role.id);
        console.log(`[Roles] Ensured role: ${role.name}`);
      }

      // 2. Seed Super Admin User
      const superAdminRoleId = roleIdByName.get('Owner');
      if (!superAdminRoleId) {
        throw new Error('Super Admin role was not seeded correctly; aborting user seed.');
      }

      const existingUser = await tx.user.findUnique({
        where: { email: SUPER_ADMIN.email },
      });

      let userId: string;

      if (existingUser) {
        const updatedUser = await tx.user.update({
          where: { email: SUPER_ADMIN.email },
          data: {
            first_name: SUPER_ADMIN.first_name,
            last_name: SUPER_ADMIN.last_name,
            is_super_admin: true,
            status: user_status.ACTIVE,
          },
        });
        userId = updatedUser.id;
        console.log(`[Users] Updated existing Super Admin: ${updatedUser.email}`);
      } else {
        const password_hash = await bcrypt.hash(SUPER_ADMIN.password, SALT_ROUNDS);
        const newUser = await tx.user.create({
          data: {
            email: SUPER_ADMIN.email,
            password_hash,
            first_name: SUPER_ADMIN.first_name,
            last_name: SUPER_ADMIN.last_name,
            is_super_admin: true,
            status: user_status.ACTIVE,
          },
        });
        userId = newUser.id;
        console.log(`[Users] Created Super Admin user: ${newUser.email}`);
      }

      // 3. Assign Role via user_roles table (Fixed updated_at issue)
      await tx.user_roles.upsert({
        where: {
          user_id_role_id: {
            user_id: userId,
            role_id: superAdminRoleId,
          },
        },
        update: {
          updated_at: new Date(),
        }, 
        create: {
          user_id: userId,
          role_id: superAdminRoleId,
          updated_at: new Date(),
        },
      });
      console.log(`[User Roles] Assigned Super Admin role to user.`);

      // 4. Seed Categories
      for (const catName of CATEGORIES) {
        const slug = generateSlug(catName);
        const category = await tx.category.upsert({
          where: { slug },
          update: {
            name: catName,
            status: RecordStatus.ACTIVE,
          },
          create: {
            name: catName,
            slug,
            status: RecordStatus.ACTIVE,
          },
        });
        console.log(`[Categories] Ensured category: ${category.name}`);
      }

      // 5. Seed Brands
      for (const brandName of BRANDS) {
        const slug = generateSlug(brandName);
        const brand = await tx.brand.upsert({
          where: { slug },
          update: {
            name: brandName,
            status: RecordStatus.ACTIVE,
          },
          create: {
            name: brandName,
            slug,
            status: RecordStatus.ACTIVE,
          },
        });
        console.log(`[Brands] Ensured brand: ${brand.name}`);
      }

      // 6. Seed Units
      for (const unit of UNITS) {
        const existingUnit = await tx.unit.findFirst({
          where: { name: unit.name },
        });

        if (existingUnit) {
          const updatedUnit = await tx.unit.update({
            where: { id: existingUnit.id },
            data: {
              shortName: unit.shortName,
              status: RecordStatus.ACTIVE,
            },
          });
          console.log(`[Units] Updated unit: ${updatedUnit.name}`);
        } else {
          const createdUnit = await tx.unit.create({
            data: {
              name: unit.name,
              shortName: unit.shortName,
              allow_decimal: false,
              status: RecordStatus.ACTIVE,
            },
          });
          console.log(`[Units] Created unit: ${createdUnit.name}`);
        }
      }

      // 7. Seed Settings (Fixed updated_at issue)
      for (const setting of SETTINGS) {
        const createdSetting = await tx.system_settings.upsert({
          where: { key: setting.key },
          update: {
            value: setting.value,
            updated_at: new Date(),
          },
          create: {
            key: setting.key,
            value: setting.value,
            updated_at: new Date(),
          },
        });
        console.log(`[System Settings] Ensured setting: ${createdSetting.key}`);
      }
    }, {
      timeout: 30000,
    });

    console.log('NexaSoft database seed completed successfully.');
  } catch (error) {
    console.error('Failed to seed database within transaction:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Seed failed with an error:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });