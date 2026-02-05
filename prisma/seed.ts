import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables for Supabase')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('🌱 Starting database seed...')

  // Create roles
  console.log('Creating roles...')
  
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {
      description: 'Super Administrator with absolute system access and user management',
      permissions: ['*'] // Wildcard for all permissions
    },
    create: {
      name: 'SUPER_ADMIN',
      description: 'Super Administrator with absolute system access and user management',
      permissions: ['*'] // Wildcard for all permissions
    }
  })

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {
      description: 'Administrator with full system access (read/write)',
      permissions: [
        'users:*',
        'customers:*',
        'machines:*',
        'rentals:*',
        'invoices:*',
        'payments:*',
        'gate-passes:*',
        'returns:*',
        'damage-reports:*',
        'brands:*',
        'models:*',
        'machine-types:*',
        'roles:read',
        'settings:*',
        'reports:*'
      ]
    },
    create: {
      name: 'ADMIN',
      description: 'Administrator with full system access (read/write)',
      permissions: [
        'users:*',
        'customers:*',
        'machines:*',
        'rentals:*',
        'invoices:*',
        'payments:*',
        'gate-passes:*',
        'returns:*',
        'damage-reports:*',
        'brands:*',
        'models:*',
        'machine-types:*',
        'roles:read',
        'settings:*',
        'reports:*'
      ]
    }
  })

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {
      description: 'Manager with elevated permissions over most business operations',
      permissions: [
        'users:read',
        'customers:*',
        'machines:read',
        'rentals:*',
        'invoices:*',
        'payments:*',
        'gate-passes:*',
        'returns:*',
        'damage-reports:*',
        'reports:read'
      ]
    },
    create: {
      name: 'MANAGER',
      description: 'Manager with elevated permissions over most business operations',
      permissions: [
        'users:read',
        'customers:*',
        'machines:read',
        'rentals:*',
        'invoices:*',
        'payments:*',
        'gate-passes:*',
        'returns:*',
        'damage-reports:*',
        'reports:read'
      ]
    }
  })

  const operatorRole = await prisma.role.upsert({
    where: { name: 'OPERATOR' },
    update: {
      description: 'Operator with limited operational permissions',
      permissions: [
        'customers:read',
        'machines:read',
        'rentals:read',
        'invoices:read',
        'payments:read',
        'gate-passes:*',
        'returns:read'
      ]
    },
    create: {
      name: 'OPERATOR',
      description: 'Operator with limited operational permissions',
      permissions: [
        'customers:read',
        'machines:read',
        'rentals:read',
        'invoices:read',
        'payments:read',
        'gate-passes:*',
        'returns:read'
      ]
    }
  })

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {
      description: 'Standard user with basic read-only permissions',
      permissions: [
        'customers:read',
        'machines:read',
        'rentals:read',
        'invoices:read',
        'gate-passes:read',
        'returns:read'
      ]
    },
    create: {
      name: 'USER',
      description: 'Standard user with basic read-only permissions',
      permissions: [
        'customers:read',
        'machines:read',
        'rentals:read',
        'invoices:read',
        'gate-passes:read',
        'returns:read'
      ]
    }
  })

  console.log('✅ Roles created:', { 
    superAdmin: superAdminRole.name,
    admin: adminRole.name, 
    manager: managerRole.name,
    operator: operatorRole.name,
    user: userRole.name 
  })

  // Create admin user in Supabase Auth
  console.log('Creating SuperAdmin user...')
  
  const superAdminEmail = 'superadmin@needletech.com'
  const superAdminPassword = 'SuperAdmin@12345'

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingSuperAdmin = existingUsers.users.find(u => u.email === superAdminEmail)

  let superAdminAuthId: string

  if (existingSuperAdmin) {
    console.log('SuperAdmin user already exists in Supabase Auth')
    superAdminAuthId = existingSuperAdmin.id
  } else {
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: superAdminEmail,
      password: superAdminPassword,
      email_confirm: true,
      user_metadata: {
        username: 'superadmin',
        fullName: 'Super Administrator'
      }
    })

    if (error) {
      console.error('❌ Error creating SuperAdmin user in Supabase:', error)
      throw error
    }

    if (!authData.user) {
      throw new Error('No user returned from Supabase')
    }

    superAdminAuthId = authData.user.id
    console.log('✅ SuperAdmin user created in Supabase Auth')
  }

  // Create or update SuperAdmin user in database
  const superAdminUser = await prisma.user.upsert({
    where: { id: superAdminAuthId },
    update: {
      roleId: superAdminRole.id
    },
    create: {
      id: superAdminAuthId,
      username: 'superadmin',
      email: superAdminEmail,
      fullName: 'Super Administrator',
      roleId: superAdminRole.id,
      status: 'ACTIVE'
    }
  })

  console.log('✅ SuperAdmin user created in database:', {
    id: superAdminUser.id,
    username: superAdminUser.username,
    email: superAdminUser.email
  })

  // Create default admin user
  console.log('Creating default Admin user...')
  
  const adminEmail = 'admin@needletech.com'
  const adminPassword = 'Admin@123456'

  const existingAdmin = existingUsers.users.find(u => u.email === adminEmail)

  let adminAuthId: string

  if (existingAdmin) {
    console.log('Admin user already exists in Supabase Auth')
    adminAuthId = existingAdmin.id
  } else {
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        username: 'admin',
        fullName: 'System Administrator'
      }
    })

    if (error) {
      console.error('❌ Error creating admin user in Supabase:', error)
      throw error
    }

    if (!authData.user) {
      throw new Error('No user returned from Supabase')
    }

    adminAuthId = authData.user.id
    console.log('✅ Admin user created in Supabase Auth')
  }

  // Create or update admin user in database
  const adminUser = await prisma.user.upsert({
    where: { id: adminAuthId },
    update: {
      roleId: adminRole.id
    },
    create: {
      id: adminAuthId,
      username: 'admin',
      email: adminEmail,
      fullName: 'System Administrator',
      roleId: adminRole.id,
      status: 'ACTIVE'
    }
  })

  console.log('✅ Admin user created in database:', {
    id: adminUser.id,
    username: adminUser.username,
    email: adminUser.email
  })

  // Create global settings
  console.log('Creating global settings...')
  
  const settings = await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      companyName: 'Needle Tech',
      companyAddress: '123 Business Street, Industrial Area',
      vatRegistrationNumber: 'VAT123456789',
      currency: 'USD',
      defaultCountry: 'US',
      defaultVatRate: 15,
      enableCreditLock: true,
      lockAfterDaysOverdue: 30,
      maxOutstandingForNewRentals: 10000,
      alertDaysOfMonth: [1, 15], // Send alerts on 1st and 15th of each month
      alertChannels: ['EMAIL', 'SMS'],
      invoicePrefix: 'INV',
      invoiceStartNumber: 1000,
      agreementPrefix: 'RNT',
      agreementStartNumber: 1000,
      gatePassPrefix: 'GP',
      gatePassStartNumber: 1000,
      returnPrefix: 'RET',
      returnStartNumber: 1000
    }
  })

  console.log('✅ Settings created:', {
    companyName: settings.companyName,
    currency: settings.currency
  })

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📝 Default User Credentials:')
  console.log('\n   SUPER ADMIN:')
  console.log('   Email:', superAdminEmail)
  console.log('   Password:', superAdminPassword)
  console.log('\n   ADMIN:')
  console.log('   Email:', adminEmail)
  console.log('   Password:', adminPassword)
  console.log('\n⚠️  Please change all default passwords after first login!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
