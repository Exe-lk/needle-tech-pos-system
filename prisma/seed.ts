import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

// Initialize Prisma with pg adapter (required for Prisma 7 with PostgreSQL in ESM mode)
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('🌱 Starting database seed...')

  // 1. Create Super Admin Role
  console.log('📝 Creating Super Admin role...')
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {
      description: 'Super Administrator with full system access',
      permissions: ['*']
    },
    create: {
      name: 'SUPER_ADMIN',
      description: 'Super Administrator with full system access',
      permissions: ['*']
    }
  })
  console.log('✅ Super Admin role created')

  // 2. Create Super Admin User in Supabase Auth
  console.log('👤 Creating Super Admin user in Supabase...')
  const email = 'admin@needletech.com'
  const password = 'admin123'

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  let userId: string

  const existingUser = existingUsers.users.find(u => u.email === email)

  if (existingUser) {
    console.log('⚠️  Super Admin already exists in Supabase Auth')
    userId = existingUser.id
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username: 'admin',
        fullName: 'Super Administrator'
      }
    })

    if (error) throw error
    if (!data.user) throw new Error('No user returned from Supabase')

    userId = data.user.id
    console.log('✅ Super Admin created in Supabase Auth')
  }

  // 3. Create Super Admin User in Database
  console.log('💾 Creating Super Admin user in database...')
  await prisma.user.upsert({
    where: { id: userId },
    update: {
      roleId: superAdminRole.id,
      status: 'ACTIVE'
    },
    create: {
      id: userId,
      username: 'admin',
      email: email,
      fullName: 'Super Administrator',
      roleId: superAdminRole.id,
      status: 'ACTIVE'
    }
  })
  console.log('✅ Super Admin user ready in database')

  // 4. Create default settings
  console.log('⚙️  Creating default settings...')
  await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      companyName: 'Needle Tech',
      currency: 'USD',
      defaultVatRate: 15,
      alertDaysOfMonth: [1, 15],
      alertChannels: ['EMAIL']
    }
  })
  console.log('✅ Settings created')

  // 5. Create Brands
  console.log('🏷️  Creating brands...')
  const brandBrother = await prisma.brand.upsert({
    where: { name: 'Brother' },
    update: {},
    create: {
      name: 'Brother',
      code: 'BROTHER',
      description: 'Brother sewing machines'
    }
  })

  const brandSinger = await prisma.brand.upsert({
    where: { name: 'Singer' },
    update: {},
    create: {
      name: 'Singer',
      code: 'SINGER',
      description: 'Singer sewing machines'
    }
  })

  const brandJanome = await prisma.brand.upsert({
    where: { name: 'Janome' },
    update: {},
    create: {
      name: 'Janome',
      code: 'JANOME',
      description: 'Janome sewing machines'
    }
  })

  const brandJuki = await prisma.brand.upsert({
    where: { name: 'Juki' },
    update: {},
    create: {
      name: 'Juki',
      code: 'JUKI',
      description: 'Juki industrial sewing machines'
    }
  })
  console.log('✅ Brands created')

  // 6. Create Machine Types
  console.log('🔧 Creating machine types...')
  const typeDomestic = await prisma.machineType.upsert({
    where: { name: 'Domestic' },
    update: {},
    create: {
      name: 'Domestic',
      code: 'DOMESTIC',
      description: 'Domestic sewing machines'
    }
  })

  const typeIndustrial = await prisma.machineType.upsert({
    where: { name: 'Industrial' },
    update: {},
    create: {
      name: 'Industrial',
      code: 'INDUSTRIAL',
      description: 'Industrial sewing machines'
    }
  })

  const typeEmbroidery = await prisma.machineType.upsert({
    where: { name: 'Embroidery' },
    update: {},
    create: {
      name: 'Embroidery',
      code: 'EMBROIDERY',
      description: 'Embroidery machines'
    }
  })

  const typeOverlock = await prisma.machineType.upsert({
    where: { name: 'Overlock' },
    update: {},
    create: {
      name: 'Overlock',
      code: 'OVERLOCK',
      description: 'Overlock machines'
    }
  })
  console.log('✅ Machine types created')

  // 7. Create Models
  console.log('📦 Creating models...')
  const modelXL2600i = await prisma.model.upsert({
    where: { name_brandId: { name: 'XL2600i', brandId: brandBrother.id } },
    update: {},
    create: {
      name: 'XL2600i',
      brandId: brandBrother.id,
      code: 'XL2600I',
      description: 'Brother XL2600i sewing machine'
    }
  })

  const modelHeavyDuty4423 = await prisma.model.upsert({
    where: { name_brandId: { name: 'Heavy Duty 4423', brandId: brandSinger.id } },
    update: {},
    create: {
      name: 'Heavy Duty 4423',
      brandId: brandSinger.id,
      code: 'HD4423',
      description: 'Singer Heavy Duty 4423'
    }
  })

  const modelHD3000 = await prisma.model.upsert({
    where: { name_brandId: { name: 'HD3000', brandId: brandJanome.id } },
    update: {},
    create: {
      name: 'HD3000',
      brandId: brandJanome.id,
      code: 'HD3000',
      description: 'Janome HD3000'
    }
  })

  const modelMO654DE = await prisma.model.upsert({
    where: { name_brandId: { name: 'MO-654DE', brandId: brandJuki.id } },
    update: {},
    create: {
      name: 'MO-654DE',
      brandId: brandJuki.id,
      code: 'MO654DE',
      description: 'Juki MO-654DE overlock'
    }
  })
  console.log('✅ Models created')

  // 8. Create Machines
  console.log('🖥️  Creating machines...')
  const machines = [
    {
      brandId: brandBrother.id,
      modelId: modelXL2600i.id,
      typeId: typeDomestic.id,
      serialNumber: 'BROTHER-XL2600I-SN-001',
      boxNumber: 'BROTHER-XL2600I-BOX-001',
      qrCodeValue: 'BROTHER-XL2600I-SN-001',
      status: 'AVAILABLE' as const
    },
    {
      brandId: brandBrother.id,
      modelId: modelXL2600i.id,
      typeId: typeDomestic.id,
      serialNumber: 'BROTHER-XL2600I-SN-002',
      boxNumber: 'BROTHER-XL2600I-BOX-002',
      qrCodeValue: 'BROTHER-XL2600I-SN-002',
      status: 'AVAILABLE' as const
    },
    {
      brandId: brandSinger.id,
      modelId: modelHeavyDuty4423.id,
      typeId: typeIndustrial.id,
      serialNumber: 'SINGER-HD4423-SN-001',
      boxNumber: 'SINGER-HD4423-BOX-001',
      qrCodeValue: 'SINGER-HD4423-SN-001',
      status: 'AVAILABLE' as const
    },
    {
      brandId: brandJanome.id,
      modelId: modelHD3000.id,
      typeId: typeDomestic.id,
      serialNumber: 'JANOME-HD3000-SN-001',
      boxNumber: 'JANOME-HD3000-BOX-001',
      qrCodeValue: 'JANOME-HD3000-SN-001',
      status: 'AVAILABLE' as const
    },
    {
      brandId: brandJuki.id,
      modelId: modelMO654DE.id,
      typeId: typeOverlock.id,
      serialNumber: 'JUKI-MO654DE-SN-001',
      boxNumber: 'JUKI-MO654DE-BOX-001',
      qrCodeValue: 'JUKI-MO654DE-SN-001',
      status: 'AVAILABLE' as const
    }
  ]

  for (const machine of machines) {
    await prisma.machine.upsert({
      where: { serialNumber: machine.serialNumber },
      update: {},
      create: machine
    })
  }
  console.log('✅ Machines created')

  // 9. Create Customers
  console.log('👥 Creating customers...')
  const customers = [
    {
      code: 'CUST-001',
      type: 'GARMENT_FACTORY' as const,
      name: 'ABC Garments Ltd',
      contactPerson: 'John Doe',
      phones: ['+94 11 234 5678', '+94 77 123 4567'],
      emails: ['contact@abcgarments.com', 'john@abcgarments.com'],
      billingAddressLine1: '123 Industrial Road',
      billingCity: 'Colombo',
      billingRegion: 'Western Province',
      billingPostalCode: '00500',
      billingCountry: 'Sri Lanka',
      vatApplicable: true,
      vatRegistrationNumber: 'VAT-123456',
      taxCategory: 'VAT' as const,
      creditLimit: 500000,
      paymentTermsDays: 30,
      alertChannels: ['EMAIL'],
      status: 'ACTIVE' as const
    },
    {
      code: 'CUST-002',
      type: 'GARMENT_FACTORY' as const,
      name: 'XYZ Textiles Pvt Ltd',
      contactPerson: 'Jane Smith',
      phones: ['+94 11 345 6789'],
      emails: ['info@xyztextiles.com'],
      billingAddressLine1: '456 Factory Street',
      billingCity: 'Gampaha',
      billingRegion: 'Western Province',
      billingPostalCode: '11000',
      billingCountry: 'Sri Lanka',
      vatApplicable: true,
      vatRegistrationNumber: 'VAT-789012',
      taxCategory: 'VAT' as const,
      creditLimit: 300000,
      paymentTermsDays: 45,
      alertChannels: ['EMAIL'],
      status: 'ACTIVE' as const
    },
    {
      code: 'CUST-003',
      type: 'INDIVIDUAL' as const,
      name: 'Sarah Williams',
      phones: ['+94 77 987 6543'],
      emails: ['sarah.williams@email.com'],
      billingAddressLine1: '789 Main Street',
      billingCity: 'Kandy',
      billingRegion: 'Central Province',
      billingPostalCode: '20000',
      billingCountry: 'Sri Lanka',
      vatApplicable: false,
      taxCategory: 'NON_VAT' as const,
      creditLimit: 50000,
      paymentTermsDays: 15,
      alertChannels: ['EMAIL'],
      status: 'ACTIVE' as const
    },
    {
      code: 'CUST-004',
      type: 'GARMENT_FACTORY' as const,
      name: 'Modern Stitching Co',
      contactPerson: 'Robert Brown',
      phones: ['+94 11 456 7890'],
      emails: ['admin@modernstitching.com'],
      billingAddressLine1: '321 Business Park',
      billingCity: 'Negombo',
      billingRegion: 'Western Province',
      billingPostalCode: '11500',
      billingCountry: 'Sri Lanka',
      vatApplicable: true,
      vatRegistrationNumber: 'VAT-345678',
      taxCategory: 'VAT' as const,
      creditLimit: 750000,
      paymentTermsDays: 30,
      alertChannels: ['EMAIL'],
      status: 'ACTIVE' as const
    }
  ]

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { code: customer.code },
      update: {},
      create: customer
    })
  }
  console.log('✅ Customers created')

  console.log('\n🎉 Database seeding completed!\n')
  console.log('📋 Login Credentials:')
  console.log('   Email:', email)
  console.log('   Password:', password)
  console.log('\n📊 Seeded Data:')
  console.log('   - 1 Super Admin user')
  console.log('   - 4 Brands (Brother, Singer, Janome, Juki)')
  console.log('   - 4 Machine Types (Domestic, Industrial, Embroidery, Overlock)')
  console.log('   - 4 Models')
  console.log('   - 5 Machines')
  console.log('   - 4 Customers')
  console.log('\n⚠️  Please change the password after first login!\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })