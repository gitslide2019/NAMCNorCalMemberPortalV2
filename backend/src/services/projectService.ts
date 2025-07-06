// Comprehensive Project Application Workflow System

import { PrismaClient } from '@prisma/client'
import { auditService } from './auditService'
import { notificationService } from './notificationService'

const prisma = new PrismaClient()

interface ProjectCreateRequest {
  title: string
  description: string
  category: string
  budget?: number
  location?: string
  startDate?: Date
  endDate?: Date
  requirements: string[]
  skills: string[]
  createdBy: string
}

interface ApplicationSubmitRequest {
  projectId: string
  userId: string
  proposal: string
  experience: string
  timeline: string
  budget?: number
}

interface ApplicationReviewRequest {
  applicationId: string
  status: 'ACCEPTED' | 'REJECTED'
  feedback?: string
  reviewedBy: string
}

interface ProjectMatchingCriteria {
  skills: string[]
  location?: string
  budgetRange?: { min: number; max: number }
  availability?: { startDate: Date; endDate: Date }
}

export class ProjectService {
  async createProject(request: ProjectCreateRequest): Promise<any> {
    const {
      title,
      description,
      category,
      budget,
      location,
      startDate,
      endDate,
      requirements,
      skills,
      createdBy
    } = request

    try {
      const project = await prisma.project.create({
        data: {
          title,
          description,
          category: category as any,
          budget,
          location,
          startDate,
          endDate,
          requirements,
          skills,
          createdBy,
          status: 'OPEN'
        }
      })

      await auditService.log({
        userId: createdBy,
        action: 'PROJECT_CREATED',
        resource: 'projects',
        resourceId: project.id,
        newData: { title, category, budget }
      })

      // Notify potential matches
      await this.notifyPotentialMatches(project)

      return project

    } catch (error) {
      console.error('Project creation failed:', error)
      throw new Error('Failed to create project')
    }
  }

  async updateProject(projectId: string, updates: Partial<ProjectCreateRequest>, userId: string): Promise<any> {
    try {
      // Verify ownership or admin privileges
      const existingProject = await prisma.project.findUnique({
        where: { id: projectId }
      })

      if (!existingProject) {
        throw new Error('Project not found')
      }

      if (existingProject.createdBy !== userId) {
        // Check if user is admin (this would require role checking)
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            roles: {
              include: { role: true }
            }
          }
        })

