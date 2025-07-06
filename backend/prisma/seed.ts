import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default roles
  const roles = [
    {
      name: 'SUPER_ADMIN',
      description: 'Full system access with all permissions'
    },
    {
      name: 'ADMIN',
      description: 'Administrative access with most permissions'
    },
    {
      name: 'MODERATOR',
      description: 'Content moderation and user management'
    },
    {
      name: 'MEMBER',
      description: 'Regular member with basic access'
    },
    {
      name: 'PREMIUM_MEMBER',
      description: 'Premium member with enhanced features'
    }
  ];

  const createdRoles = await Promise.all(
    roles.map(role =>
      prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role
      })
    )
  );

  console.log(`✅ Created ${createdRoles.length} roles`);

  // Create permissions
  const permissions = [
    // User management
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' },
    
    // Event management
    { resource: 'events', action: 'read' },
    { resource: 'events', action: 'create' },
    { resource: 'events', action: 'update' },
    { resource: 'events', action: 'delete' },
    
    // Message management
    { resource: 'messages', action: 'read' },
    { resource: 'messages', action: 'create' },
    { resource: 'messages', action: 'update' },
    { resource: 'messages', action: 'delete' },
    
    // Announcement management
    { resource: 'announcements', action: 'read' },
    { resource: 'announcements', action: 'create' },
    { resource: 'announcements', action: 'update' },
    { resource: 'announcements', action: 'delete' },
    
    // Resource management
    { resource: 'resources', action: 'read' },
    { resource: 'resources', action: 'create' },
    { resource: 'resources', action: 'update' },
    { resource: 'resources', action: 'delete' },
    
    // Admin access
    { resource: 'admin', action: 'read' },
    { resource: 'admin', action: 'create' },
    { resource: 'admin', action: 'update' },
    { resource: 'admin', action: 'delete' },
    
    // Audit logs
    { resource: 'audit', action: 'read' },
    
    // System management
    { resource: 'system', action: 'read' },
    { resource: 'system', action: 'update' }
  ];

  const createdPermissions = await Promise.all(
    permissions.map(permission =>
      prisma.permission.upsert({
        where: { 
          resource_action: { 
            resource: permission.resource, 
            action: permission.action 
          } 
        },
        update: {},
        create: permission
      })
    )
  );

  console.log(`✅ Created ${createdPermissions.length} permissions`);

  // Assign permissions to roles
  const rolePermissions = [
    // SUPER_ADMIN gets all permissions
    {
      roleName: 'SUPER_ADMIN',
      permissions: createdPermissions.map(p => ({ resource: p.resource, action: p.action }))
    },
    
    // ADMIN gets most permissions except system management
    {
      roleName: 'ADMIN',
      permissions: createdPermissions
        .filter(p => p.resource !== 'system')
        .map(p => ({ resource: p.resource, action: p.action }))
    },
    
    // MODERATOR gets content management permissions
    {
      roleName: 'MODERATOR',
      permissions: [
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'update' },
        { resource: 'events', action: 'read' },
        { resource: 'events', action: 'create' },
        { resource: 'events', action: 'update' },
        { resource: 'messages', action: 'read' },
        { resource: 'announcements', action: 'read' },
        { resource: 'announcements', action: 'create' },
        { resource: 'announcements', action: 'update' },
        { resource: 'resources', action: 'read' },
        { resource: 'resources', action: 'create' },
        { resource: 'resources', action: 'update' }
      ]
    },
    
    // MEMBER gets basic read/create permissions
    {
      roleName: 'MEMBER',
      permissions: [
        { resource: 'events', action: 'read' },
        { resource: 'messages', action: 'read' },
        { resource: 'messages', action: 'create' },
        { resource: 'announcements', action: 'read' },
        { resource: 'resources', action: 'read' }
      ]
    },
    
    // PREMIUM_MEMBER gets enhanced permissions
    {
      roleName: 'PREMIUM_MEMBER',
      permissions: [
        { resource: 'events', action: 'read' },
        { resource: 'events', action: 'create' },
        { resource: 'messages', action: 'read' },
        { resource: 'messages', action: 'create' },
        { resource: 'announcements', action: 'read' },
        { resource: 'resources', action: 'read' },
        { resource: 'resources', action: 'create' }
      ]
    }
  ];

  for (const rolePermission of rolePermissions) {
    const role = createdRoles.find(r => r.name === rolePermission.roleName);
    if (!role) continue;

    for (const perm of rolePermission.permissions) {
      const permission = createdPermissions.find(p => 
        p.resource === perm.resource && p.action === perm.action
      );
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }

  console.log('✅ Assigned permissions to roles');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@namcnorcal.org' },
    update: {},
    create: {
      email: 'admin@namcnorcal.org',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      company: 'NAMC Northern California',
      memberType: 'ADMIN',
      isActive: true,
      isVerified: true,
    },
  });

  // Assign SUPER_ADMIN role to admin user
  const superAdminRole = createdRoles.find(r => r.name === 'SUPER_ADMIN');
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: superAdminRole.id
        }
      },
      update: {},
      create: {
        userId: admin.id,
        roleId: superAdminRole.id
      }
    });
  }

  console.log('✅ Created default admin user');

  // Create sample members
  const memberPassword = await bcrypt.hash('member123', 12);
  const members = await Promise.all([
    prisma.user.upsert({
      where: { email: 'john.doe@example.com' },
      update: {},
      create: {
        email: 'john.doe@example.com',
        password: memberPassword,
        firstName: 'John',
        lastName: 'Doe',
        company: 'Doe Construction',
        phone: '(555) 123-4567',
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        memberType: 'PREMIUM',
        isActive: true,
        isVerified: true,
        bio: 'Experienced construction professional with 15+ years in the industry.',
        website: 'https://doeconstruction.com',
        linkedin: 'https://linkedin.com/in/johndoe',
      },
    }),
    prisma.user.upsert({
      where: { email: 'jane.smith@example.com' },
      update: {},
      create: {
        email: 'jane.smith@example.com',
        password: memberPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        company: 'Smith Contracting',
        phone: '(555) 987-6543',
        address: '456 Oak Ave',
        city: 'Oakland',
        state: 'CA',
        zipCode: '94601',
        memberType: 'REGULAR',
        isActive: true,
        isVerified: true,
        bio: 'Specializing in residential construction and renovation projects.',
        website: 'https://smithcontracting.com',
      },
    }),
  ]);

  // Assign roles to members
  const memberRole = createdRoles.find(r => r.name === 'MEMBER');
  const premiumMemberRole = createdRoles.find(r => r.name === 'PREMIUM_MEMBER');
  
  if (memberRole && premiumMemberRole) {
    // Assign PREMIUM_MEMBER role to John Doe
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: members[0].id,
          roleId: premiumMemberRole.id
        }
      },
      update: {},
      create: {
        userId: members[0].id,
        roleId: premiumMemberRole.id
      }
    });

    // Assign MEMBER role to Jane Smith
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: members[1].id,
          roleId: memberRole.id
        }
      },
      update: {},
      create: {
        userId: members[1].id,
        roleId: memberRole.id
      }
    });
  }

  // Create sample events
  const events = await Promise.all([
    prisma.event.create({
      data: {
        title: 'NAMC NorCal Annual Meeting',
        description: 'Join us for our annual chapter meeting where we will discuss the year ahead and network with fellow members.',
        startDate: new Date('2024-03-15T18:00:00Z'),
        endDate: new Date('2024-03-15T21:00:00Z'),
        location: 'San Francisco Marriott Marquis',
        isVirtual: false,
        maxAttendees: 100,
        createdBy: admin.id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Construction Technology Workshop',
        description: 'Learn about the latest construction technologies and how they can improve your business efficiency.',
        startDate: new Date('2024-04-10T14:00:00Z'),
        endDate: new Date('2024-04-10T17:00:00Z'),
        location: 'Virtual Event',
        isVirtual: true,
        meetingLink: 'https://zoom.us/j/123456789',
        maxAttendees: 50,
        createdBy: admin.id,
      },
    }),
  ]);

  // Create sample announcements
  const announcements = await Promise.all([
    prisma.announcement.create({
      data: {
        title: 'Welcome to NAMC NorCal Member Portal',
        content: 'We are excited to launch our new member portal! This platform will help us stay connected and share resources more effectively.',
        createdBy: admin.id,
      },
    }),
    prisma.announcement.create({
      data: {
        title: 'Upcoming Certification Program',
        content: 'We are offering a new certification program for minority contractors. Applications open next month.',
        createdBy: admin.id,
      },
    }),
  ]);

  // Create sample resources
  const resources = await Promise.all([
    prisma.resource.create({
      data: {
        title: 'NAMC Membership Benefits Guide',
        description: 'Comprehensive guide to all the benefits available to NAMC members.',
        fileUrl: 'https://example.com/benefits-guide.pdf',
        fileType: 'application/pdf',
        fileSize: 2048576,
        category: 'Membership',
        isPublic: true,
        createdBy: admin.id,
      },
    }),
    prisma.resource.create({
      data: {
        title: 'Construction Safety Guidelines',
        description: 'Updated safety guidelines for construction projects.',
        fileUrl: 'https://example.com/safety-guidelines.pdf',
        fileType: 'application/pdf',
        fileSize: 1536000,
        category: 'Safety',
        isPublic: true,
        createdBy: admin.id,
      },
    }),
  ]);

  console.log('✅ Database seeded successfully!');
  console.log(`👥 Created ${members.length + 1} users`);
  console.log(`📅 Created ${events.length} events`);
  console.log(`📢 Created ${announcements.length} announcements`);
  console.log(`📚 Created ${resources.length} resources`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 