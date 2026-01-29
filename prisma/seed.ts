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
  
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrator with full system access',
      permissions: ['*'] // Wildcard for all permissions
    }
  })

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {},
    create: {
      name: 'MANAGER',
      description: 'Manager with elevated permissions',
      permissions: [
        'users:read',
        'customers:*',
        'machines:*',
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

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      description: 'Standard user with basic permissions',
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
    admin: adminRole.name, 
    manager: managerRole.name, 
    user: userRole.name 
  })

  // Create admin user in Supabase Auth
  console.log('Creating admin user...')
  
  const adminEmail = 'admin@needletech.com'
  const adminPassword = 'Admin@123456'

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
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
      passwordHash: '', // Managed by Supabase
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
  console.log('\n📝 Default Admin Credentials:')
  console.log('   Email:', adminEmail)
  console.log('   Password:', adminPassword)
  console.log('\n⚠️  Please change the admin password after first login!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