        const isAdmin = user?.roles.some(ur => ur.role.name === 'ADMIN')
        if (!isAdmin) {
          throw new Error('Unauthorized to update this project')
        }
      }

      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      })

      await auditService.log({
        userId,
        action: 'PROJECT_UPDATED',
        resource: 'projects',
        resourceId: projectId,
        oldData: existingProject,
        newData: updates
      })

      // Notify applicants of changes
      await this.notifyApplicantsOfChanges(projectId, updates)

      return updatedProject

    } catch (error) {
      console.error('Project update failed:', error)
      throw error
    }
  }

  async submitApplication(request: ApplicationSubmitRequest): Promise<any> {
    const { projectId, userId, proposal, experience, timeline, budget } = request

    try {
      // Check if project exists and is open
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      })

      if (!project) {
        throw new Error('Project not found')
      }

      if (project.status !== 'OPEN') {
        throw new Error('Project is not accepting applications')
      }

      // Check if user already applied
      const existingApplication = await prisma.projectApplication.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId
          }
        }
      })

      if (existingApplication) {
        throw new Error('You have already applied to this project')
      }

      // Create application
      const application = await prisma.projectApplication.create({
        data: {
          projectId,
          userId,
          proposal,
          experience,
          timeline,
          budget,
          status: 'PENDING'
        }
      })

      await auditService.log({
        userId,
        action: 'APPLICATION_SUBMITTED',
        resource: 'project_applications',
        resourceId: application.id,
        newData: { projectId, budget }
      })

      // Notify project owner
      await notificationService.send({
        userId: project.createdBy,
        type: 'PROJECT_ASSIGNED',
        title: 'New Project Application',
        message: `A new application has been submitted for your project: ${project.title}`,
        channel: 'EMAIL',
        data: {
          projectTitle: project.title,
          applicationId: application.id
        }
      })

      // Send confirmation to applicant
      await notificationService.send({
        userId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Application Submitted',
        message: `Your application for "${project.title}" has been submitted successfully.`,
        channel: 'EMAIL',
        data: {
          projectTitle: project.title,
          applicationId: application.id
        }
      })

      return application

    } catch (error) {
      console.error('Application submission failed:', error)
      throw error
    }
  }

  async reviewApplication(request: ApplicationReviewRequest): Promise<any> {
    const { applicationId, status, feedback, reviewedBy } = request

    try {
      const application = await prisma.projectApplication.findUnique({
        where: { id: applicationId },
        include: {
          project: true,
          user: true
        }
      })

      if (!application) {
        throw new Error('Application not found')
      }

      // Verify reviewer is project owner or admin
      if (application.project.createdBy !== reviewedBy) {
        const user = await prisma.user.findUnique({
          where: { id: reviewedBy },
          include: {
            roles: {
              include: { role: true }
            }
          }
        })

        const isAdmin = user?.roles.some(ur => ur.role.name === 'ADMIN')
        if (!isAdmin) {
          throw new Error('Unauthorized to review this application')
        }
      }

      // Update application
      const updatedApplication = await prisma.projectApplication.update({
        where: { id: applicationId },
        data: {
          status,
          reviewedAt: new Date(),
          reviewedBy
        }
      })

      await auditService.log({
        userId: reviewedBy,
        action: `APPLICATION_${status}`,
        resource: 'project_applications',
        resourceId: applicationId,
        newData: { status, feedback }
      })

      // If accepted, update project status and reject other applications
      if (status === 'ACCEPTED') {
        await prisma.project.update({
          where: { id: application.projectId },
          data: { status: 'IN_PROGRESS' }
        })

        // Reject other pending applications
        await prisma.projectApplication.updateMany({
          where: {
            projectId: application.projectId,
            id: { not: applicationId },
            status: 'PENDING'
          },
          data: { status: 'REJECTED' }
        })

        // Notify accepted applicant
        await notificationService.onProjectAssigned(
          application.userId,
          application.project.title
        )

        // Notify rejected applicants
        const rejectedApplications = await prisma.projectApplication.findMany({
          where: {
            projectId: application.projectId,
            id: { not: applicationId },
            status: 'REJECTED'
          },
          include: { user: true }
        })

        for (const rejectedApp of rejectedApplications) {
          await notificationService.send({
            userId: rejectedApp.userId,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'Application Update',
            message: `Thank you for your application to "${application.project.title}". We have selected another candidate for this project.`,
            channel: 'EMAIL'
          })
        }
      } else {
        // Notify rejected applicant
        await notificationService.send({
          userId: application.userId,
          type: 'SYSTEM_ANNOUNCEMENT',
          title: 'Application Update',
          message: `Your application for "${application.project.title}" has been reviewed.${feedback ? ` Feedback: ${feedback}` : ''}`,
          channel: 'EMAIL',
          data: { feedback }
        })
      }

      return updatedApplication

    } catch (error) {
      console.error('Application review failed:', error)
      throw error
    }
  }

  async getProjectMatches(userId: string, criteria?: ProjectMatchingCriteria): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          city: true,
          state: true,
          // You'd need to add a skills field to user profile
        }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Build matching query
      const where: any = {
        status: 'OPEN'
      }

      if (criteria?.location) {
        where.location = { contains: criteria.location, mode: 'insensitive' }
      }

      if (criteria?.budgetRange) {
        where.budget = {
          gte: criteria.budgetRange.min,
          lte: criteria.budgetRange.max
        }
      }

      if (criteria?.availability) {
        where.AND = [
          {
            startDate: { lte: criteria.availability.endDate }
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: criteria.availability.startDate } }
            ]
          }
        ]
      }

      const projects = await prisma.project.findMany({
        where,
        include: {
          applications: {
            where: { userId },
            select: { id: true, status: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // Calculate match scores
      const projectsWithScores = projects.map(project => {
        let matchScore = 0

        // Skills matching (simplified)
        if (criteria?.skills) {
          const matchingSkills = project.skills.filter(skill =>
            criteria.skills.some(userSkill =>
              userSkill.toLowerCase().includes(skill.toLowerCase())
            )
          )
          matchScore += (matchingSkills.length / project.skills.length) * 40
        }

        // Location matching
        if (user.city && project.location?.includes(user.city)) {
          matchScore += 30
        }

        // Recent projects get higher scores
        const daysOld = (Date.now() - project.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        matchScore += Math.max(0, 30 - daysOld)

        return {
          ...project,
          matchScore: Math.round(matchScore),
          hasApplied: project.applications.length > 0,
          applicationStatus: project.applications[0]?.status
        }
      })

      return projectsWithScores.sort((a, b) => b.matchScore - a.matchScore)

    } catch (error) {
      console.error('Project matching failed:', error)
      throw error
    }
  }

  async getProjectApplications(projectId: string, userId: string): Promise<any> {
    try {
      // Verify project ownership or admin
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      })

      if (!project) {
        throw new Error('Project not found')
      }

      if (project.createdBy !== userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            roles: {
              include: { role: true }
            }
          }
        })

        const isAdmin = user?.roles.some(ur => ur.role.name === 'ADMIN')
        if (!isAdmin) {
          throw new Error('Unauthorized to view applications')
        }
      }

      const applications = await prisma.projectApplication.findMany({
        where: { projectId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              company: true,
              memberType: true
            }
          }
        },
        orderBy: { submittedAt: 'desc' }
      })

      return applications

    } catch (error) {
      console.error('Failed to get project applications:', error)
      throw error
    }
  }

  async getUserApplications(userId: string, options: {
    status?: string
    page?: number
    limit?: number
  } = {}): Promise<any> {
    const { status, page = 1, limit = 20 } = options
    const skip = (page - 1) * limit

    const where: any = { userId }
    if (status) where.status = status

    const [applications, total] = await Promise.all([
      prisma.projectApplication.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              title: true,
              category: true,
              budget: true,
              status: true
            }
          }
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.projectApplication.count({ where })
    ])

    return {
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getProjectAnalytics(userId?: string): Promise<any> {
    const where: any = {}
    if (userId) where.createdBy = userId

    const [
      totalProjects,
      projectsByStatus,
      projectsByCategory,
      applicationStats
    ] = await Promise.all([
      prisma.project.count({ where }),
      
      prisma.project.groupBy({
        by: ['status'],
        where,
        _count: { status: true }
      }),

      prisma.project.groupBy({
        by: ['category'],
        where,
        _count: { category: true }
      }),

      prisma.projectApplication.groupBy({
        by: ['status'],
        _count: { status: true }
      })
    ])

    return {
      totalProjects,
      projectsByStatus: projectsByStatus.map(stat => ({
        status: stat.status,
        count: stat._count.status
      })),
      projectsByCategory: projectsByCategory.map(stat => ({
        category: stat.category,
        count: stat._count.category
      })),
      applicationStats: applicationStats.map(stat => ({
        status: stat.status,
        count: stat._count.status
      }))
    }
  }

  private async notifyPotentialMatches(project: any): Promise<void> {
    // Find users with matching skills or location
    const potentialMatches = await prisma.user.findMany({
      where: {
        OR: [
          { city: project.location },
          // Add skills matching when user skills are implemented
        ],
        isActive: true,
        memberType: { in: ['PREMIUM', 'LIFETIME'] } // Premium feature
      },
      select: { id: true },
      take: 50 // Limit to avoid spam
    })

    for (const user of potentialMatches) {
      await notificationService.send({
        userId: user.id,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'New Project Opportunity',
        message: `A new project matching your profile has been posted: ${project.title}`,
        data: {
          projectId: project.id,
          projectTitle: project.title,
          category: project.category
        }
      })
    }
  }

  private async notifyApplicantsOfChanges(projectId: string, changes: any): Promise<void> {
    const applications = await prisma.projectApplication.findMany({
      where: {
        projectId,
        status: 'PENDING'
      },
      select: { userId: true }
    })

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { title: true }
    })

    for (const application of applications) {
      await notificationService.send({
        userId: application.userId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Project Updated',
        message: `The project "${project?.title}" you applied to has been updated. Please review the changes.`,
        data: {
          projectId,
          changes
        }
      })
    }
  }
}

export const projectService = new ProjectService()