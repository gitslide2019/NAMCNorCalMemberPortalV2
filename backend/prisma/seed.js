"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    const adminPassword = await bcryptjs_1.default.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@namcnorcal.org' },
        update: {},
        create: {
            email: 'admin@namcnorcal.org',
            password: adminPassword,
            firstName: 'Admin',
            lastName: 'User',
            company: 'NAMC NorCal',
            memberType: 'LIFETIME',
            isActive: true,
            isVerified: true,
        },
    });
    const memberPassword = await bcryptjs_1.default.hash('member123', 10);
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
//# sourceMappingURL=seed.js.map